"use client";

import { useEffect, useRef } from "react";
import { getConnectedDevices } from "./utils/helperFunctions/getConnectedDevices";
import { playVideoFromCamera } from "./utils/helperFunctions/playVideoFromCamera";
import { updateCameraList } from "./utils/helperFunctions/updateCameraList";
import { useMeetAll } from "./store/store";
import { handleTurnOffMike } from "./utils/helperFunctions/handleTurnOffMike";
import { handleTurnOffVideo } from "./utils/helperFunctions/handleTurnOffVideo";
import { handleCreateRoom } from "./utils/helperFunctions/handleCreateRoom";
import { handleLeaveRoom } from "./utils/helperFunctions/handleLeaveRoom";
import { handleJoinRoom } from "./utils/helperFunctions/handleJoinRoom";
import { handleConnection } from "./utils/helperFunctions/handleConnection";
import { setupLocalStream } from "./utils/helperFunctions/setupLocalStream";
import { openMediaDevices } from "./utils/helperFunctions/openMediaDevices";
import * as mediasoupClient from "mediasoup-client";

export default function Home () {
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const {
    roomId,
    connection,
    videoEnabled,
    audioEnabled,
    setRoomId,
    setConnection,
    setVideoEnabled,
    setAudioEnabled
  } = useMeetAll();

  

  return (
    <div>
      <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
        <div>
          <h3>Local Video</h3>
          <video id="localVideo" autoPlay playsInline controls={false} style={{width: '300px', height: '200px', border: '1px solid #ccc'}}/>
        </div>
        <div>
          <h3>Remote Video</h3>
          <video id="remoteVideo" autoPlay playsInline controls={false} style={{width: '300px', height: '200px', border: '1px solid #ccc'}}/>
        </div>
      </div>
      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        <button onClick={playVideoFromCamera}>Play Video from Camera</button>
        <button onClick={()=>handleConnection(socketRef, setConnection)}>Connect to ws server</button>
        <input placeholder="Enter room id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <button onClick={()=>handleJoinRoom(socketRef, roomId, peerIdRef)}>Join room</button>
        <button onClick={()=>handleCreateRoom(socketRef, peerIdRef)}>Create room</button>
        <button onClick={()=>handleLeaveRoom(socketRef, roomId, peerIdRef, peerRef)}>Leave room</button>
        <button onClick={()=>handleTurnOffVideo(localStreamRef, videoEnabled, setVideoEnabled)}>{videoEnabled ? 'Turn off video' : 'Turn on video'}</button>
        <button onClick={()=>handleTurnOffMike(localStreamRef, audioEnabled, setAudioEnabled)}>{audioEnabled ? 'Turn off mike' : 'Turn on mike'}</button>
      </div>
    </div>
  )
}