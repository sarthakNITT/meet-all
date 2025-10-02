export async function playVideoFromCamera() {
    try {
        const constraints = {'video': true, 'audio': true};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.querySelector('video#localVideo');
        if(!videoElement){
          // console.log('videoElement is null');
          return;
        }
        (videoElement as HTMLVideoElement).srcObject = stream;
    } catch(error) {
        console.error('Error opening video camera.', error);
    }
  }