import { create } from 'zustand'

interface MeetAllStore {
  roomId: string | undefined;
  connection: boolean;
  videoEnabled:  boolean;
  audioEnabled:  boolean;
  setRoomId: (roomId: string | undefined) => void;
  setConnection: (connection: boolean) => void;
  setVideoEnabled: (videoEnabled: boolean) => void;
  setAudioEnabled: (videoEnabled: boolean) => void;
}

export const useMeetAll = create<MeetAllStore>((set) => ({
  roomId: undefined,
  connection: false,
  videoEnabled: true,
  audioEnabled: true,
  setRoomId: (roomId) => set({ roomId }),
  setConnection: (connection) => set({ connection }),
  setVideoEnabled: (videoEnabled) => set({ videoEnabled }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
}))
