import { useState, useEffect, useRef, useCallback, JSX, Fragment } from "react";
import { Skeleton, Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import { getFormatTime } from "../lib";
import Plyr from "plyr";
import Hls from "hls.js";
import Slider from "@mui/material/Slider";
import styles from "./ThumbnailTimeline.module.scss";

const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL;
const PIXELS_PER_SECOND = 1;
const DEFAULT_TICK_INTERVAL = 50;
const sliderMarks = [
    {
        value: 10,
        label: "1m",
    },
    {
        value: 30,
        label: "3m",
    },
    {
        value: 50,
        label: "5m",
    },
    {
        value: 100,
        label: "10m",
    },
];

// ===================== Thumbnail Timeline 컴포넌트 =====================
interface ThumbnailTimelineProps {
    player: Plyr | null;
    duration: number;
    ranges: { id: string; start: number; end: number }[];
    videoRef: React.RefObject<HTMLVideoElement | null>;
    setRanges: React.Dispatch<React.SetStateAction<{ id: string; start: number; end: number }[]>>;
    setIsMerging: React.Dispatch<React.SetStateAction<boolean>>;
    mergedVideoRef: React.RefObject<HTMLVideoElement | null>;
    selectedRangeId: string | null;
    setSelectedRangeId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ThumbnailTimeline: React.FC<ThumbnailTimelineProps> = ({
    player,
    duration,
    ranges,
    videoRef,
    setRanges,
    setIsMerging,
    mergedVideoRef,
    selectedRangeId,
    setSelectedRangeId,
}) => {
    const [timelineImages, setTimelineImagesState] = useState<{ url: string; time: number }[]>([]);
    const [draggingMarker, setDraggingMarker] = useState<boolean>(false);
    const [timelineWidth, setTimelineWidth] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [tickInterval, setTickInterval] = useState<number>(DEFAULT_TICK_INTERVAL);
    const [loading, setLoading] = useState<boolean>(true);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);
    const currentTimeRef = useRef<number>(0);
    const animationFrameIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (duration === 0) return;
        generateTimeline(tickInterval);
        requestAnimationFrame(updateTimeLine);
        setTimelineWidth((duration * PIXELS_PER_SECOND) / (tickInterval * 0.04));
    }, [duration]);

    useEffect(() => {
        if (animationFrameIdRef.current && draggingMarker) {
            cancelAnimationFrame(animationFrameIdRef.current);
        } else {
            animationFrameIdRef.current = requestAnimationFrame(updateTimeLine);
        }
    }, [draggingMarker]);

    useEffect(() => {
        if (!selectedRangeId || !videoRef.current) return;

        const selectionRange = ranges.find((range) => range.id === selectedRangeId);

        if (!selectionRange || !player) return;

        // 타임라인을 선택된 범위의 시작 위치로 스크롤 이동
        scrollToSelectionStart(selectionRange);

        // 선택된 범위의 시작 위치로 비디오 재생
        if (selectionRange.start !== undefined) {
            player.currentTime = selectionRange.start;
            player.play();
        }
    }, [selectedRangeId]);

    /** 현재 시간 라인 그리기 */
    const drawCurrentTimeLine = () => {
        if (!progressRef.current || !player) return;

        const currentTime = player.currentTime;
        setCurrentTime(currentTime);
        currentTimeRef.current = currentTime;
    };

    /** 애니메이션 프레임을 사용하여 현재 시간 라인 업데이트 */
    const updateTimeLine = useCallback(() => {
        drawCurrentTimeLine();
        animationFrameIdRef.current = requestAnimationFrame(updateTimeLine);
    }, [drawCurrentTimeLine]);

    /** 선택된 범위의 시작 위치로 canvas 스크롤을 이동시키는 함수 */
    const scrollToSelectionStart = (selectionRange: { start: number; end: number }) => {
        if (!canvasRef.current || !scrollRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const left = (selectionRange.start / duration) * canvasRect.width;

        // 선택된 시작 위치가 현재 스크롤 영역 바깥에 있을 경우 스크롤 이동
        if (
            left < scrollRef.current.scrollLeft ||
            left > scrollRef.current.scrollLeft + scrollRef.current.clientWidth
        ) {
            scrollRef.current.scrollLeft = left;
        }
    };

    /** 썸네일 생성 */
    const generateTimeline = async (tickInterval: number) => {
        if (!player) return;

        try {
            setLoading(true);
            const imagePaths = await getThumbnailPaths(duration, tickInterval);
            const images = await Promise.all(
                imagePaths.map(async (path, index) => {
                    const response = await fetch(`${SERVER_API_URL}/api/create/thumbnail/${path}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path }),
                    });

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const time = (duration / imagePaths.length) * index;

                    return { url, time };
                })
            );

            setTimelineImagesState(images);
            setLoading(false);
        } catch (error) {
            console.error("Failed to generate timeline:", error);
        }
    };

    /** 썸네일 이미지 경로 가져오기 */
    const getThumbnailPaths = async (
        duration: number,
        tickInterval: number
    ): Promise<{ url: string; time: number }[]> => {
        const numFrames = Math.ceil(duration / (tickInterval * 6));

        const response = await fetch(`${SERVER_API_URL}/api/create/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duration, numFrames }),
        });

        const data = await response.json();
        return data.imagePaths;
    };

    /** 슬라이더 값 변경 시 */
    const onChnageSlider = (_: Event, newValue: number | number[]) => {
        setTimelineWidth((duration * PIXELS_PER_SECOND) / (Number(newValue) * 0.04));
        generateTimeline(Number(newValue));
        setTickInterval(Number(newValue));
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.top}>
                {/* 구간 선택 박스 */}
                <TimelineSelectBox
                    ranges={ranges}
                    selectedRangeId={selectedRangeId}
                    setSelectedRangeId={setSelectedRangeId}
                />
            </div>

            <div ref={scrollRef} className={styles.middle}>
                <div className={styles.timeline_container} style={{ width: timelineWidth }}>
                    {/* 타임라인 틱 */}
                    <TimelineTicks duration={duration} timelineWidth={timelineWidth} tickInterval={tickInterval} />

                    {/* 타임라인 */}
                    <Timeline
                        duration={duration}
                        player={player}
                        ranges={ranges}
                        setRanges={setRanges}
                        canvasRef={canvasRef}
                        setSelectedRangeId={setSelectedRangeId}
                        timelineWidth={timelineWidth}
                        selectedRangeId={selectedRangeId}
                        timelineImages={timelineImages}
                        loading={loading}
                    />

                    {/* 타임라인 마커 */}
                    <TimelineMarker
                        player={player}
                        canvasRef={canvasRef}
                        progressRef={progressRef}
                        currentTimeRef={currentTimeRef}
                        currentTime={currentTime}
                        loading={loading}
                        duration={duration}
                        setCurrentTime={setCurrentTime}
                        draggingMarker={draggingMarker}
                        setDraggingMarker={setDraggingMarker}
                    />
                </div>
            </div>

            <div className={styles.bottom}>
                {/* 타임라인 틱 슬라이더 */}
                <TimelineSlider onChnageSlider={onChnageSlider} />
                {/* 컨트롤 버튼 */}
                <Controls
                    ranges={ranges}
                    setRanges={setRanges}
                    setIsMerging={setIsMerging}
                    mergedVideoRef={mergedVideoRef}
                    selectedRangeId={selectedRangeId}
                    setSelectedRangeId={setSelectedRangeId}
                />
            </div>
        </div>
    );
};

