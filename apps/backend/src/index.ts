//https://www.videosdk.live/developer-hub/media-server/mediasoup-webrtc
import express from "express";
import { createWorker } from "./mediasoup-config"
import JoinRoom from "./helperFunctions/joinRoom";

const app = express();
app.use(express.json());
await createWorker();
interface PeerI {
    peerId: string,
    peerSocket: any
}
const rooms = new Map<string, PeerI[]>();

Bun.serve({
    port: 8080,
    fetch(req, server) {
		if (server.upgrade(req)) {
			return;
		}
		return new Response('Upgrade failed', {status: 500});
	},
    websocket: {
        open(ws) {
            
        },
        async message(ws, message: string) {
            const msg = JSON.parse(message);
            console.log(`Message from client recieved: ${msg}`);
            switch (msg.type) {
                case "join":
                    const peers = rooms.get(msg.roomId) || [];
                    peers.push({ peerId: msg.peerId, peerSocket: ws });
                    rooms.set(msg.roomId, peers);
                    const roomId = msg.roomId;
                    roomId.forEach((peer: any) => {
                        peer.peerSocket.send(JSON.stringify({
                            type: "room-joined",
                            peerId: `${peer.peerId}`,
                            roomId: `${peer.roomId}`
                        }));
                    });
                    const transport = await JoinRoom();
                    ws.send(JSON.stringify({
                        type: "transport-created",
                        transportOptions: transport
                    }));
                case "leave":
            }
        }
    }
})

app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
})