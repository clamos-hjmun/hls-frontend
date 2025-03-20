import { useState, RefObject } from "react";
import { useLoadingStore } from "@/6_shared/model";
import VideoCapturePopup from "./VideoCapturePopup";
import styles from "./VideoCaptureButton.module.scss";

interface VideoCaptureButtonProps {
  video: HTMLVideoElement | null;
  zoom: number;
  position: { x: number; y: number };
  minimapRef: RefObject<HTMLDivElement | null>;
}

export const VideoCaptureButton = ({ video, zoom, position, minimapRef }: VideoCaptureButtonProps) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoadingStore.getState();

  const captureVideoFrame = () => {
    if (!video) return;

    showLoading();

    setTimeout(() => {
      const scale = zoom;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      const visibleWidth = videoWidth / scale;
      const visibleHeight = videoHeight / scale;

      const offsetX = (position.x / (minimapRef.current?.offsetWidth || 1)) * videoWidth;
      const offsetY = (position.y / (minimapRef.current?.offsetHeight || 1)) * videoHeight;

      const canvas = document.createElement("canvas");
      canvas.width = visibleWidth;
      canvas.height = visibleHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, offsetX, offsetY, visibleWidth, visibleHeight, 0, 0, visibleWidth, visibleHeight);

      const dataUrl = canvas.toDataURL("image/png");

      setCapturedImage(dataUrl);
      hideLoading();
    }, 2000);
  };

  return (
    <div className={styles.video_capture}>
      <button onClick={captureVideoFrame}>Capture</button>
      {capturedImage && <VideoCapturePopup imageUrl={capturedImage} onClose={() => setCapturedImage(null)} />}
    </div>
  );
};