// ===================== Timeline Select Box 컴포넌트 =====================
interface TimelineSelectBoxProps {
    ranges: { id: string; start: number; end: number }[];
    selectedRangeId: string | null;
    setSelectedRangeId: React.Dispatch<React.SetStateAction<string | null>>;
}

const TimelineSelectBox: React.FC<TimelineSelectBoxProps> = ({ ranges, selectedRangeId, setSelectedRangeId }) => {
    const sortedRanges = [...ranges].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return (
        <FormControl
            size="small"
            sx={{
                minWidth: 260,
                borderRadius: 2,
                color: "#f5f5f5",
                "& .MuiInputBase-root": {
                    backgroundColor: "#2a2a2a",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#555",
                },
            }}
        >
            <InputLabel id="select-label" sx={{ color: "#bbb" }}>
                선택 범위
            </InputLabel>

            <Select
                labelId="select-label"
                id="timeline-select"
                value={selectedRangeId || ""}
                onChange={(e) => setSelectedRangeId(e.target.value)}
                label="선택 범위"
                sx={{
                    color: "#f5f5f5",
                    "& .MuiSelect-icon": {
                        color: "#aaa",
                    },
                }}
            >
                <MenuItem value="">선택 안함</MenuItem>
                {sortedRanges.map((range, index) => (
                    <MenuItem key={range.id} value={range.id}>
                        {`[${index + 1}] ${getFormatTime(range.start)} ~ ${getFormatTime(range.end)}`}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

// ===================== Timeline Ticks 컴포넌트 =====================
interface TimelineTicksProps {
    duration: number;
    timelineWidth: number;
    tickInterval: number;
}

const TimelineTicks: React.FC<TimelineTicksProps> = ({ duration, timelineWidth, tickInterval }) => {
    const [timeMarkers, setTimeMarkers] = useState<JSX.Element[]>([]);

    useEffect(() => {
        const markers = generateTimeMarkers();
        setTimeMarkers(markers);
    }, [duration, tickInterval]);

    const generateTimeMarkers = () => {
        const timeMarkers: JSX.Element[] = [];

        for (let i = 0; i <= duration; i += 60) {
            if (i + 60 > duration) i = duration;

            const isMajor = i % (tickInterval * 6) === 0 || i === duration;

            timeMarkers.push(
                <div
                    key={i}
                    className={`${styles.tick} ${isMajor ? styles.major : styles.minor}`}
                    style={{ left: `${(i * PIXELS_PER_SECOND) / (tickInterval * 0.04)}px` }}
                >
                    {isMajor && <span className={styles.timeLabel}>{getFormatTime(i)}</span>}
                </div>
            );
        }

        return timeMarkers;
    };

    return (
        <div className={styles.timeline_ticks} style={{ width: timelineWidth }}>
            {timeMarkers}
        </div>
    );
};

// ===================== Timeline 컴포넌트 =====================
interface TimelineProps {
    duration: number;
    player: Plyr | null;
    ranges: { id: string; start: number; end: number }[];
    setRanges: React.Dispatch<React.SetStateAction<{ id: string; start: number; end: number }[]>>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    setSelectedRangeId: React.Dispatch<React.SetStateAction<string | null>>;
    timelineWidth: number;
    selectedRangeId: string | null;
    timelineImages: { url: string; time: number }[];
    loading: boolean;
}

const Timeline: React.FC<TimelineProps> = ({
    duration,
    player,
    ranges,
    setRanges,
    canvasRef,
    setSelectedRangeId,
    timelineWidth,
    selectedRangeId,
    timelineImages,
    loading,
}) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [dragging, setDragging] = useState<boolean>(false);
    const [dragType, setDragType] = useState<"create" | "handle" | "move" | null>(null);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        document.addEventListener("mouseup", handleCanvasMouseUp);

        return () => {
            document.removeEventListener("mouseup", handleCanvasMouseUp);
        };
    }, [selectionRange]);

    useEffect(() => {
        if (draggingHandle) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [draggingHandle]);

    /** 캔버스 더블 클릭 시 해당 시간으로 이동 */
    const handleCanvasDoubleClick = (e: React.MouseEvent) => {
        // 기존 클릭 타이머 제거 (onMouseDown 실행 방지)
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
        }

        const canvas = e.target as HTMLCanvasElement;
        if (!canvas || !canvas.getBoundingClientRect) return;

        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const time = (mouseX / canvasRect.width) * duration;

        if (player) {
            player.currentTime = time;
            player.play();
        }
    };

    // --------------------- 선택 범위 드래그 관련 ---------------------

    /** 선택 범위 드래그 시작 */
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // 기존 타임아웃이 있다면 제거 (doubleClick 방지)
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
        }

        // 일정 시간 후에 실행하도록 설정
        clickTimeoutRef.current = setTimeout(() => {
            if (!isMatchingDragType("create")) return;
            e.preventDefault();
            setDragging(true);
            setDragType("create");
            const canvas = e.target as HTMLCanvasElement;
            const canvasRect = canvas.getBoundingClientRect();
            const startX = e.clientX - canvasRect.left;
            setDragStartX(startX);
            setSelectionRange(null);
        }, 250); // 250ms 내에 두 번째 클릭이 없으면 실행
    };

    /** 선택 범위 드래그 진행 */
    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!dragging || draggingHandle || !isMatchingDragType("create")) return;

        const canvas = e.target as HTMLCanvasElement;
        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;

        const start = Math.min(dragStartX, mouseX);
        const end = Math.max(dragStartX, mouseX);

        const startTime = (start / canvasRect.width) * duration;
        const endTime = (end / canvasRect.width) * duration;

        if (isOverlapping({ start: startTime, end: endTime })) return;

        setSelectionRange({ start: startTime, end: endTime });
    };

    /** 선택 범위 드래그 종료 */
    const handleCanvasMouseUp = () => {
        setDragging(false);
        setDragType(null);

        if (selectionRange) {
            setRanges((prevRanges) => [
                ...prevRanges,
                {
                    id: `range-${Date.now()}`,
                    start: selectionRange.start,
                    end: selectionRange.end,
                },
            ]);

            setSelectionRange(null);
        }
    };

    // --------------------- 선택 범위 핸들 드래그 관련 ---------------------

    /** 선택 범위 핸들 드래그 시작 */
    const handleMouseDownHandle = (rangeId: string, handleType: "start" | "end", event: React.MouseEvent) => {
        if (!isMatchingDragType("handle")) return;
        event.preventDefault();
        setDragging(true);
        setDragType("handle");
        setDraggingHandle(handleType);
        setDraggingId(rangeId);
    };

    /** 선택 범위 핸들 드래그 진행 */
    const handleMouseMove = (e: MouseEvent) => {
        if (!draggingHandle || !draggingId || !canvasRef.current || !isMatchingDragType("handle")) {
            return;
        }

        e.preventDefault();

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const newTime = (mouseX / canvasRect.width) * duration;

        const targetRange = ranges.find((range) => range.id === draggingId);
        if (!targetRange) return;

        const updatedRange = getUpdatedRange(targetRange, draggingHandle, newTime, duration);
        if (!updatedRange || isOverlapping(updatedRange, draggingId)) return;

        setRanges((prevRanges) => prevRanges.map((range) => (range.id === draggingId ? updatedRange : range)));

        setDraggingId(null);
    };

    /** 드래그된 핸들에 따라 범위를 업데이트하는 함수 */
    const getUpdatedRange = (
        range: { id: string; start: number; end: number },
        handle: "start" | "end",
        time: number,
        maxDuration: number
    ) => {
        if (handle === "start" && time < range.end) {
            return { ...range, start: Math.max(time, 0) };
        }
        if (handle === "end" && time > range.start) {
            return { ...range, end: Math.min(time, maxDuration) };
        }
        return null;
    };

    /** 선택 범위 핸들 드래그 종료 */
    const handleMouseUp = () => {
        setDragging(false);
        setDragType(null);
        setDraggingHandle(null);
    };

    // --------------------- 범위 드래그 관련 ---------------------

    /** 범위 드래그 시작 */
    const handleMouseRangeDown = (e: React.MouseEvent, rangeId: string) => {
        if (!canvasRef.current || !isMatchingDragType("move")) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const range = ranges.find((range) => range.id === rangeId);

        if (!range) return;
        setDragOffset(mouseX - (range.start / duration) * canvasRect.width);
        setDragging(true);
        setDragType("move");
    };

    /** 범위 드래그 진행 */
    const handleMouseRangeMove = (e: React.MouseEvent, rangeId: string) => {
        if (!canvasRef.current || !dragging || draggingHandle || !isMatchingDragType("move")) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const range = ranges.find((range) => range.id === rangeId);

        if (!range) return;

        const mouseX = e.clientX - canvasRect.left;
        const time = ((mouseX - dragOffset) / canvasRect.width) * duration;
        const rangeWidth = range.end - range.start;

        const newStart = Math.max(0, Math.min(time, duration - rangeWidth));
        const newEnd = newStart + rangeWidth;

        if (isOverlapping({ start: newStart, end: newEnd }, rangeId)) return;

        setRanges((prevRanges) =>
            prevRanges.map((prevRange) =>
                prevRange.id === rangeId ? { ...prevRange, start: newStart, end: newEnd } : prevRange
            )
        );
    };

    /** 범위 드래그 종료 */
    const handelMouseRangeUp = () => {
        setDragging(false);
        setDragType(null);
    };

    // --------------------- 기타 공통 함수 ---------------------

    /** 범위가 겹치는지 확인 */
    const isOverlapping = ({ start, end }: { start: number; end: number }, rangeId?: string): boolean => {
        return ranges.some((range) => {
            if (range.id === rangeId) return false;

            // 범위가 정확히 붙어있는 경우 허용
            if (Math.abs(range.end - start) < 0.1 || Math.abs(range.start - end) < 0.1) {
                return false;
            }

            return start < range.end && end > range.start;
        });
    };

    /** 드래그 타입이 일치하는지 확인 */
    const isMatchingDragType = (type: string): boolean => {
        return dragType === type || dragType === null;
    };

    return (
        <div className={styles.timeline} style={{ width: timelineWidth }}>
            {/* 마우스 이벤트를 위한 캔버스 */}
            <canvas
                ref={canvasRef}
                className={styles.timeline_canvas}
                style={{ width: timelineWidth }}
                onDoubleClick={handleCanvasDoubleClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
            />

            {/* 썸네일 렌더링 */}
            {loading ? (
                <Skeleton
                    variant="rectangular"
                    className={styles.timeline_thumbnails}
                    width={timelineWidth}
                    height={100}
                />
            ) : (
                <ThumbnailsRender timelineImages={timelineImages} />
            )}

            {/* 선택 범위 */}
            {!loading &&
                ranges.map((range) => {
                    const rangeWidth = (timelineWidth * (range.end - range.start)) / duration;

                    return (
                        <div
                            key={range.id}
                            className={styles.selection_range}
                            style={{
                                border: selectedRangeId === range.id ? "2px solid #0056b3" : "2px solid #cccccc",
                                left: `${(range.start / duration) * 100}%`,
                                width: `${((range.end - range.start) / duration) * 100}%`,
                            }}
                            onDoubleClick={() => setSelectedRangeId(range.id)}
                        >
                            {/* 범위 시간 표시 */}
                            <span
                                className={styles.range_time}
                                style={{ visibility: rangeWidth < 57 ? "hidden" : "visible" }}
                                onMouseDown={(e) => handleMouseRangeDown(e, range.id)}
                                onMouseMove={(e) => handleMouseRangeMove(e, range.id)}
                                onMouseUp={() => handelMouseRangeUp()}
                            >
                                {/* 범위 너비에 따라 시작 시간과 종료 시간 표시 형식 변경 */}
                                {rangeWidth < 117 ? (
                                    <Fragment>
                                        {getFormatTime(range.start)}
                                        <br />
                                        {getFormatTime(range.end)}
                                    </Fragment>
                                ) : (
                                    `${getFormatTime(range.start)} - ${getFormatTime(range.end)}`
                                )}
                            </span>
                            {/* 왼쪽 드래그 핸들 */}
                            <div
                                className={`${styles.handle} ${styles.start_handle}`}
                                style={{ left: 0 }}
                                onMouseDown={(e) => handleMouseDownHandle(range.id, "start", e)}
                            />
                            {/* 오른쪽 드래그 핸들 */}
                            <div
                                className={`${styles.handle} ${styles.end_handle}`}
                                style={{ right: 0 }}
                                onMouseDown={(e) => handleMouseDownHandle(range.id, "end", e)}
                            />
                        </div>
                    );
                })}

            {/* 선택 범위 드래그 */}
            {selectionRange && (
                <div
                    className={styles.selection_range}
                    style={{
                        left: `${(selectionRange.start / duration) * 100}%`,
                        width: `${((selectionRange.end - selectionRange.start) / duration) * 100}%`,
                    }}
                />
            )}
        </div>
    );
};

