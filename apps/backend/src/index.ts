import { mediaCodecs, worker } from "./mediasoup";
import { types as mediasoupTypes } from "mediasoup";

interface peer {
  peerId: string,
  peerSocket: any
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
                    
                    if(updatedPeers.length === 0){
                        rooms.delete(roomId);
                    } else {
                        rooms.set(roomId, {
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
                const router = await worker.createRouter({ mediaCodecs: mediaCodecs });
                const transport = await router.createPlainTransport({
                    listenInfo : { protocol: "udp", ip: "a1:22:aA::08" },
                    rtcpMux    : true,
                    comedia    : true
                });
                const producer = await transport.produce({
                    kind          : "video",
                    rtpParameters : {
                        mid    : "1",
                        codecs : [
                          {
                            mimeType    : "video/VP8",
                            payloadType : 101,
                            clockRate   : 90000,
                            rtcpFeedback :
                            [
                              { type: "nack" },
                              { type: "nack", parameter: "pli" },
                              { type: "ccm", parameter: "fir" },
                              { type: "goog-remb" }
                            ]
                          },
                          {
                            mimeType    : "video/rtx",
                            payloadType : 102,
                            clockRate   : 90000,
                            parameters  : { apt: 101 }
                          }
                        ],
                        headerExtensions : [
                          {
                            id  : 2, 
                            uri : "urn:ietf:params:rtp-hdrext:sdes:mid"
                          },
                          { 
                            id  : 3, 
                            uri : "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id"
                          },
                          { 
                            id  : 5, 
                            uri: "urn:3gpp:video-orientation" 
                          },
                          { 
                            id  : 6, 
                            uri : "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
                          }
                        ],
                        encodings : [
                          { rid: "r0", maxBitrate: 100000 },
                          { rid: "r1", maxBitrate: 300000 },
                          { rid: "r2", maxBitrate: 900000 }
                        ],
                        rtcp : {
                          cname : "Zjhd656aqfoo"
                        }
                    }
                });
                const check = await router.canConsume({producerId: producer.id, rtpCapabilities: router.rtpCapabilities});
                if(!check){
                    console.log("check failed");
                    return;
                }
                const consumer = await transport.consume({
                        producerId      : "a7a955cf-fe67-4327-bd98-bbd85d7e2ba3",
                        rtpCapabilities : {
                        codecs : [
                          {
                            mimeType             : "audio/opus",
                            kind                 : "audio",
                            clockRate            : 48000,
                            preferredPayloadType : 100,
                            channels             : 2
                          },
                          {
                            mimeType             : "video/H264",
                            kind                 : "video",
                            clockRate            : 90000,
                            preferredPayloadType : 101,
                            rtcpFeedback         :
                            [
                              { type: "nack" },
                              { type: "nack", parameter: "pli" },
                              { type: "ccm", parameter: "fir" },
                              { type: "goog-remb" }
                            ],
                            parameters :
                            {
                              "level-asymmetry-allowed" : 1,
                              "packetization-mode"      : 1,
                              "profile-level-id"        : "4d0032"
                            }
                          },
                          {
                            mimeType             : "video/rtx",
                            kind                 : "video",
                            clockRate            : 90000,
                            preferredPayloadType : 102,
                            rtcpFeedback         : [],
                            parameters           :
                            {
                              apt : 101
                            }
                          }
                        ],
                        headerExtensions : [
                          {
                            kind             : "video",
                            uri              : "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time", // eslint-disable-line max-len
                            preferredId      : 4,
                            preferredEncrypt : false
                          },
                          {
                            kind             : "audio",
                            uri              : "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
                            preferredId      : 8,
                            preferredEncrypt : false
                          },
                          {
                            kind             : "video",
                            uri              : "urn:3gpp:video-orientation",
                            preferredId      : 9,
                            preferredEncrypt : false
                          },
                          {
                            kind             : "video",
                            uri              : "urn:ietf:params:rtp-hdrext:toffset",
                            preferredId      : 10,
                            preferredEncrypt : false
                          }
                        ]
                    }
                });
                const room = rooms.get(msg.roomId);
                console.log(room);
                const sendMessageTo = room?.peer.filter((e) => e.peerId !== msg.peerId);
                console.log(sendMessageTo);
                sendMessageTo?.forEach((e) => {
                    e.peerSocket.send(JSON.stringify({
                        "type": "joined",
                        "peerId": `${msg.peerId}`,
                        "peerTransport": `${transport}`,
                        "roomId": `${msg.roomId}`,
                        "roomRouterRtpCapabilities": `${router.rtpCapabilities}`,
                        "producer": `${producer}`
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
                const transport = await router.createPlainTransport({
                    listenInfo : { protocol: "udp", ip: "a1:22:aA::08" },
                    rtcpMux    : true,
                    comedia    : true
                });
                const producer = await transport.produce({
                    kind          : "video",
                    rtpParameters : {
                        mid    : "1",
                        codecs : [
                          {
                            mimeType    : "video/VP8",
                            payloadType : 101,
                            clockRate   : 90000,
                            rtcpFeedback :
                            [
                              { type: "nack" },
                              { type: "nack", parameter: "pli" },
                              { type: "ccm", parameter: "fir" },
                              { type: "goog-remb" }
                            ]
                          },
                          {
                            mimeType    : "video/rtx",
                            payloadType : 102,
                            clockRate   : 90000,
                            parameters  : { apt: 101 }
                          }
                        ],
                        headerExtensions : [
                          {
                            id  : 2, 
                            uri : "urn:ietf:params:rtp-hdrext:sdes:mid"
                          },
                          { 
                            id  : 3, 
                            uri : "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id"
                          },
                          { 
                            id  : 5, 
                            uri: "urn:3gpp:video-orientation" 
                          },
                          { 
                            id  : 6, 
                            uri : "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
                          }
                        ],
                        encodings : [
                          { rid: "r0", maxBitrate: 100000 },
                          { rid: "r1", maxBitrate: 300000 },
                          { rid: "r2", maxBitrate: 900000 }
                        ],
                        rtcp : {
                          cname : "Zjhd656aqfoo"
                        }
                    }
                });
                const check = await router.canConsume({producerId: producer.id, rtpCapabilities: router.rtpCapabilities});
                if(!check){
                    console.log("check failed");
                    return;
                }
                const consumer = await transport.consume({
                    producerId      : "a7a955cf-fe67-4327-bd98-bbd85d7e2ba3",
                    rtpCapabilities : {
                    codecs : [
                      {
                        mimeType             : "audio/opus",
                        kind                 : "audio",
                        clockRate            : 48000,
                        preferredPayloadType : 100,
                        channels             : 2
                      },
                      {
                        mimeType             : "video/H264",
                        kind                 : "video",
                        clockRate            : 90000,
                        preferredPayloadType : 101,
                        rtcpFeedback         :
                        [
                          { type: "nack" },
                          { type: "nack", parameter: "pli" },
                          { type: "ccm", parameter: "fir" },
                          { type: "goog-remb" }
                        ],
                        parameters :
                        {
                          "level-asymmetry-allowed" : 1,
                          "packetization-mode"      : 1,
                          "profile-level-id"        : "4d0032"
                        }
                      },
                      {
                        mimeType             : "video/rtx",
                        kind                 : "video",
                        clockRate            : 90000,
                        preferredPayloadType : 102,
                        rtcpFeedback         : [],
                        parameters           :
                        {
                          apt : 101
                        }
                      }
                    ],
                    headerExtensions : [
                      {
                        kind             : "video",
                        uri              : "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time", // eslint-disable-line max-len
                        preferredId      : 4,
                        preferredEncrypt : false
                      },
                      {
                        kind             : "audio",
                        uri              : "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
                        preferredId      : 8,
                        preferredEncrypt : false
                      },
                      {
                        kind             : "video",
                        uri              : "urn:3gpp:video-orientation",
                        preferredId      : 9,
                        preferredEncrypt : false
                      },
                      {
                        kind             : "video",
                        uri              : "urn:ietf:params:rtp-hdrext:toffset",
                        preferredId      : 10,
                        preferredEncrypt : false
                      }
                    ]
                }
            });
                ws.send(JSON.stringify({
                    type: "created",
                    roomId: msg.roomId,
                    peerId: msg.peerId,
                    peerTransport: transport,
                    roomRouterRtpCapabilities: router.rtpCapabilities,
                    producer: producer
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
                    
                    if(updatedRoom.length === 0){
                        rooms.delete(msg.roomId);
                    } else {
                        rooms.set(msg.roomId, {
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
            }
        }
    }
})