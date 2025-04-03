import React, { useEffect, useState, useRef } from "react";
import { useHlsPlayer, useZoomAndPan } from "../lib";
import { DEFAULT_MINIMAP_WIDTH, MINIMAP_MAX_WIDTH, MINIMAP_MIN_WIDTH, FPS } from "../lib";
import { VideoCaptureButton } from "./VideoCaptureButton";
import { ZoomIcons, MoveIcons, DescriptionIcons } from "../icon";
import styles from "./VideoZoomPlayer.module.scss";
import "plyr/dist/plyr.css";

// ===================== Video Zoom Player 컴포넌트 =====================
export const VideoZoomPlayer = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const minimapRef = useRef<HTMLDivElement>(null);
    const minimapViewportRef = useRef<HTMLDivElement>(null);
    const [showZoom, setShowZoom] = useState(false);
    const { videoRatio } = useHlsPlayer(videoRef);
    const { zoom, position, setIsDragging, setDragStart, handleZoomMove } = useZoomAndPan(
        containerRef,
        minimapRef,
        minimapViewportRef
    );

    // 비디오 확대/축소 및 이동의 동적 스타일
    const scaleTransform = `scale(${zoom})`;
    const translateX = -(position.x / (minimapRef.current?.offsetWidth || 1)) * 100;
    const translateY = -(position.y / (minimapRef.current?.offsetHeight || 1)) * 100;
    const translateTransform = `translate(${translateX}%, ${translateY}%)`;
    const videoTransform = `${scaleTransform} ${translateTransform}`;

    const minimapWidth = Math.min(Math.max(DEFAULT_MINIMAP_WIDTH, MINIMAP_MIN_WIDTH), MINIMAP_MAX_WIDTH);
    const minimapHeight = minimapWidth / videoRatio;

    useEffect(() => {
        const restartButton = document.querySelector<HTMLButtonElement>(
            ".plyr--full-ui.plyr--video .plyr__control--overlaid"
        );

        // 확대할 때 중앙 실행 버튼이 비디오를 가리는 문제 해결
        const setRestartButtonVisible = (isVisible: boolean) => {
            if (restartButton) {
                restartButton.style.display = isVisible ? "block" : "none";
            }
        };

        if (zoom > 1) {
            setShowZoom(true);
            setRestartButtonVisible(false);

            const timer = setTimeout(() => setShowZoom(false), 500);
            return () => clearTimeout(timer);
        }

        setShowZoom(false);
        setRestartButtonVisible(true);
    }, [zoom]);

    /** 비디오 드래그 이벤트 핸들러 */
    const onMouseDownHandler = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    /** 1프레임씩 이동하는 함수 */
    const handleFrameStep = (direction: "forward" | "backward") => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const step = 1 / FPS;
            videoRef.current.currentTime = direction === "forward" ? currentTime + step : currentTime - step;
        }
    };

    return (
        <div className={styles.wrapper}>
            <div ref={containerRef} className={styles.top}>
                <video ref={videoRef} className={styles.video} style={{ transform: videoTransform }} />
                {/* 비디오 드래그하여 화면 이동 */}
                {zoom > 1 && <canvas ref={canvasRef} className={styles.canvas} onMouseDown={onMouseDownHandler} />}
                {/* 줌 레벨 */}
                <ZoomLevel zoom={zoom} showZoom={showZoom} />
                {/* 미니맵 */}
                <MiniMap
                    zoom={zoom}
                    position={position}
                    containerRef={containerRef}
                    minimapRef={minimapRef}
                    minimapViewportRef={minimapViewportRef}
                    minimapWidth={minimapWidth}
                    minimapHeight={minimapHeight}
                    onMouseDownHandler={onMouseDownHandler}
                />
            </div>

            <div className={styles.bottom}>
                {/* 사용 방법 설명 */}
                <Description />
                <div className={styles.button_group}>
                    {/* 줌 컨트롤러 */}
                    <ZoomController move={handleZoomMove} />
                    {/* FPS 컨트롤러 */}
                    <FpsController step={handleFrameStep} />
                    {/* 캡처 버튼 */}
                    <VideoCaptureButton
                        video={videoRef.current}
                        zoom={zoom}
                        position={position}
                        minimapRef={minimapRef}
                    />
                </div>
            </div>
        </div>
    );
};

// ===================== ZoomLevel 컴포넌트 =====================
interface ZoomLevelProps {
    zoom: number;
    showZoom: boolean;
}

const ZoomLevel = ({ zoom, showZoom }: ZoomLevelProps) => {
    return (
        <React.Fragment>
            {showZoom && <div className={styles.zoom_level}>{`${Math.round(zoom * 100)}%`}</div>}
        </React.Fragment>
    );
};

