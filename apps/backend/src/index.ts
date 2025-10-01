let checkJoinReq = false;

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
            ws.send(sendMessage);
            setTimeout(() => {
                if(!checkJoinReq){
                    ws.close();
                    return;
                }
            }, 10000);
        },
        message(ws, message: Buffer<ArrayBufferLike> | string){
            const msg = typeof message === "string" ? JSON.parse(message) : null;
            if(msg.type === "join"){

            }else if(msg.type === "create"){
                
            }
        }
    }
})