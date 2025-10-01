"use client";

import { useRef } from "react";
import { getConnectedDevices } from "./utils/helperFunctions/getConnectedDevices";
import { playVideoFromCamera } from "./utils/helperFunctions/playVideoFromCamera";
import { updateCameraList } from "./utils/helperFunctions/updateCameraList";

export default function Home () {
  const socketRef = useRef<WebSocket | null>(null);
  const openMediaDevices = async (constraints: MediaStreamConstraints) => {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  try {
    const stream = openMediaDevices({'video':true,'audio':true});
    console.log('Got MediaStream:', stream);
  } catch(error) {
    console.error('Error accessing media devices.', error);
  }
  
  // Get the initial set of cameras connected
  const videoCameras = getConnectedDevices('videoinput');
  console.log('Cameras found:', videoCameras);
  updateCameraList(videoCameras);

  // Listen for changes to media devices and update the list accordingly
  navigator.mediaDevices.addEventListener('devicechange', event => {
    const newCameraList = getConnectedDevices('video');
    updateCameraList(newCameraList);
  });

  async function handleConnection () {
    const socket = new WebSocket("ws://localhost:8080");
    socketRef.current = socket;
    socketRef.current.onmessage = event => {
      const msg: any = typeof event.data === "string" ? JSON.stringify(event.data) : null;
      if(msg.type === "connection"){
        console.log(msg.socketId);
      }
    }
  }

  return (
    <div>
      <video id="localVideo" autoPlay playsInline controls={false}/>
      <button onClick={playVideoFromCamera}>Play Video from Camera</button>
      <button onClick={handleConnection}>Connect to ws server</button>
    </div>
  )
}