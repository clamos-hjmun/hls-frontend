// import { VideoZoomPlayer } from "@/3_widgets/video-zoom-player";
import { VideoMergePlayer } from "@/3_widgets/video-merge-player";
// import { LiveBroadcast } from "@/3_widgets/test";
import styles from "./HomePage.module.scss";

export const HomePage = () => {
    return (
        <div className={styles.wrapper}>
            <VideoMergePlayer />
        </div>
    );
};
