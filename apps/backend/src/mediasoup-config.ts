import mediasoup, {types as mediasoupTypes} from "mediasoup";

const workerSettings: mediasoupTypes.WorkerSettings = {
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100
};

const routerOptions: mediasoupTypes.RouterOptions = {
    mediaCodecs: [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000
    }
    ]
};

export let worker: mediasoupTypes.Worker;
export let router: mediasoupTypes.Router;

export const createWorker = async () => {
    console.log(`Create worker function is called`);
    worker = await mediasoup.createWorker(workerSettings);
    worker.on('died', () => {
        console.error('MediaSoup worker has died');
    });

    router = await worker.createRouter(routerOptions);
};