import { useEffect, useState, useRef, Fragment } from "react";
import { DEFAULT_MINIMAP_WIDTH, MINIMAP_MAX_WIDTH, MINIMAP_MIN_WIDTH, FPS } from "../lib";
import { ZoomIcons, MoveIcons, DescriptionIcons } from "../icon";
import { useHlsPlayer, useZoomAndPan } from "../lib";
import VideoCapturePopup from "./VideoCapturePopup";
import styles from "./VideoZoomPlayer.module.scss";
import "plyr/dist/plyr.css";

// ===================== Video Zoom Player 컴포넌트 =====================
export const VideoZoomPlayer = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const enhanceRef = useRef<HTMLCanvasElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);
    const minimapRef = useRef<HTMLDivElement>(null);
    const minimapViewportRef = useRef<HTMLDivElement>(null);
    const [showZoom, setShowZoom] = useState(false);
    const [showEnhance, setShowEnhance] = useState(false);
    const [enhanceRect, setEnhanceRect] = useState({ x: 0, y: 0 });
    const [capturedImages, setCapturedImages] = useState<{ type: number; src: string }[]>([]);
    const { videoRatio, isPaused } = useHlsPlayer(videoRef);
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

    // zoom 상태 변화 감지
    useEffect(() => {
        if (zoom > 1) {
            setShowZoom(true);
            setButtonVisible(false);

            // 일정 시간 후 확대 강조 UI 제거
            const timer = setTimeout(() => setShowZoom(false), 500);
            return () => clearTimeout(timer);
        }

        setShowZoom(false);
        setButtonVisible(true);
    }, [zoom]);

    // showEnhance 상태 변화 감지
    useEffect(() => {
        setButtonVisible(!showEnhance);
    }, [showEnhance]);

    /** 비디오 컨트롤 버튼 보이기/숨기기 */
    const setButtonVisible = (isVisible: boolean) => {
        const restartButton = document.querySelector<HTMLButtonElement>(
            ".plyr--full-ui.plyr--video .plyr__control--overlaid"
        );
        const controls = document.querySelector<HTMLDivElement>(".plyr__controls");

        if (restartButton) {
            restartButton.style.display = isVisible ? "block" : "none";
        }
        if (controls) {
            controls.style.display = isVisible ? "flex" : "none";
        }
    };

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

    /** 캡쳐 이미지 삭제 핸들러 */
    const handleCaptureDelete = (image: string) => {
        setCapturedImages((prev) => prev.filter((img) => img.src !== image));
    };

    /** 비디오 화질 개선 캡쳐 핸들러 */
    const handleEnhanceSave = () => {
        if (!videoRef.current || !enhanceRef.current) return;

        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (video.readyState < 2) {
            console.warn("Video not ready for capture");
            return;
        }

        // 비디오 원본 해상도
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // 화면 상 렌더링 크기
        const displayWidth = video.clientWidth;
        const displayHeight = video.clientHeight;

        // 비율 계산
        const scaleX = videoWidth / displayWidth;
        const scaleY = videoHeight / displayHeight;

        // enhanceRect는 UI 기준 좌표이므로 비율 반영
        const sx = enhanceRect.x * scaleX;
        const sy = enhanceRect.y * scaleY;

        // 고정된 추출 크기 (비디오 원본 해상도 기준으로 변환)
        const sw = 400 * scaleX;
        const sh = 400 * scaleY;

        // 저장할 캔버스 크기 (출력 해상도 고정)
        canvas.width = 400;
        canvas.height = 400;

        // 비디오의 원하는 영역을 캔버스에 그림
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/png");
        setCapturedImages((prev) => [
            ...prev,
            {
                type: 2,
                src: dataUrl,
            },
        ]);

        // 강조 박스 지우기
        const enhanceCtx = enhanceRef.current.getContext("2d");
        if (enhanceCtx) {
            enhanceCtx.clearRect(0, 0, enhanceRef.current.width, enhanceRef.current.height);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.left_container}>
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
                    {/* 비디오 화질 개선 영역 */}
                    <VideoEnhance
                        enhanceRef={enhanceRef}
                        showEnhance={showEnhance}
                        enhanceRect={enhanceRect}
                        containerRef={containerRef}
                        videoRef={videoRef}
                        setEnhanceRect={setEnhanceRect}
                    />

                    {/* 비디오 캡쳐 시 플래시 효과 */}
                    <div ref={flashRef} className={styles.flash} />
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
                            isPaused={isPaused}
                            position={position}
                            minimapRef={minimapRef}
                            flashRef={flashRef}
                            setCapturedImages={setCapturedImages}
                        />
                        {/* 비디오 화질 개선 버튼 */}
                        <VideoEnhanceButton
                            showEnhance={showEnhance}
                            handleZoomMove={handleZoomMove}
                            setEnhanceRect={setEnhanceRect}
                            setShowEnhance={setShowEnhance}
                            handleEnhanceSave={handleEnhanceSave}
                            isPaused={isPaused}
                        />
                    </div>
                </div>
            </div>
            <div className={styles.right_container}>
                <CaptuerCards capturedImages={capturedImages} onDelete={handleCaptureDelete} />
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
    return <Fragment>{showZoom && <div className={styles.zoom_level}>{`${Math.round(zoom * 100)}%`}</div>}</Fragment>;
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

// ===================== VideoCapture Button 컴포넌트 =====================

interface VideoCaptureButtonProps {
    video: HTMLVideoElement | null;
    zoom: number;
    isPaused: boolean;
    position: { x: number; y: number };
    minimapRef: React.RefObject<HTMLDivElement | null>;
    flashRef: React.RefObject<HTMLDivElement | null>;
    setCapturedImages: React.Dispatch<React.SetStateAction<{ type: number; src: string }[]>>;
}

export const VideoCaptureButton = ({
    video,
    zoom,
    isPaused,
    position,
    minimapRef,
    flashRef,
    setCapturedImages,
}: VideoCaptureButtonProps) => {
    const captureVideoFrame = () => {
        if (!video) return;

        if (flashRef.current) {
            flashRef.current.classList.add(styles.active);
            setTimeout(() => {
                flashRef.current?.classList.remove(styles.active);
            }, 500);
        }

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

        setCapturedImages((prev) => [...prev, { type: 1, src: dataUrl }]);
    };

    return (
        <div className={styles.video_capture}>
            <button onClick={captureVideoFrame} className={isPaused ? "" : styles.disabled} disabled={!isPaused}>
                Capture
            </button>
        </div>
    );
};

// ===================== Video Enhance 컴포넌트 =====================
interface VideoEnhanceProps {
    enhanceRef: React.RefObject<HTMLCanvasElement | null>;
    showEnhance: boolean;
    enhanceRect: { x: number; y: number };
    containerRef: React.RefObject<HTMLDivElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    setEnhanceRect: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

const VideoEnhance = ({ enhanceRef, showEnhance, enhanceRect, containerRef, setEnhanceRect }: VideoEnhanceProps) => {
    const dragOffset = useRef({ x: 0, y: 0 });
    const [isDraggingEnhance, setIsDraggingEnhance] = useState(false);

    // 드래그 시작
    const handleEnhanceMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingEnhance(true);
        dragOffset.current = {
            x: e.clientX - enhanceRect.x,
            y: e.clientY - enhanceRect.y,
        };
    };

    // 드래그 중
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingEnhance || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        // 비디오 영역 밖으로 나가지 않도록 제한
        const maxX = containerRect.width - 400;
        const maxY = containerRect.height - 400;
        setEnhanceRect({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
        });
    };

    // 드래그 종료
    const handleMouseUp = () => {
        setIsDraggingEnhance(false);
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingEnhance]);

    useEffect(() => {
        const blurLayer = document.querySelector(`.${styles.blur_layer}`) as HTMLElement;
        if (blurLayer) {
            const centerX = enhanceRect.x + 200;
            const centerY = enhanceRect.y + 200;

            blurLayer.style.setProperty("--hole-x", `${centerX}px`);
            blurLayer.style.setProperty("--hole-y", `${centerY}px`);
        }
    }, [enhanceRect]);

    return (
        <Fragment>
            {showEnhance && (
                <div className={styles.enhance_overlay}>
                    <div className={styles.blur_layer} />
                    <canvas
                        ref={enhanceRef}
                        className={styles.enhance_focus}
                        style={{
                            left: enhanceRect.x,
                            top: enhanceRect.y,
                        }}
                        onMouseDown={handleEnhanceMouseDown}
                    />
                </div>
            )}
        </Fragment>
    );
};

