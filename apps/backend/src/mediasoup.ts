import mediasoup, { types as mediasoupTypes } from "mediasoup"

export type AppData = {
  [key: string]: unknown;
};

let rtpParameters: mediasoupTypes.RtpParameters;

export const worker: mediasoupTypes.Worker = await mediasoup.createWorker<{ foo: number }>({
  logLevel            : "warn",
  dtlsCertificateFile : "/home/foo/dtls-cert.pem",
  dtlsPrivateKeyFile  : "/home/foo/dtls-key.pem",
  appData             : { foo: 123 }
});

const rtpCapabilities: mediasoupTypes.RouterRtpCapabilities = mediasoup.getSupportedRtpCapabilities();

export const mediaCodecs: mediasoupTypes.RouterRtpCodecCapability[] =
[
  {
    kind        : "audio",
    mimeType    : "audio/opus",
    clockRate   : 48000,
    channels    : 2
  },
  {
    kind       : "video",
    mimeType   : "video/H264",
    clockRate  : 90000,
    parameters :
    {
      "packetization-mode"      : 1,
      "profile-level-id"        : "42e01f",
      "level-asymmetry-allowed" : 1
    }
  }
];