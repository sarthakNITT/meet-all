export async function handleConnection (socketRef: any, setConnection: any) {
    console.log(1);
    const socket = new WebSocket("ws://localhost:8080");
    socketRef.current = socket;
    setConnection(true);
}