// ===================== Video Enhance Button컴포넌트 =====================
interface VideoEnhanceButtonProps {
    showEnhance: boolean;
    handleZoomMove: (type: ZoomAction) => void;
    setEnhanceRect: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
    setShowEnhance: React.Dispatch<React.SetStateAction<boolean>>;
    handleEnhanceSave: () => void;
    isPaused: boolean;
}

const VideoEnhanceButton = ({
    showEnhance,
    handleZoomMove,
    setEnhanceRect,
    setShowEnhance,
    handleEnhanceSave,
    isPaused,
}: VideoEnhanceButtonProps) => {
    return (
        <div className={styles.enhance_button}>
            {showEnhance ? (
                <div className={styles.enhance_button_group}>
                    <button
                        onClick={() => {
                            setShowEnhance((prev) => !prev);
                        }}
                    >
                        Cancel
                    </button>

                    <button onClick={handleEnhanceSave}>Save</button>
                </div>
            ) : (
                <button
                    onClick={() => {
                        handleZoomMove("RESET");
                        setEnhanceRect({ x: 0, y: 0 });
                        setShowEnhance((prev) => !prev);
                    }}
                    className={isPaused ? "" : styles.disabled}
                    disabled={!isPaused}
                >
                    Enhance
                </button>
            )}
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
            text: "Capture 버튼을 클릭 시 비디오 캡쳐",
        },
        {
            icon: <DescriptionIcons.Enhance className={styles.icon} />,
            text: "Enhance 버튼을 클릭 시 비디오 화질 개선",
        },
    ];

    const warningList = [
        <Fragment>
            • 미니맵은 화면이 확대된 경우에만 <strong className={styles.highlight}>활성화</strong>됩니다.
            <br />• 화면이 확대된 경우 비디오 클릭이 <strong className={styles.highlight}>제한</strong>됩니다.
            <br />• 비디오가 중지된 상태에서만 <span className={styles.highlight}>캡쳐</span>가 가능합니다.
        </Fragment>,
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

// ===================== Captuer Cards 컴포넌트 =====================
interface CaptuerCardsProps {
    capturedImages: { type: number; src: string }[];
    onDelete: (image: string) => void;
}

const CaptuerCards = ({ capturedImages, onDelete }: CaptuerCardsProps) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <div className={styles.capture_cards}>
            {capturedImages.map((image, index) => (
                <CaptureCard
                    key={index}
                    type={image.type}
                    image={image.src}
                    setSelectedImage={setSelectedImage}
                    onDelete={onDelete}
                />
            ))}

            {selectedImage && <VideoCapturePopup imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
        </div>
    );
};

