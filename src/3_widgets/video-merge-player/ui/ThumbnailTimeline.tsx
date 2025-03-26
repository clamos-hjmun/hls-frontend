import React, { useState, useEffect, useRef } from "react";
import style from "./ThumbnailTimeline.module.scss";

interface ThumbnailTimelineProps {
    duration: number;
    player: Plyr | null;
    ranges: { id: string; start: number; end: number }[];
    setRanges: React.Dispatch<React.SetStateAction<{ id: string; start: number; end: number }[]>>;
    selectedRangeId: string | null;
    setSelectedRangeId: React.Dispatch<React.SetStateAction<string | null>>;
}

const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL;

export const ThumbnailTimeline = ({
    duration,
    player,
    ranges,
    setRanges,
    selectedRangeId,
    setSelectedRangeId,
}: ThumbnailTimelineProps) => {
    const [timelineImages, setTimelineImagesState] = useState<{ url: string; time: number }[]>([]);
    const [dragging, setDragging] = useState<boolean>(false);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (duration === 0) return;

        const updateTimeLine = () => {
            drawCurrentTimeLine();
            requestAnimationFrame(updateTimeLine);
        };

        generateTimeline();
        requestAnimationFrame(updateTimeLine);
    }, [duration]);

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

    /** 현재 시간 라인 그리기 */
    const drawCurrentTimeLine = () => {
        if (!canvasRef.current || !player) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        const currentTime = player.currentTime;
        const canvasWidth = canvas.width;
        const lineX = (currentTime / duration) * canvasWidth;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        context.moveTo(lineX, 0);
        context.lineTo(lineX, canvas.height);
        context.strokeStyle = "red";
        context.lineWidth = 0.5;
        context.stroke();
    };

    /** 썸네일 생성 */
    const generateTimeline = async () => {
        if (!player) return;

        try {
            const imagePaths = await getThumbnailPaths(duration);
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
        } catch (error) {
            console.error("Failed to generate timeline:", error);
        } finally {
            player.currentTime = 0;
        }
    };

    /** 썸네일 이미지 경로 가져오기 */
    const getThumbnailPaths = async (duration: number): Promise<{ url: string; time: number }[]> => {
        const response = await fetch(`${SERVER_API_URL}/api/create/thumbnail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duration }),
        });

        const data = await response.json();
        return data.imagePaths;
    };

    /** 캔버스 더블 클릭 시 해당 시간으로 이동 */
    const handleCanvasDoubleClick = (e: React.MouseEvent) => {
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

    /** 선택 범위 드래그 시작 */
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(true);
        const canvas = e.target as HTMLCanvasElement;
        const canvasRect = canvas.getBoundingClientRect();
        const startX = e.clientX - canvasRect.left;
        setDragStartX(startX);
        setSelectionRange(null);
    };

    /** 선택 범위 드래그 진행 */
    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!dragging || draggingHandle) return;

        const canvas = e.target as HTMLCanvasElement;
        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;

        const start = Math.min(dragStartX, mouseX);
        const end = Math.max(dragStartX, mouseX);

        const startTime = (start / canvasRect.width) * duration;
        const endTime = (end / canvasRect.width) * duration;

        setSelectionRange({ start: startTime, end: endTime });
    };

    /** 선택 범위 드래그 종료 */
    const handleCanvasMouseUp = () => {
        setDragging(false);

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

    /** 선택 범위 핸들 드래그 시작 */
    const handleMouseDownHandle = (rangeId: string, handleType: "start" | "end", event: React.MouseEvent) => {
        event.preventDefault();
        setDragging(true);
        setDraggingHandle(handleType);
        setSelectedRangeId(rangeId);
    };

    /** 선택 범위 핸들 드래그 진행 */
    const handleMouseMove = (e: MouseEvent) => {
        if (!draggingHandle || !selectedRangeId || !canvasRef.current) return;

        e.preventDefault();

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const time = (mouseX / canvasRect.width) * duration;

        if (isOverlapping({ start: time, end: time }, selectedRangeId)) return;

        // 선택된 범위 찾아서 드래그 시작/끝 위치를 수정
        setRanges((prevRanges) =>
            prevRanges.map((range) => {
                if (range.id === selectedRangeId) {
                    if (draggingHandle === "start" && time < range.end) {
                        return { ...range, start: Math.max(time, 0) };
                    } else if (draggingHandle === "end" && time > range.start) {
                        return { ...range, end: Math.min(time, duration) };
                    }
                }
                return range;
            })
        );

        setSelectedRangeId(null);
    };

    /** 선택 범위 핸들 드래그 종료 */
    const handleMouseUp = () => {
        setDragging(false);
        setDraggingHandle(null);
    };

    /** 범위가 겹치는지 확인 */
    const isOverlapping = ({ start, end }: { start: number; end: number }, rangeId?: string): boolean => {
        return ranges.some((range) => {
            if (rangeId && range.id === rangeId) return false;
            return start < range.end && end > range.start;
        });
    };

    /** 시간 포맷 변환 */
    const formatTime = (time: number): string => {
        // 60초 이상일 경우 분 단위로 변환
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);

        const formattedHours = hours.toString().padStart(2, "0");
        const formattedMinutes = minutes.toString().padStart(2, "0");
        const formattedSeconds = seconds.toString().padStart(2, "0");

        if (time === 0) {
            return "00:00";
        }

        if (hours > 0) {
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        } else if (minutes > 0) {
            return `${formattedMinutes}:${formattedSeconds}`;
        } else {
            return formattedSeconds;
        }
    };

    return (
        <div className={style.timeline_container}>
            {timelineImages.map((thumbnail, index) => {
                return (
                    <div key={index} className={style.timeline_thumbnail}>
                        <img src={thumbnail.url} alt={`Screenshot at ${thumbnail.time}s`} />
                        <div className={style.timestamp}>{formatTime(thumbnail.time)}</div>
                    </div>
                );
            })}
            <canvas
                ref={canvasRef}
                className={style.timeline_canvas}
                width={160}
                height={90}
                onDoubleClick={handleCanvasDoubleClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
            />
            {ranges.map((range) => (
                <div
                    key={range.id}
                    className={style.selection_range}
                    style={{
                        border: selectedRangeId === range.id ? "2px solid #0056b3" : "2px solid rgb(204, 204, 204)",
                        left: `${(range.start / duration) * 100}%`,
                        width: `${((range.end - range.start) / duration) * 100}%`,
                    }}
                    onDoubleClick={() => setSelectedRangeId(range.id)}
                >
                    <span
                        className={style.range_time}
                        style={{
                            display: (range.end - range.start) / duration < 0.1 ? "none" : "flex",
                        }}
                    >
                        {(range.end - range.start) / duration < 0.15 ? (
                            <div>
                                {formatTime(range.start)}
                                <br />
                                {formatTime(range.end)}
                            </div>
                        ) : (
                            `${formatTime(range.start)} - ${formatTime(range.end)}`
                        )}
                    </span>
                    <div
                        className={`${style.handle} ${style.start_handle}`}
                        style={{ left: 0 }}
                        onMouseDown={(e) => handleMouseDownHandle(range.id, "start", e)}
                    />
                    <div
                        className={`${style.handle} ${style.end_handle}`}
                        style={{ right: 0 }}
                        onMouseDown={(e) => handleMouseDownHandle(range.id, "end", e)}
                    />
                </div>
            ))}
            {selectionRange && (
                <div
                    className={style.selection_range}
                    style={{
                        left: `${(selectionRange.start / duration) * 100}%`,
                        width: `${((selectionRange.end - selectionRange.start) / duration) * 100}%`,
                    }}
                />
            )}
        </div>
    );
};
