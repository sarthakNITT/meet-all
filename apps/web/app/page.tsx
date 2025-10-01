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
    console.log(1);
    const socket = new WebSocket("ws://localhost:8080");
    socketRef.current = socket;
    socketRef.current.onmessage = async (event) => {
      console.log(2);
      const msg = JSON.parse(event.data);
      console.log(msg);
      if(msg.type === "connection"){
        console.log(3);
        console.log(msg.socketId);
      }else if(msg.type === "joined"){
        console.log(4);
        const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
        const peerConnection = new RTCPeerConnection(configuration);
        socketRef.current?.addEventListener('message', async (message: any) => {
          console.log(5);
          if (message.answer) {
            console.log(6);
            const remoteDesc = new RTCSessionDescription(message.answer);
            await peerConnection.setRemoteDescription(remoteDesc);
          }else if (message.offer) {
            console.log(7);
            peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socketRef.current?.send(JSON.stringify({
              'answer': answer
            }));
          }else if (message.iceCandidate) {
            console.log(8);
            try {
              await peerConnection.addIceCandidate(message.iceCandidate);
            } catch (e) {
              console.error('Error adding received ice candidate', e);
            }
          }
        });
        peerConnection.addEventListener('icecandidate', event => {
          console.log(9);
          if (event.candidate) {
            console.log(10);
            socketRef.current?.send(JSON.stringify({
              'new-ice-candidate': event.candidate
            }));
          }
        });
        console.log(10);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketRef.current?.send(JSON.stringify({
          "offer": offer 
        }));
        console.log(11);
        peerConnection.addEventListener('connectionstatechange', event => {
          console.log(12);
          if (peerConnection.connectionState === 'connected') {
            console.log(13);
            console.log("peers connected");
          }
      });
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