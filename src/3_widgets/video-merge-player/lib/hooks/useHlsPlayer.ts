import { useEffect, useState } from "react";
import Plyr from "plyr";
import Hls from "hls.js";

const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL;

export const useHlsPlayer = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const [player, setPlayer] = useState<Plyr | null>(null);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!videoRef.current) return;

        const player = new Plyr(videoRef.current, {
            autoplay: true,
            muted: true,
            previewThumbnails: {
                enabled: true,
                src: `${SERVER_API_URL}/api/thumbnail/vtt`,
            },
            tooltips: { controls: true },
            keyboard: { global: true },
        });

        setPlayer(player);

        player.on("ready", () => {
            if (!Hls.isSupported()) {
                console.error("Hls.js를 지원하지 않는 브라우저입니다.");
                return;
            }
            if (videoRef.current) {
                const hls = new Hls();
                hls.loadSource(`${SERVER_API_URL}/api/hls`);
                hls.attachMedia(videoRef.current);
                player.play();
            }
        });

        player.on("loadeddata", () => {
            if (videoRef.current) {
                const duration = player.duration;
                setDuration(duration);
            }
        });

        return () => player.destroy();
    }, []);

    return { player, duration };
};
