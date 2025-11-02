import { types as mediasoupTypes } from "mediasoup";
import { router } from "../mediasoup-config";

const createWebRtcTransport = async (router: mediasoupTypes.Router) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: 'YOUR_SERVER_IP' }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    return transport;
  };

export default async function JoinRoom() {
    const transport = await createWebRtcTransport(router);
    return transport;
}