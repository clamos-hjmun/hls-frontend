import { useState, useEffect } from "react";
import { MIN_ZOOM, MAX_ZOOM } from "../constants";

export const useZoomAndPan = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  minimapRef: React.RefObject<HTMLDivElement | null>,
  minimapViewportRef: React.RefObject<HTMLDivElement | null>
) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 최초 렌더링 시, 미니맵 영역 내에 위치를 조정
  useEffect(() => {
    if (minimapRef.current && minimapViewportRef.current) {
      setPosition((prevPos) => clampPosition(prevPos.x, prevPos.y));
    }
  }, []);

  // 줌에 따른 스크롤 핸들러 추가
  useEffect(() => {
    const container = containerRef.current;

    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [zoom]);

  // 드래그 상태 변경 시 마우스 이동 이벤트 리스너 설정
  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  /** 주어진 좌표가 미니맵 영역 내에 있도록 조정하는 함수 */
  const clampPosition = (x: number, y: number) => {
    const minimap = minimapRef.current;
    const minimapRect = minimapViewportRef.current;

    if (!minimap || !minimapRect) return { x, y };

    const maxX = Math.max(minimap.offsetWidth - minimapRect.offsetWidth, 0);
    const maxY = Math.max(minimap.offsetHeight - minimapRect.offsetHeight, 0);

    // x, y 좌표가 미니맵의 최대 범위를 벗어나지 않도록 조정
    return {
      x: Math.min(Math.max(x, 0), maxX),
      y: Math.min(Math.max(y, 0), maxY),
    };
  };

  /** 마우스 휠 이벤트 처리(줌 인/아웃) */
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 마우스 포인터의 위치 계산
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 줌 비율 계산 (줌 인/아웃)
    const zoomFactor = Math.min(Math.max(zoom - e.deltaY * 0.001, MIN_ZOOM), MAX_ZOOM);

    const minimapRect = minimapViewportRef.current;
    const minimap = minimapRef.current;

    if (!minimapRect || !minimap) return;

    // 미니맵 크기 및 확대 영역 크기 계산
    const minimapWidth = minimap.offsetWidth;
    const minimapHeight = minimap.offsetHeight;
    const minimapRectWidth = minimapRect.offsetWidth;
    const minimapRectHeight = minimapRect.offsetHeight;
    const minimapRectX = minimapRect.offsetLeft;
    const minimapRectY = minimapRect.offsetTop;

    // 마우스 위치를 기준으로 미니맵 확대 영역의 새 위치 계산
    const mouseXRatio = mouseX / rect.width;
    const mouseYRatio = mouseY / rect.height;

    const newMinimapRectWidth = minimapWidth / zoomFactor;
    const newMinimapRectHeight = minimapHeight / zoomFactor;

    const newMinimapRectX = minimapRectX - (newMinimapRectWidth - minimapRectWidth) * mouseXRatio;
    const newMinimapRectY = minimapRectY - (newMinimapRectHeight - minimapRectHeight) * mouseYRatio;

    const adjustedPosition = clampPosition(newMinimapRectX, newMinimapRectY);

    // 새로운 위치 및 줌 비율로 상태 업데이트
    setPosition(adjustedPosition);
    setZoom(zoomFactor);
  };

  /** 마우스가 미니맵 영역 내에 있는지 확인하는 함수 */
  const isCursorInMinimap = (e: MouseEvent): boolean => {
    const minimap = minimapRef.current;
    if (!minimap) return false;

    const { left, right, top, bottom } = minimap.getBoundingClientRect();
    return e.clientX >= left && e.clientX <= right && e.clientY >= top && e.clientY <= bottom;
  };

  /** 마우스 이동 시 팬 기능 처리 */
  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // 미니맵 영역 내외에 따라 팬 방향 결정
    const movementMultiplier = isCursorInMinimap(e) ? 1 : -0.1;
    const newX = position.x + movementMultiplier * deltaX;
    const newY = position.y + movementMultiplier * deltaY;

    // 새로운 위치로 상태 업데이트
    setPosition(clampPosition(newX, newY));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  /** 마우스 버튼을 떼면 드래그 종료 */
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /** 줌 및 팬 이동 처리 (IN/OUT/RESET 등) */
  const handleZoomMove = (type: "IN" | "OUT" | "RESET" | "UP" | "DOWN" | "LEFT" | "RIGHT") => {
    const moveFactor = 10; // 팬 이동 크기
    const zoomFactor = 0.1; // 줌 크기
    const newPosition = { ...position };

    // 각 동작에 따라 줌 및 팬 상태 변경
    switch (type) {
      case "IN":
        setZoom((prevZoom) => Math.min(prevZoom + zoomFactor, MAX_ZOOM));
        break;
      case "OUT":
        setZoom((prevZoom) => Math.max(prevZoom - zoomFactor, MIN_ZOOM));
        break;
      case "RESET":
        setZoom(1);
        newPosition.x = 0;
        newPosition.y = 0;
        break;
      case "UP":
        newPosition.y -= moveFactor;
        break;
      case "DOWN":
        newPosition.y += moveFactor;
        break;
      case "LEFT":
        newPosition.x -= moveFactor;
        break;
      case "RIGHT":
        newPosition.x += moveFactor;
        break;
    }

    // 새로운 위치로 상태 업데이트
    setPosition(clampPosition(newPosition.x, newPosition.y));
  };

  return { zoom, position, setIsDragging, setDragStart, handleZoomMove };
};
