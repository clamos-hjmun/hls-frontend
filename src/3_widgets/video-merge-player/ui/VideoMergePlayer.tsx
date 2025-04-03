import { Fragment, useEffect, useRef, useState } from "react";
import { useHlsPlayer } from "../lib";
import { MdVideocamOff } from "react-icons/md";
import { ThumbnailTimeline } from "./ThumbnailTimeline";
import { FaMouse, FaTrash, FaArrowsAltH, FaVideo, FaMapPin } from "react-icons/fa";
import { TfiLayoutSidebar2 } from "react-icons/tfi";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Plyr from "plyr";
import Hls from "hls.js";
import styles from "./VideoMergePlayer.module.scss";
import "plyr/dist/plyr.css";

const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL;

// ===================== Video Merge Player 컴포넌트 =====================
export const VideoMergePlayer = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const mergedVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isMerging, setIsMerging] = useState<boolean>(false);
    const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
    const [ranges, setRanges] = useState<{ id: string; start: number; end: number }[]>([]);
    const { player, duration } = useHlsPlayer(videoRef);

    useEffect(() => {
        if (selectedRangeId && videoRef.current) {
            const selectionRange = ranges.find((range) => range.id === selectedRangeId);

            if (!selectionRange || !player) return;

            /** 선택 범위 범위이 지나면 비디오 자동 중지 */
            const onTimeUpdate = () => {
                if (player.currentTime >= selectionRange.end) {
                    player.pause();
                    player.off("timeupdate", onTimeUpdate);
                }
            };
            player.on("timeupdate", onTimeUpdate);

            if (selectionRange.start !== undefined) {
                player.currentTime = selectionRange.start;
                player.play();
            }

            return () => {
                player.off("timeupdate", onTimeUpdate);
            };
        }
    }, [selectedRangeId]);

    return (
        <div className={styles.wrapper}>
            <div className={styles.left_container}>
                {/* 원본 비디오 */}
                <video ref={videoRef} className={styles.video} />

                {/* 비디오 썸네일 */}
                <ThumbnailTimeline
                    duration={duration}
                    player={player}
                    ranges={ranges}
                    setRanges={setRanges}
                    selectedRangeId={selectedRangeId}
                    setSelectedRangeId={setSelectedRangeId}
                />
                <div className={styles.bottom}>
                    {/* 사용 방법 설명 */}
                    <Description />
                    {/* 컨트롤 버튼 */}
                    <Controls
                        setIsMerging={setIsMerging}
                        ranges={ranges}
                        setRanges={setRanges}
                        selectedRangeId={selectedRangeId}
                        setSelectedRangeId={setSelectedRangeId}
                        mergedVideoRef={mergedVideoRef}
                    />
                </div>
            </div>
            <div className={styles.right_container}>
                {/* 병합된 비디오 */}
                {isMerging ? (
                    <video ref={mergedVideoRef} />
                ) : (
                    <div className={styles.no_video}>
                        <MdVideocamOff size={50} />
                        <p>병합된 영상이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ===================== Description 컴포넌트 =====================
const Description = () => {
    const usageList = [
        { icon: <FaMouse />, text: "타임라인을 더블 클릭하여 시점 이동" },
        { icon: <FaMapPin />, text: "마커를 드래그해서 시점 이동" },
        { icon: <FaArrowsAltH />, text: "타임라인을 드래그하여 범위 지정" },
        { icon: <FaVideo />, text: "범위을 더블 클릭하여 범위 선택 및 재생" },
        { icon: <FaTrash />, text: "범위 선택 후 Clear 버튼 클릭 시 선택 범위 삭제" },
        { icon: <TfiLayoutSidebar2 />, text: "Merge 버튼 클릭 시 범위을 병합하여 새로운 영상 생성" },
    ];

    const warningList = [
        <>
            타임라인을 이용한 드래그의 경우 더블 클릭 이벤트와 구분하기 위해 클릭 후{" "}
            <strong className={styles.highlight}>250ms</strong> 이후 시작점이 지정됩니다.
        </>,
    ];

    return (
        <div className={styles.description}>
            <h2 className={styles.title}>사용 방법</h2>
            <ul className={styles.list}>
                {usageList.map((item, index) => (
                    <li key={index}>
                        {item.icon} {item.text}
                    </li>
                ))}
            </ul>

            {/* 주의 사항 섹션 */}
            <div className={styles.warning}>
                <h3 className={styles.warningTitle}>주의 사항</h3>
                <p className={styles.warningText}>
                    {warningList.map((item, index) => (
                        <Fragment key={index}>
                            {item}
                            <br />
                        </Fragment>
                    ))}
                </p>
            </div>
        </div>
    );
};

interface ControlsProps {
    setIsMerging: React.Dispatch<React.SetStateAction<boolean>>;
    ranges: { id: string; start: number; end: number }[];
    setRanges: React.Dispatch<React.SetStateAction<{ id: string; start: number; end: number }[]>>;
    selectedRangeId: string | null;
    setSelectedRangeId: React.Dispatch<React.SetStateAction<string | null>>;
    mergedVideoRef: React.RefObject<HTMLVideoElement | null>;
}

// ===================== Controls 컴포넌트 =====================
const Controls = ({
    setIsMerging,
    ranges,
    setRanges,
    selectedRangeId,
    setSelectedRangeId,
    mergedVideoRef,
}: ControlsProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [m3u8FileObject, setM3u8FileObject] = useState<
        { accumulatedTime: number; duration: string; tsFile: string }[]
    >([]);

    useEffect(() => {
        fetch(`${SERVER_API_URL}/api/hls`)
            .then((res) => res.text())
            .then((m3u8Text) => {
                const tsArray = [];
                let accumulatedTime = 0;
                const regex = /#EXTINF:(\d+\.\d+),\s*(\S+\.ts)/g;
                let match;

                // 정규식을 사용해 #EXTINF와 ts 파일을 찾아서 배열로 저장
                while ((match = regex.exec(m3u8Text)) !== null) {
                    accumulatedTime += parseFloat(match[1]);
                    tsArray.push({
                        accumulatedTime: accumulatedTime,
                        duration: match[1],
                        tsFile: match[2],
                    });
                }

                // 결과 배열 저장
                setM3u8FileObject(tsArray);
            });
    }, []);

    /** 선택 범위 삭제 */
    const handleRangeRemove = () => {
        if (!selectedRangeId) {
            setDialogOpen(true);
            return;
        }

        setRanges((prevRanges) => prevRanges.filter((range) => range.id !== selectedRangeId));
        setSelectedRangeId(null);
    };

    /** M3U8 파일을 병합하여 새로운 M3U8 콘텐츠 생성 */
    const generateMergedM3U8 = (
        ranges: { start: number; end: number }[],
        m3u8FileObject: { accumulatedTime: number; duration: string; tsFile: string }[]
    ) => {
        if (!ranges || ranges.length === 0) {
            alert("병합할 범위를 선택해 주세요.");
            return null;
        }

        let newM3U8Content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:12\n#EXT-X-MEDIA-SEQUENCE:0\n";
        let previousEndTime = 0;

        const filteredTsFiles = m3u8FileObject.filter(({ accumulatedTime }) =>
            ranges.some((range) => accumulatedTime >= range.start && accumulatedTime <= range.end)
        );

        filteredTsFiles.forEach((file, index) => {
            if (index > 0 && file.accumulatedTime !== previousEndTime) {
                newM3U8Content += "#EXT-X-DISCONTINUITY\n";
            }

            newM3U8Content += `#EXTINF:${file.duration},\n${file.tsFile}\n`;
            previousEndTime = file.accumulatedTime + Number(file.duration);
        });

        newM3U8Content += "#EXT-X-ENDLIST";

        return newM3U8Content;
    };

    /** 새로운 M3U8 파일을 서버에 업데이트 */
    const updateM3U8File = async (m3u8Content: string) => {
        try {
            await fetch(`${SERVER_API_URL}/api/hls/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ m3u8Content }),
            });
        } catch (error) {
            console.error("Error updating m3u8:", error);
            throw error;
        }
    };

    /** 플레이어 초기화 */
    const initializePlayer = () => {
        if (!mergedVideoRef.current) return;

        const player = new Plyr(mergedVideoRef.current, {
            autoplay: true,
            muted: true,
            tooltips: { controls: true },
            keyboard: { global: true },
        });

        if (!Hls.isSupported()) {
            console.error("Hls.js를 지원하지 않는 브라우저입니다.");
            return;
        }

        const hls = new Hls();
        hls.loadSource(`${SERVER_API_URL}/api/updated_playlist.m3u8`);
        hls.attachMedia(mergedVideoRef.current);
        player.play();
    };

    /** 병합 실행 함수 */
    const handleMerge = async () => {
        const newM3U8Content = generateMergedM3U8(ranges, m3u8FileObject);
        if (!newM3U8Content) return;

        setIsMerging(true);

        try {
            await updateM3U8File(newM3U8Content);
            initializePlayer();
        } catch (error) {
            console.error("M3U8 병합 및 플레이어 초기화 실패:", error);
        }
    };

    /** 다이얼로그 닫기 */
    const handleClose = () => {
        setDialogOpen(false);
    };

    /** 다이얼로그 확인 */
    const handleConfirm = () => {
        setRanges([]);
        setSelectedRangeId(null);
        setDialogOpen(false);
    };

    return (
        <div className={styles.controls}>
            <button onClick={handleRangeRemove}>Clear</button>
            <button onClick={handleMerge}>Merge</button>
            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">범위를 삭제하시겠습니까?</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        선택된 범위가 없습니다. 전체 범위를 삭제하시겠습니까?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>취소</Button>
                    <Button onClick={handleConfirm} autoFocus>
                        확인
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};
