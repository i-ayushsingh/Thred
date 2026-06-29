import { useState, useCallback, useEffect, useRef } from 'react';

// --- Time Utilities ---
export function formatRelativeTime(isoOrMs: string | number | undefined): string {
  if (!isoOrMs) return 'Just now';
  const ts = typeof isoOrMs === 'string' ? new Date(isoOrMs).getTime() : isoOrMs;
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / (7 * 86_400_000))}w ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


// --- Draggable Window Hook ---
export function useDraggable({
  position,
  setPosition,
  bounds
}: {
  position: { x: number; y: number } | null;
  setPosition: (pos: { x: number; y: number }) => void;
  bounds?: { left?: number; right?: number; top?: number; bottom?: number; width?: number; height?: number };
}) {
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent dragging if clicking a no-drag area or interactive element inside
    if ((e.target as HTMLElement).closest('.no-drag, button, input, textarea, select')) return;
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0)
    };
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    if (bounds) {
      if (bounds.left !== undefined) newX = Math.max(bounds.left, newX);
      if (bounds.right !== undefined) newX = Math.min(bounds.right - (bounds.width || 0), newX);
      if (bounds.top !== undefined) newY = Math.max(bounds.top, newY);
      if (bounds.bottom !== undefined) newY = Math.min(bounds.bottom - (bounds.height || 0), newY);
    }

    setPosition({ x: newX, y: newY });
  }, [setPosition, bounds]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return { handleMouseDown };
}
