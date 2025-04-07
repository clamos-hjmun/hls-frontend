import { Fragment, useRef, useState } from "react";
import { useHlsPlayer } from "../lib";
import { ThumbnailTimeline } from "./ThumbnailTimeline";
import { FaMouse, FaTrash, FaArrowsAltH, FaVideo, FaMapPin } from "react-icons/fa";
import { GoSingleSelect } from "react-icons/go";
import { AiOutlineClear } from "react-icons/ai";
import { MdVideocamOff } from "react-icons/md";
import { RxSlider } from "react-icons/rx";
import { TfiLayoutSidebar2 } from "react-icons/tfi";

import styles from "./VideoMergePlayer.module.scss";
import "plyr/dist/plyr.css";

// ===================== Video Merge Player 컴포넌트 =====================
export const VideoMergePlayer = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const mergedVideoRef = useRef<HTMLVideoElement | null>(null);
    const { player, duration } = useHlsPlayer(videoRef);
    const [ranges, setRanges] = useState<{ id: string; start: number; end: number }[]>([]);
    const [isMerging, setIsMerging] = useState<boolean>(false);
    const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);

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
                    videoRef={videoRef}
                    setRanges={setRanges}
                    setIsMerging={setIsMerging}
                    mergedVideoRef={mergedVideoRef}
                    selectedRangeId={selectedRangeId}
                    setSelectedRangeId={setSelectedRangeId}
                />
                <div className={styles.bottom}>
                    {/* 사용 방법 설명 */}
                    <Description />
                </div>
            </div>
            <div className={styles.right_container}>
                {/* 병합된 비디오 */}
                {isMerging ? (
                    <video id="merge_video" ref={mergedVideoRef} />
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
        { icon: <FaArrowsAltH />, text: "타임라인을 드래그하여 범위 생성" },
        { icon: <GoSingleSelect />, text: "셀렉트 박스를 선택하여 범위 선택 및 재생" },
        { icon: <FaVideo />, text: "범위을 더블 클릭하여 범위 선택 및 재생" },
        { icon: <RxSlider />, text: "슬라이드를 이동하여 타임라인 간격 변경" },
        { icon: <AiOutlineClear />, text: "Clear 버튼 클릭 시 전체 범위 삭제" },
        { icon: <FaTrash />, text: "범위 선택 후 Delete 버튼 클릭 시 범위 삭제" },
        { icon: <TfiLayoutSidebar2 />, text: "Merge 버튼 클릭 시 병합 후 새로운 영상 생성" },
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
