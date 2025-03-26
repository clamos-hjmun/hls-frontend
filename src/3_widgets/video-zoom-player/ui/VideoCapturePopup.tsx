import React, { useEffect } from "react";
import styles from "./VideoCapturePopup.module.scss";

interface VideoCapturePopupProps {
    imageUrl: string;
    onClose: () => void;
}

const VideoCapturePopup: React.FC<VideoCapturePopupProps> = ({ imageUrl, onClose }) => {
    const handleEscKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            onClose();
        }
    };

    useEffect(() => {
        window.addEventListener("keydown", handleEscKey);

        return () => {
            window.removeEventListener("keydown", handleEscKey);
        };
    }, []);

    return (
        <div className={styles.popup_overlay}>
            <div className={styles.popup_content}>
                <button className={styles.popup_close} onClick={onClose}>
                    ✕
                </button>
                <img src={imageUrl} alt="캡처된 이미지" className={styles.popup_image} />
            </div>
        </div>
    );
};

export default VideoCapturePopup;