// ===================== MiniMap 컴포넌트 =====================
interface MiniMapProps {
    zoom: number;
    position: { x: number; y: number };
    containerRef: React.RefObject<HTMLDivElement | null>;
    minimapRef: React.RefObject<HTMLDivElement | null>;
    minimapViewportRef: React.RefObject<HTMLDivElement | null>;
    minimapWidth: number;
    minimapHeight: number;
    onMouseDownHandler: (e: React.MouseEvent) => void;
}

const MiniMap = ({
    zoom,
    position,
    minimapRef,
    minimapViewportRef,
    minimapWidth,
    minimapHeight,
    onMouseDownHandler,
}: MiniMapProps) => {
    const minimapStyle = {
        display: zoom > 1 ? "block" : "none",
        width: `${minimapWidth}px`,
        height: `${minimapHeight}px`,
    };

    const minimapViewportStyle = {
        width: `${100 / zoom}%`,
        height: `${100 / zoom}%`,
        left: `${position.x}px`,
        top: `${position.y}px`,
    };

    return (
        <div ref={minimapRef} className={styles.minimap} style={minimapStyle}>
            {/* 미니맵 확대 영역 */}
            <div
                ref={minimapViewportRef}
                className={styles.minimap_viewport}
                style={minimapViewportStyle}
                onMouseDown={onMouseDownHandler}
            />
        </div>
    );
};

// ===================== ZoomController 컴포넌트 =====================
type ZoomAction = "IN" | "OUT" | "RESET" | "UP" | "DOWN" | "LEFT" | "RIGHT";

interface ZoomControllerProps {
    move: (type: ZoomAction) => void;
}

const zoomButtons = [
    { action: "IN", className: styles.zoom_in, icon: <ZoomIcons.ZoomIn /> },
    { action: "OUT", className: styles.zoom_out, icon: <ZoomIcons.ZoomOut /> },
] as const;

const moveButtons = [
    { action: "UP", className: styles.move_up, icon: <ZoomIcons.MoveUp /> },
    { action: "LEFT", className: styles.move_left, icon: <ZoomIcons.MoveLeft /> },
    { action: "RIGHT", className: styles.move_right, icon: <ZoomIcons.MoveRight /> },
    { action: "DOWN", className: styles.move_down, icon: <ZoomIcons.MoveDown /> },
    { action: "RESET", className: styles.move_reset, icon: <ZoomIcons.MoveReset /> },
] as const;

const ZoomController = ({ move }: ZoomControllerProps) => {
    const handleMove = (action: ZoomAction) => () => move(action);

    return (
        <div className={styles.zoom_controller}>
            {/* 줌 버튼 */}
            <div className={styles.zoom_buttons}>
                {zoomButtons.map(({ action, className, icon }) => (
                    <button key={action} onClick={handleMove(action)} className={className}>
                        {icon}
                    </button>
                ))}
            </div>

            {/* 이동 버튼 */}
            <div className={styles.move_buttons}>
                {moveButtons.map(({ action, className, icon }) => (
                    <button key={action} onClick={handleMove(action)} className={className}>
                        {icon}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ZoomController;

// ===================== FpsController 컴포넌트 =====================
interface FpsControllerProps {
    step: (direction: "forward" | "backward") => void;
}

export const FpsController = ({ step }: FpsControllerProps) => {
    return (
        <div className={styles.frame_controller}>
            <div className={styles.frame_button_group}>
                <div className={styles.frame_button_wrapper}>
                    <span className={styles.frame_label}>-1 FPS</span>
                    <button onClick={() => step("backward")} className={styles.frameButton}>
                        <MoveIcons.Backward />
                    </button>
                </div>
                <div className={styles.frame_button_wrapper}>
                    <span className={styles.frame_label}>+1 FPS</span>
                    <button onClick={() => step("forward")} className={styles.frameButton}>
                        <MoveIcons.Forward />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================== Description 컴포넌트 =====================
const Description = () => {
    const usageList = [
        { icon: <DescriptionIcons.ZoomIn className={styles.icon} />, text: "마우스 휠로 확대/축소" },
        { icon: <DescriptionIcons.Move className={styles.icon} />, text: "비디오 드래그하여 화면 이동" },
        { icon: <DescriptionIcons.MiniMap className={styles.icon} />, text: "미니맵 확대 영역을 드래그하여 화면 이동" },
        {
            icon: <DescriptionIcons.Controller className={styles.icon} />,
            text: "컨트롤러를 이용한 화면 이동 및 확대/축소",
        },
        {
            icon: <DescriptionIcons.Capture className={styles.icon} />,
            text: "Capture 버튼을 클릭 시 캡쳐 이미지 화질 개선(예정)",
        },
    ];

    const warningList = [
        <>
            미니맵은 화면이 확대된 경우에만 <strong className={styles.highlight}>활성화</strong>됩니다.
            <br />
            화면이 확대된 경우 비디오 클릭으로 중지 및 재생이 <strong className={styles.highlight}>불가능</strong>
            합니다.
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
                        <React.Fragment key={index}>
                            {item}
                            <br />
                        </React.Fragment>
                    ))}
                </p>
            </div>
        </div>
    );
};
