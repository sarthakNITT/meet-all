 
export function handleCreateRoom (socketRef: any, peerIdRef: any) {
    console.log(4);
    let generateId = "";
    const characters = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
    for(let i = 0; i < 8; i++){
      generateId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    socketRef.current?.send(JSON.stringify({
      "type": "create",
      "peerId": `${peerIdRef.current}`,
      "roomId": `${generateId}`
    }))
}