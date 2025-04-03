import { useEffect, useRef, useState } from "react";
import { FaMousePointer } from "react-icons/fa";
import dayjs from "dayjs";
import styles from "./VideoPreviewList.module.scss";

interface HVideoCardProps {
    item: { url: string; title: string; time: string };
}

const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL;

// ===================== Video Preview List 컴포넌트 =====================
export const VideoPreviewList: React.FC = () => {
    const [data, setData] = useState<{ url: string; title: string; time: string }[]>([]);

    useEffect(() => {
        generateImageUrl();
    }, []);

    /** 썸네일 이미지 URL 생성 */
    const generateImageUrl = async () => {
        const imagePaths = await getThumbnailPaths();
        const images = await Promise.all(
            imagePaths.map(async (path, index) => {
                const response = await fetch(`${SERVER_API_URL}/api/create/thumbnail/${path}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path }),
                });

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const title: string = `video ${index + 1}`;
                const time = dayjs().format("YYYY-MM-DD HH:mm:ss");

                return { url, title, time };
            })
        );

        setData(images);
    };

    /** 썸네일 이미지 경로 가져오기 */
    const getThumbnailPaths = async (): Promise<{ url: string; time: number }[]> => {
        const response = await fetch(`${SERVER_API_URL}/api/preview/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();
        return data.imagePaths;
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                {data.map((item, index) => (
                    <VideoCard key={index} item={item} />
                ))}
            </div>

            <Description />
        </div>
    );
};

// ===================== Video Card 컴포넌트 =====================
const VideoCard = ({ item }: HVideoCardProps) => {
    // const videoRef = useRef<HTMLVideoElement | null>(null);
    // const plyrRef = useRef<Plyr | null>(null);
    // const hlsRef = useRef<Hls | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const imageInterval = useRef<NodeJS.Timeout | null>(null);

    // useEffect(() => {
    //     if (!isHovered) return;
    //     initPlyr();
    //     initHls();
    // }, [isHovered]);

    // /** Plyr 인스턴스 초기화 */
    // const initPlyr = () => {
    //     if (!videoRef.current || plyrRef.current) return;
    //     plyrRef.current = new Plyr(videoRef.current, {
    //         muted: true,
    //         clickToPlay: false,
    //         controls: ["progress"],
    //         fullscreen: { enabled: false, fallback: false, iosNative: false },
    //     });
    // };

    // /** Hls.js 인스턴스 초기화 */
    // const initHls = () => {
    //     if (!videoRef.current) return;

    //     if (!Hls.isSupported()) {
    //         console.error("Hls.js를 지원하지 않는 브라우저입니다.");
    //         return;
    //     }

    //     hlsRef.current = new Hls();
    //     hlsRef.current.loadSource(`${SERVER_API_URL}/api/hls`);
    //     hlsRef.current.attachMedia(videoRef.current);

    //     hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
    //         if (plyrRef.current) {
    //             plyrRef.current.muted = true;
    //             plyrRef.current.play();
    //         }
    //     });
    // };

    /** 카드 hover 이벤트 핸들러 */
    const handleMouseEnter = () => {
        hoverTimeout.current = setTimeout(async () => {
            setIsHovered(true);
            const duration = 9324.919999999925; // 비디오 길이 (초)
            const imagePaths = await getThumbnailPaths(duration);
            const images = await Promise.all(
                imagePaths.map(async (path) => {
                    const response = await fetch(`${SERVER_API_URL}/api/create/thumbnail/${path}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path }),
                    });

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    return url;
                })
            );

            setImages(images);
        }, 500);
    };

    /** 카드 mouse leave 이벤트 핸들러 */
    const handleMouseLeave = () => {
        if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current);
            hoverTimeout.current = null;
        }
        // if (hlsRef.current) {
        //     hlsRef.current.detachMedia();
        //     hlsRef.current.destroy();
        //     hlsRef.current = null;
        // }

        setIsHovered(false);
        setCurrentImageIndex(0);
    };

    /** 썸네일 이미지 경로 가져오기 */
    const getThumbnailPaths = async (duration: number): Promise<{ url: string; time: number }[]> => {
        const response = await fetch(`${SERVER_API_URL}/api/create/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duration, numFrames: 40 }),
        });

        const data = await response.json();
        return data.imagePaths;
    };

    /** hover 상태일 때 이미지 변경 로직 */
    useEffect(() => {
        if (isHovered && images.length > 0) {
            imageInterval.current = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 800);
        } else if (!isHovered && imageInterval.current) {
            clearInterval(imageInterval.current);
            imageInterval.current = null;
        }

        return () => {
            if (imageInterval.current) {
                clearInterval(imageInterval.current);
                imageInterval.current = null;
            }
        };
    }, [isHovered, images]);

    return (
        <div className={styles.card} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <img src={item.url} className={styles.img} style={{ display: isHovered ? "none" : "block" }} />
            {isHovered && images.length > 0 && (
                <img
                    src={images[currentImageIndex]}
                    className={styles.img}
                    style={{ display: isHovered ? "block" : "none" }}
                />
            )}
            {/* <img src={item.url} className={styles.img} style={{ display: isHovered ? "none" : "block" }} />
            <video ref={videoRef} style={{ display: isHovered ? "block" : "none" }} className={styles.video} /> */}
            {/* 카드 내용 */}
            <div className={styles.cardContent}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.time}>{item.time}</p>
            </div>
        </div>
    );
};

// ===================== Description 컴포넌트 =====================
const Description = () => {
    return (
        <div className={styles.description}>
            <h2 className={styles.title}>사용 방법</h2>
            <ul className={styles.list}>
                <li className={styles.icon}>
                    <FaMousePointer />
                    <span>마우스를 카드 위에 0.5초 동안 올리면 미리보기가 재생됩니다.</span>
                </li>
            </ul>
        </div>
    );
};
