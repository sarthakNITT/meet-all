export async function handleLeaveRoom (socketRef: any, roomId: any, peerIdRef: any, peerRef: any) {
    socketRef.current?.close();
    peerRef.current?.close();
    socketRef.current?.send(JSON.stringify({
     "type": "leave",
     "roomId": `${roomId}`,
     "peerId": `${peerIdRef.current}`
    })) 
}