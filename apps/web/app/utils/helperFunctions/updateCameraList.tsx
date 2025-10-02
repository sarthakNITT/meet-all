'use client';

export function updateCameraList(cameras: any) {
    const listElement: any = document.querySelector('#availableCameras');
    if(!listElement){
      // console.log('listElement is null');
      return;
    }
    listElement.innerHTML = '';
    cameras.map((camera: MediaDeviceInfo) => {
      const cameraOption = document.createElement('option');
      cameraOption.label = camera.label;
      cameraOption.value = camera.deviceId;
    }).forEach((cameraOption: HTMLElement) => {
      if(!listElement){
        // console.log('listElement is null');
        return;
      }
      listElement.add(cameraOption)
    });
  }