interface CaptureCardProps {
    type: number /** 1: 비디오 캡쳐, 2: 화질 개선 */;
    image: string;
    setSelectedImage: React.Dispatch<React.SetStateAction<string | null>>;
    onDelete: (index: string) => void;
}

// 태그 텍스트 및 스타일 클래스 정의
const getTagInfo = (type: number) => {
    switch (type) {
        case 1:
            return { text: "비디오 캡쳐", className: styles.tag_video };
        case 2:
            return { text: "화질 개선", className: styles.tag_quality };
        default:
            return { text: "", className: "" };
    }
};

const CaptureCard = ({ type, image, setSelectedImage, onDelete }: CaptureCardProps) => {
    const [progress, setProgress] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const isComplete = progress === 100;

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 20);
        return () => clearInterval(interval);
    }, []);

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = image;
        link.download = `capture-${Date.now()}.png`;
        link.click();
    };

    const onViewDetail = () => {
        setSelectedImage(image);
    };

    const handleDelete = () => {
        onDelete(image);
    };

    const { text: tagText, className: tagClass } = getTagInfo(type);

    return (
        <div
            className={styles.capture_card}
            onDoubleClick={onViewDetail}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 태그 영역 */}
            {tagText && <div className={`${styles.tag} ${tagClass} ${isComplete ? "" : styles.blink}`}>{tagText}</div>}

            {/* 이미지 프리뷰 */}
            <div
                className={`${styles.preview} ${isComplete ? styles.visible : styles.dimmed} ${isHovered ? styles.blurred : ""}`}
            >
                <img src={image} alt="Captured" />
                {isHovered && (
                    <div className={styles.actions}>
                        <button onClick={onViewDetail}>자세히 보기</button>
                        <button onClick={handleDownload}>다운로드</button>
                        <button onClick={handleDelete} className={styles.warning}>
                            삭제
                        </button>
                    </div>
                )}
            </div>

            {!isComplete && (
                <div className={styles.progress_bar}>
                    <div className={styles.progress_fill} style={{ width: `${progress}%` }} />
                </div>
            )}
        </div>
    );
};
