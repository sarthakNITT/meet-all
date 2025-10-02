"use client";

import { useEffect, useRef, useState } from "react";
import { getConnectedDevices } from "./utils/helperFunctions/getConnectedDevices";
import { playVideoFromCamera } from "./utils/helperFunctions/playVideoFromCamera";
import { updateCameraList } from "./utils/helperFunctions/updateCameraList";

export default function Home () {
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [roomId, setRoomId] = useState<string>();
  const [connection, setConnection] = useState<boolean>(false);
  const openMediaDevices = async (constraints: MediaStreamConstraints) => {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  const setupLocalStream = async () => {
    const stream = await playVideoFromCamera();
    if (stream) {
      localStreamRef.current = stream;
    }
    return stream;
  }

  try {
    const stream = openMediaDevices({'video':true,'audio':true});
    // console.log('Got MediaStream:', stream);
  } catch(error) {
    console.error('Error accessing media devices.', error);
  }
  
  // Get the initial set of cameras connected
  const videoCameras = getConnectedDevices('videoinput');
  // console.log('Cameras found:', videoCameras);
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
    setConnection(true);
  }

  function handleJoinRoom () {
    console.log(4);
    console.log(roomId);
    console.log(peerIdRef.current);
    socketRef.current?.send(JSON.stringify({
      "type": "join",
      "roomId": `${roomId}`,
      "peerId": `${peerIdRef.current}`
    }))
  }
  function handleCreateRoom () {
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
  
  async function handleMessages () {
    if(!socketRef.current){
      console.log("socketref.current is null");
      return;
    }
    socketRef.current.onmessage = async (event) => {
      console.log(2);
      const msg = JSON.parse(event.data);
      console.log(msg);
      if(msg.type === "connection"){
        console.log(3);
        console.log(msg.socketId);
        peerIdRef.current = msg.socketId;
        console.log(peerIdRef.current);
      }else if(msg.type === "joined"){
        console.log(5);
        const currentRoomId = msg.roomId; // Use the value directly from message
        setRoomId(currentRoomId);
        const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
        const peerConnection = new RTCPeerConnection(configuration);
        peerRef.current = peerConnection;
        
        // Get local media stream and add tracks to peer connection
        const localStream = await setupLocalStream();
        if (localStream) {
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
        }
        
        // Handle remote video stream
        peerConnection.addEventListener('track', async (event) => {
          const [remoteStream] = event.streams;
          const remoteVideo = document.querySelector('#remoteVideo') as HTMLVideoElement;
          if (remoteVideo && remoteStream) {
            remoteVideo.srcObject = remoteStream;
          }
        });
        
        peerConnection.addEventListener('icecandidate', event => {
          console.log(6);
          if (event.candidate) {
            socketRef.current?.send(JSON.stringify({
              "type": "new-ice-candidate",
              "candidate": event.candidate,
              "from": `${peerIdRef.current}`,
              "to": `${msg.peerId}`,
              "roomId": `${currentRoomId}` // Use the local variable instead of state
            }));
          }
        });
        console.log(7);
        console.log(peerIdRef.current);
        console.log(msg.roomId);
        console.log(currentRoomId); // This will now show the correct value
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socketRef.current?.send(JSON.stringify({
          "type": "offer",
          "offer": offer,
          "from": `${peerIdRef.current}`,
          "to": `${msg.peerId}`,
          "roomId": `${currentRoomId}` // Use the local variable instead of state
        }));
        peerConnection.addEventListener('connectionstatechange', event => {
          if (peerConnection.connectionState === 'connected') {
            console.log("peers connected");
          }
        });
      }else if(msg.type === "created"){
        console.log("created called");
        console.log(msg.roomId);
        console.log(msg.peerId);
        console.log(peerIdRef.current);
        setRoomId(msg.roomId);
      }else if (msg.type === "offer") {
        console.log(8);
        const currentRoomId = msg.roomId; // Use roomId from the message
        if(!peerRef.current){
          console.log(9);
          const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
          peerRef.current = new RTCPeerConnection(configuration);
          
          // Get local media stream and add tracks to peer connection
          const localStream = await setupLocalStream();
          if (localStream) {
            localStream.getTracks().forEach(track => {
              peerRef.current!.addTrack(track, localStream);
            });
          }
          
          // Handle remote video stream
          peerRef.current.addEventListener('track', async (event) => {
            const [remoteStream] = event.streams;
            const remoteVideo = document.querySelector('#remoteVideo') as HTMLVideoElement;
            if (remoteVideo && remoteStream) {
              remoteVideo.srcObject = remoteStream;
            }
          });
          
          peerRef.current.addEventListener('icecandidate', event => {
            console.log(10);
            if (event.candidate) {
              console.log(11);
              socketRef.current?.send(JSON.stringify({
                "type": "new-ice-candidate",
                "candidate": event.candidate,
                "from": `${peerIdRef.current}`,
                "to": `${msg.from}`,
                "roomId": `${currentRoomId}` // Use the local variable
              }));
            }
          });
        }
        console.log(12);
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        console.log(peerIdRef.current);
        console.log(msg.to);
        console.log(currentRoomId); // This will show the correct value
        socketRef.current?.send(JSON.stringify({
          "type": "answer",
          "answer": answer,
          "from": `${peerIdRef.current}`,
          "to": `${msg.from}`,
          "roomId": `${currentRoomId}` // Use the local variable
        }));
      }else if (msg.type === "answer") {
        console.log(13);
        console.log(msg);
        console.log(peerIdRef.current);
        console.log(msg.roomId); // Log the roomId from the message
        if(peerRef.current){
          const remoteDesc = new RTCSessionDescription(msg.answer);
          await peerRef.current.setRemoteDescription(remoteDesc);
        }
      }else if (msg.type === "new-ice-candidate") {
        console.log(14);
        console.log(msg);
        console.log(peerIdRef.current);        
        console.log(msg.roomId); // Log the roomId from the message
        try {
          if(peerRef.current && msg.candidate){
            console.log(15);
            await peerRef.current.addIceCandidate(msg.candidate);
          }
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    }
  }
  useEffect(()=>{
    if(connection){
      handleMessages();
    }
  },[connection])

  // Auto-start local video when component mounts
  useEffect(() => {
    setupLocalStream();
  }, [])

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
        <button onClick={handleConnection}>Connect to ws server</button>
        <input placeholder="Enter room id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <button onClick={handleJoinRoom}>Join room</button>
        <button onClick={handleCreateRoom}>Create room</button>
      </div>
    </div>
  )
}