export function handleTurnOffMike (localStreamRef: any, audioEnabled: boolean, setAudioEnabled: (audioEnabled: boolean) => void){
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track: any) => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
}