// ===================== Thumbnails Render 컴포넌트 =====================
interface ThumnailRenderProps {
    timelineImages: { url: string; time: number }[];
}

const ThumbnailsRender: React.FC<ThumnailRenderProps> = ({ timelineImages }) => {
    return (
        <div className={styles.timeline_thumbnails}>
            {timelineImages.map((thumbnail, index) => {
                const isLastIndex = index === timelineImages.length - 1;

                return (
                    <div key={index} className={styles.timeline_thumbnail}>
                        <img
                            src={thumbnail.url}
                            alt={`Screenshot at ${thumbnail.time}s`}
                            style={{ width: isLastIndex ? "100%" : "150px" }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

interface ControlsProps {
    ranges: { id: string; start: number; end: number }[];
    setRanges: React.Dispatch<React.SetStateAction<{ id: string; start: number; end: number }[]>>;
    setIsMerging: React.Dispatch<React.SetStateAction<boolean>>;
    mergedVideoRef: React.RefObject<HTMLVideoElement | null>;
    selectedRangeId: string | null;
    setSelectedRangeId: React.Dispatch<React.SetStateAction<string | null>>;
}

// ===================== Controls 컴포넌트 =====================
const Controls = ({
    ranges,
    setRanges,
    setIsMerging,
    mergedVideoRef,
    selectedRangeId,
    setSelectedRangeId,
}: ControlsProps) => {
    const [playerInstance, setPlayerInstance] = useState<Plyr | null>(null);
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
    const handleRangeDelete = () => {
        if (!selectedRangeId) {
            alert("삭제할 범위를 선택해 주세요.");
            return;
        }

        setRanges((prevRanges) => prevRanges.filter((range) => range.id !== selectedRangeId));
        setSelectedRangeId(null);
    };

    /** 선택 범위 초기화 */
    const handleRangeClear = () => {
        if (ranges.length === 0) {
            alert("존재하는 범위가 없습니다.");
            return;
        }
        setRanges([]);
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

        // 기존 플레이어 제거 처리
        resetExistingPlayer();

        // 썸네일용 쿼리 문자열 생성
        const query = encodeURIComponent(JSON.stringify(ranges));

        // Plyr 인스턴스 생성
        const player = new Plyr(mergedVideoRef.current, {
            autoplay: true,
            muted: true,
            previewThumbnails: {
                enabled: true,
                src: `${SERVER_API_URL}/api/thumbnail/vtt-merge?ranges=${query}`,
            },
            tooltips: { controls: true },
            keyboard: { global: true },
        });

        // 플레이어 준비 완료 시 HLS 로딩
        player.on("ready", () => {
            if (!mergedVideoRef.current) return;

            if (!Hls.isSupported()) {
                console.error("Hls.js를 지원하지 않는 브라우저입니다.");
                return;
            }

            const hls = new Hls();
            hls.loadSource(`${SERVER_API_URL}/api/updated_playlist.m3u8`);
            hls.attachMedia(mergedVideoRef.current);
            player.play();
        });

        setPlayerInstance(player);
    };

    /** 기존 플레이어 인스턴스를 제거하는 함수 */
    const resetExistingPlayer = () => {
        if (!playerInstance) return;

        playerInstance.destroy();

        const videoElement = document.getElementById("merge_video") as HTMLVideoElement;
        if (videoElement) {
            mergedVideoRef.current = videoElement;
        }

        setPlayerInstance(null);
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

    return (
        <div className={styles.controls}>
            <button onClick={handleRangeClear}>Clear</button>
            <button onClick={handleRangeDelete}>Delete</button>
            <button className={styles.btn_main} onClick={handleMerge}>
                Merge
            </button>
        </div>
    );
};

// ===================== Timeline Marker 컴포넌트 =====================
interface TimelineMarkerProps {
    player: Plyr | null;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    progressRef: React.RefObject<HTMLDivElement | null>;
    currentTimeRef: React.RefObject<number>;
    currentTime: number;
    loading: boolean;
    duration: number;
    setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
    draggingMarker: boolean;
    setDraggingMarker: React.Dispatch<React.SetStateAction<boolean>>;
}

const TimelineMarker: React.FC<TimelineMarkerProps> = ({
    player,
    canvasRef,
    progressRef,
    currentTimeRef,
    currentTime,
    loading,
    duration,
    setCurrentTime,
    draggingMarker,
    setDraggingMarker,
}) => {
    /** 마커 드래그 시작 */
    const handleProgressMouseDown = () => {
        setDraggingMarker(true);

        document.addEventListener("mousemove", handleProgressMouseMove);
        document.addEventListener("mouseup", handleProgressMouseUp);
    };

    /** 마커 드래그 진행 */
    const handleProgressMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        let mouseX = e.clientX - canvasRect.left;

        // 마커가 canvas의 범위를 벗어나지 않도록 제한
        if (mouseX < 0) mouseX = 0;
        if (mouseX > canvasRect.width) mouseX = canvasRect.width;

        const newTime = (mouseX / canvasRect.width) * duration;
        currentTimeRef.current = newTime;
        setCurrentTime(newTime);
    };

    /** 마커 드래그 종료 */
    const handleProgressMouseUp = () => {
        if (!player) return;

        player.currentTime = currentTimeRef.current;
        setCurrentTime(currentTimeRef.current);
        setDraggingMarker(false);

        document.removeEventListener("mousemove", handleProgressMouseMove);
        document.removeEventListener("mouseup", handleProgressMouseUp);
    };

    return (
        <Fragment>
            {!loading && (
                <div
                    ref={progressRef}
                    className={styles.timeline_marker}
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                    onMouseDown={handleProgressMouseDown}
                >
                    {draggingMarker && <div className={styles.current_time}>{getFormatTime(currentTime)}</div>}
                </div>
            )}
        </Fragment>
    );
};

// ===================== Timeline Slider 컴포넌트 =====================
interface TimelineSliderProps {
    onChnageSlider: (event: Event, newValue: number | number[]) => void;
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({ onChnageSlider }) => {
    return (
        <div className={styles.timeline_slider}>
            <Slider
                aria-label="Restricted values"
                defaultValue={50}
                step={null}
                valueLabelDisplay="auto"
                onChange={onChnageSlider}
                marks={sliderMarks}
                sx={{
                    "& .MuiSlider-rail": {
                        backgroundColor: "#ccc",
                    },
                    "& .MuiSlider-mark": {
                        backgroundColor: "#fff",
                    },
                    "& .MuiSlider-markActive": {
                        backgroundColor: "#0056b3",
                    },
                    "& .MuiSlider-markLabel": {
                        color: "#fff",
                    },
                    "& .MuiSlider-markLabelActive": {
                        color: "#007bff",
                    },
                    "& .MuiSlider-valueLabel": {
                        display: "none",
                    },
                }}
            />
        </div>
    );
};
