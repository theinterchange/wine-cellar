"use client";

import { useRef, useState, useCallback } from "react";

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeAction: () => void;
  actionLabel: string;
  actionColor?: string;
}

const THRESHOLD = 80;
const MAX_SWIPE = 120;

export default function SwipeableRow({
  children,
  onSwipeAction,
  actionLabel,
  actionColor = "bg-red-500",
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentOffset = useRef(0);
  const locked = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = false;
    setSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = startX.current - e.touches[0].clientX;
    const dy = e.touches[0].clientY - startY.current;

    // If vertical movement dominates, don't swipe
    if (!locked.current && Math.abs(dy) > Math.abs(dx)) {
      setSwiping(false);
      return;
    }
    locked.current = true;

    const adjusted = Math.max(0, Math.min(MAX_SWIPE, dx + (currentOffset.current > 0 ? THRESHOLD : 0)));
    setOffset(adjusted);
  }, [swiping]);

  const onTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offset >= THRESHOLD) {
      currentOffset.current = THRESHOLD;
      setOffset(THRESHOLD);
    } else {
      currentOffset.current = 0;
      setOffset(0);
    }
  }, [offset]);

  const handleAction = useCallback(() => {
    setOffset(0);
    currentOffset.current = 0;
    onSwipeAction();
  }, [onSwipeAction]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action behind */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-center ${actionColor} text-white font-semibold text-sm`}
        style={{ width: MAX_SWIPE }}
      >
        <button onClick={handleAction} className="w-full h-full px-4">
          {actionLabel}
        </button>
      </div>

      {/* Foreground content */}
      <div
        className="relative bg-stone-50 z-10"
        style={{
          transform: `translateX(${-offset}px)`,
          transition: swiping ? "none" : "transform 0.25s ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
