"use client";

import { getConnectedDevices } from "./utils/helperFunctions/getConnectedDevices";
import { playVideoFromCamera } from "./utils/helperFunctions/playVideoFromCamera";
import { updateCameraList } from "./utils/helperFunctions/updateCameraList";

export default function Home () {
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

  return (
    <div>
      <video id="localVideo" autoPlay playsInline controls={false}/>
      <button onClick={playVideoFromCamera}>Play Video from Camera</button>
    </div>
  )
}