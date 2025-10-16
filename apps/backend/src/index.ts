import { mediaCodecs, worker } from "./mediasoup";
import { types as mediasoupTypes } from "mediasoup";

interface peer {
  peerId: string,
  peerSocket: any,
  sendTransport?: mediasoupTypes.WebRtcTransport;
  recvTransport?: mediasoupTypes.WebRtcTransport;
  producers?: mediasoupTypes.Producer[];
  consumers?: mediasoupTypes.Consumer[];
}
type roomMap = {
  router?: mediasoupTypes.Router, 
  peer: peer[]
}

let checkJoinReq = false;
const rooms = new Map<string, roomMap>();

Bun.serve({
    port: 8080,
    fetch(req, server) {
        if (server.upgrade(req)) {
            return; // do not return a Response
        }
          return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        open(ws){
            let socketId: string = "";
            let ch = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890!@#$%^&*()";
            for(let i=0;i<8;i++){
                socketId += ch.charAt(Math.floor(Math.random() * ch.length));
            }
            const sendMessage = JSON.stringify({
                "type": "connection",
                "value": "successfull",
                "socketId": `${socketId}`
            })
            console.log(`sending message: ${socketId}`);
            ws.send(sendMessage);
            setTimeout(() => {
                if(!checkJoinReq){
                    ws.close();
                    return;
                }
            }, 10000);
        },
        close(ws){
            for(const [roomId, peers] of rooms.entries()){
                const originalLength = peers.peer.length;
                const updatedPeers = peers.peer.filter((peer) => peer.peerSocket !== ws);
                
                if(updatedPeers.length !== originalLength){
                    const removedPeer = peers.peer.find((peer) => peer.peerSocket === ws);
                    if (removedPeer) {
                      removedPeer.producers?.forEach(p => p.close());
                      removedPeer.consumers?.forEach(c => c.close());
                    }                
                    if(updatedPeers.length === 0){
                      rooms.delete(roomId);
                    } else {
                        rooms.set(roomId, {
                          router: peers.router,
                          peer: updatedPeers
                        });
                        
                        if(removedPeer){
                            updatedPeers.forEach((peer) => {
                                peer.peerSocket.send(JSON.stringify({
                                    type: "peer-left",
                                    peerId: removedPeer.peerId,
                                    roomId: roomId
                                }));
                            });
                        }
                    }
                    break;
                }
            }
        },
        async message(ws, message: string){
            const msg = JSON.parse(message)
            if(msg.type === "join"){
                console.log(1);
                console.log(msg.roomId);
                console.log(msg.peerId);
                const newPeer = {
                  peerId: msg.peerId,
                  peerSocket: ws
                }
                const existingPeers = rooms.get(msg.roomId);
                if(!existingPeers){
                  console.log("room doesn't exists");
                  return;
                }
                existingPeers.peer.push(newPeer);
                rooms.set(msg.roomId, existingPeers);
                checkJoinReq = true;
                const room = rooms.get(msg.roomId);
                console.log(room);
                const sendMessageTo = room?.peer.filter((e) => e.peerId !== msg.peerId);
                console.log(sendMessageTo);
                sendMessageTo?.forEach((e) => {
                    e.peerSocket.send(JSON.stringify({
                        "type": "joined",
                        "peerId": `${msg.peerId}`,
                        "roomId": `${msg.roomId}`,
                    }))
                })
            }else if(msg.type === "create"){
                console.log(msg.roomId);
                console.log(msg.peerId);
                const creatorPeer: peer = {
                  peerId: msg.peerId,
                  peerSocket: ws
                };
                checkJoinReq = true;
                const router = await worker.createRouter({ mediaCodecs: mediaCodecs });
                rooms.set(msg.roomId, {
                  router,
                  peer: [creatorPeer]
                });
                ws.send(JSON.stringify({
                    type: "created",
                    roomId: msg.roomId,
                    peerId: msg.peerId
                }));
            }else if(msg.type === "offer"){
                console.log(msg);
                const room = rooms.get(msg.roomId);
                console.log(room);
                const peer = room?.peer.find((e) => e.peerId === msg.to)
                console.log(peer?.peerId);
                console.log(msg.to);
                peer?.peerSocket.send(JSON.stringify({
                    type: "offer",
                    offer: msg.offer,
                    from: msg.from,
                    to: msg.to,
                    roomId: msg.roomId
                }))
            }else if(msg.type === "answer"){
                console.log(msg);
                const room = rooms.get(msg.roomId);
                const peer = room?.peer.find((e) => e.peerId === msg.to)
                peer?.peerSocket.send(JSON.stringify({
                    type: "answer",
                    answer: msg.answer,
                    from: msg.from,
                    to: msg.to,
                    roomId: msg.roomId
                }))
            }else if(msg.type === "new-ice-candidate"){
                console.log(msg);
                const room = rooms.get(msg.roomId);
                const peer = room?.peer.find((e) => e.peerId === msg.to)
                peer?.peerSocket.send(JSON.stringify({
                    type: "new-ice-candidate",
                    candidate: msg.candidate,
                    from: msg.from,
                    to: msg.to,
                    roomId: msg.roomId
                }))
            }else if(msg.type === "leave"){
                const room = rooms.get(msg.roomId);
                if(room){
                    const updatedRoom = room.peer.filter((e) => e.peerId !== msg.peerId);
                    const leavingPeer = room.peer.find(e => e.peerId === msg.peerId);
                    leavingPeer?.producers?.forEach(p => p.close());
                    leavingPeer?.consumers?.forEach(c => c.close());
                    if(updatedRoom.length === 0){
                        rooms.delete(msg.roomId);
                    } else {
                        rooms.set(msg.roomId, {
                          router: room.router,
                          peer: updatedRoom
                        });
                        
                        updatedRoom.forEach((peer) => {
                            peer.peerSocket.send(JSON.stringify({
                                type: "peer-left",
                                peerId: msg.peerId,
                                roomId: msg.roomId
                            }));
                        });
                    }
                    
                    ws.close();
                }
            }else if(msg.type === "getRouterRtpCapabilities"){
              const getRoom = rooms.get(msg.roomId);
              const router = getRoom?.router;
              if (!router) {
                console.log("Router not found for room:", msg.roomId);
                return;
              }
              ws.send(JSON.stringify({
                type: "send-rtpCapabilities",
                rtpCapabilities: router.rtpCapabilities,
                peerId: msg.peerId,
                roomId: msg.roomId
              }));
            }else if(msg.type === "createTransport"){
              const getRoom = rooms.get(msg.roomId);
              const router = getRoom?.router;
              if(!router){
                console.log("router is undefined");
                return;
              }
              const transport = await router.createWebRtcTransport({
                listenIps: [
                  { ip: "0.0.0.0", announcedIp: "88.12.10.41" }
                ],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
              });
              const peer = getRoom?.peer.find((e) => e.peerId === msg.peerId);
              if(peer){
                peer.sendTransport = transport;
              }
              ws.send(JSON.stringify({
                type: "send-transport",
                transport: {
                  id: transport.id,
                  iceParameters: transport.iceParameters,
                  iceCandidates: transport.iceCandidates,
                  dtlsParameters: transport.dtlsParameters
                },
                peerId: msg.peerId,
                roomId: msg.roomId
              }));
            }else if(msg.type === "recvTransport"){
              const getRoom = rooms.get(msg.roomId);
              const peer = getRoom?.peer.find((e) => e.peerId === msg.peerId);
              const router = getRoom?.router;
              if(!router){
                console.log("router is undefined");
                return;
              }
              const transport = await router.createWebRtcTransport({
                listenIps: [
                  { ip: "0.0.0.0", announcedIp: "88.12.10.41" }
                ],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
              });
              if(peer){
                peer.recvTransport = transport;
              }
              ws.send(JSON.stringify({
                type: "receive-transport",
                transport: {
                  id: transport.id,
                  iceParameters: transport.iceParameters,
                  iceCandidates: transport.iceCandidates,
                  dtlsParameters: transport.dtlsParameters
                },
                peerId: msg.peerId,
                roomId: msg.roomId
              }));
            }else if(msg.type === "connectTransport"){
              const getRoom = rooms.get(msg.roomId);
              const peer = getRoom?.peer.find((e) => e.peerId === msg.peerId);
              const transport = peer?.sendTransport;
              try {
                await transport?.connect({ dtlsParameters: msg.dtlsParameters });
                ws.send(JSON.stringify({
                  type: "transport-connect-successfull",
                  roomId: msg.roomId,
                  peerId: msg.peerId
                }));
              } catch (err) {
                console.error("DTLS connect error:", err);
              }
            }else if(msg.type === "connectRecvTransport"){
              const getRoom = rooms.get(msg.roomId);
              const peer = getRoom?.peer.find((e) => e.peerId === msg.peerId);
              const transport = peer?.recvTransport;
              try {
                await transport?.connect({ dtlsParameters: msg.dtlsParameters });
                ws.send(JSON.stringify({
                  type: "recv-transport-connect-successfull",
                  roomId: msg.roomId,
                  peerId: msg.peerId
                }));
              } catch (err) {
                console.error("DTLS connect error:", err);
              }
            }else if(msg.type === "produce"){
              const getRoom = rooms.get(msg.roomId);
              const peer = getRoom?.peer.find((e) => e.peerId === msg.peerId);
              const transport = peer?.sendTransport;
              if(!transport){
                console.log("transport is undefined");
                return;
              }
              const producer = await transport.produce({
                kind: msg.kind,
                rtpParameters: msg.rtpParameters,
                appData: { peerId: msg.peerId }
              });
              if(peer){
                peer.producers = peer.producers || [];
                peer.producers.push(producer);
              }
              
              // Send producer ID back to client
              ws.send(JSON.stringify({
                type: "producer-created",
                producerId: producer.id,
                kind: producer.kind,
                roomId: msg.roomId,
                peerId: msg.peerId
              }));
            }else if(msg.type === "consume"){
              const getRoom = rooms.get(msg.roomId);
              const peer = getRoom?.peer.find((e) => e.peerId === msg.peerId);
              if (!peer){
                console.log("peer is undefined");
                return;
              }
              const otherPeers = getRoom?.peer.filter((e) => e.peerId !== msg.peerId);
              const producers = otherPeers?.flatMap(p => p.producers ?? []);
              const router = getRoom?.router;
              const transport = peer?.recvTransport;
              if(!producers || !router || !transport){
                console.log("Missing required components for consume");
                return;
              }
              for (const producer of producers) {
                if (router.canConsume({ producerId: producer.id, rtpCapabilities: msg.rtpCapabilities })) {
                  const consumer = await transport.consume({
                    producerId: producer.id,
                    rtpCapabilities: msg.rtpCapabilities,
                    paused: false, // Don't pause, let client handle
                    appData: { peerId: peer.peerId, producerPeerId: producer.appData.peerId }
                  });
                  peer.consumers = peer.consumers || [];
                  peer.consumers.push(consumer);
                  ws.send(JSON.stringify({
                    type: 'consumer-created',
                    consumer: {
                      id: consumer.id,
                      producerId: consumer.producerId,
                      kind: consumer.kind,
                      rtpParameters: consumer.rtpParameters,
                      appData: consumer.appData
                    },
                    roomId: msg.roomId,
                    peerId: msg.peerId
                  }));
                }
              }              
            }
        }
    }
})