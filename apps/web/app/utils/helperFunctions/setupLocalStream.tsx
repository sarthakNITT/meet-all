import { playVideoFromCamera } from "./playVideoFromCamera";

export const setupLocalStream = async (localStreamRef: any) => {
    const stream = await playVideoFromCamera();
    if (stream) {
      localStreamRef.current = stream;
    }
    return stream;
}