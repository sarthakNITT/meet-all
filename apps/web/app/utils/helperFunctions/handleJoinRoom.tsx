export function handleJoinRoom (socketRef: any, roomId: any, peerIdRef: any) {
    console.log(4);
    console.log(roomId);
    console.log(peerIdRef.current);
    socketRef.current?.send(JSON.stringify({
      "type": "join",
      "roomId": `${roomId}`,
      "peerId": `${peerIdRef.current}`
    }))
  }