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
    const [dragType, setDragType] = useState<"create" | "handle" | "move" | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
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
        if (!isMatchingDragType("create")) return;
        e.preventDefault();
        setDragging(true);
        setDragType("create");
        const canvas = e.target as HTMLCanvasElement;
        const canvasRect = canvas.getBoundingClientRect();
        const startX = e.clientX - canvasRect.left;
        setDragStartX(startX);
        setSelectionRange(null);
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
        setSelectedRangeId(null);
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
        setSelectedRangeId(null);
    };

    /** 범위 드래그 종료 */
    const handelMouseRangeUp = () => {
        setDragging(false);
        setDragType(null);
    };

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

    /** 드래그 타입이 일치하는지 확인 */
    const isMatchingDragType = (type: string): boolean => {
        return dragType === type || dragType === null;
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
                        style={{ visibility: (range.end - range.start) / duration < 0.1 ? "hidden" : "visible" }}
                        onMouseDown={(e) => handleMouseRangeDown(e, range.id)}
                        onMouseMove={(e) => handleMouseRangeMove(e, range.id)}
                        onMouseUp={() => handelMouseRangeUp()}
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
