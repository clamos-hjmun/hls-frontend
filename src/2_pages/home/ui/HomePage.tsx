import { useState } from "react";
import { VideoZoomPlayer } from "@/3_widgets/video-zoom-player";
import { VideoMergePlayer } from "@/3_widgets/video-merge-player";
import { VideoPreviewList } from "@/3_widgets/video-preview-list";
import styles from "./HomePage.module.scss";

export const HomePage = () => {
    const [tabNum, setTabNum] = useState(1);

    // 탭 변경 이벤트 핸들러
    const handleChange = (newTab: number) => {
        setTabNum(newTab);
    };

    return (
        <div className={styles.wrapper}>
            {/* 탭 헤더 */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tabNum === 1 ? styles.active : ""}`}
                    onClick={() => handleChange(1)}
                >
                    1. Zoom Player
                </button>
                <button
                    className={`${styles.tab} ${tabNum === 2 ? styles.active : ""}`}
                    onClick={() => handleChange(2)}
                >
                    2. Merge Player
                </button>
                <button
                    className={`${styles.tab} ${tabNum === 3 ? styles.active : ""}`}
                    onClick={() => handleChange(3)}
                >
                    3. Video Preview
                </button>
            </div>

            {/* 탭 내용 */}
            <div className={styles.tabContent}>
                {tabNum === 1 && <VideoZoomPlayer />}
                {tabNum === 2 && <VideoMergePlayer />}
                {tabNum === 3 && <VideoPreviewList />}
            </div>
        </div>
    );
};
