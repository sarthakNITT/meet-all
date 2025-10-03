export function handleTurnOffVideo (localStreamRef: any, videoEnabled: boolean, setVideoEnabled: (videoEnabled: boolean) => void){
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track: any) => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
}