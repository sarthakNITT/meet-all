let checkJoinReq = false;
interface peer {
    peerId: string,
    peerSocket: any
}
const rooms = new Map<string, peer[]>();
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
        message(ws, message: string){
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
                existingPeers.push(newPeer);
                rooms.set(msg.roomId, existingPeers);
                checkJoinReq = true;
                const room = rooms.get(msg.roomId);
                console.log(room);
                const sendMessageTo = room?.filter((e) => e.peerId !== msg.peerId);
                console.log(sendMessageTo);
                sendMessageTo?.forEach((e) => {
                    e.peerSocket.send(JSON.stringify({
                        "type": "joined",
                        "peerId": `${msg.peerId}`,
                        "roomId": `${msg.roomId}`
                    }))
                })
            }else if(msg.type === "create"){
                console.log(msg.roomId);
                console.log(msg.peerId);
                const creatorPeer: peer = {
                    peerId: msg.peerId,
                    peerSocket: ws
                };
                rooms.set(msg.roomId, [creatorPeer]);
                checkJoinReq = true;
                ws.send(JSON.stringify({
                    type: "created",
                    roomId: msg.roomId,
                    peerId: msg.peerId
                }));
            }else if(msg.type === "offer"){
                console.log(msg);
                const room = rooms.get(msg.roomId);
                console.log(room);
                const peer = room?.find((e) => e.peerId === msg.to)
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
                const peer = room?.find((e) => e.peerId === msg.to)
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
                const peer = room?.find((e) => e.peerId === msg.to)
                peer?.peerSocket.send(JSON.stringify({
                    type: "new-ice-candidate",
                    candidate: msg.candidate,
                    from: msg.from,
                    to: msg.to,
                    roomId: msg.roomId
                }))
            }
        }
    }
})