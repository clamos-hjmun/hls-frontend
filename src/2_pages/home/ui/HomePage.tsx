import { HlsVideo } from "@/3_widgets/hls-video";
import styles from "./HomePage.module.scss";

export const HomePage = () => {
  return (
    <div className={styles.wrapper}>
      <HlsVideo />
    </div>
  );
};
