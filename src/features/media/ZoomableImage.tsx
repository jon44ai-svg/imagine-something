import { ActionIcon, Badge, Box, Group, Loader, Tooltip } from '@mantine/core';
import {
  IconFaceId,
  IconMaximize,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from '@tabler/icons-react';
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';
import type { ImageZoomTransform } from '../../domain/models';

export interface ZoomableImageProps {
  src: string;
  alt: string;
  transform: ImageZoomTransform;
  fit?: 'cover' | 'contain';
  height?: CSSProperties['height'];
  maxHeight?: CSSProperties['maxHeight'];
  aspectRatio?: CSSProperties['aspectRatio'];
  loading?: 'lazy' | 'eager';
  faceFocusActive?: boolean;
  isDetectingFace?: boolean;
  faceBadgeText?: string | null;
  showOverlayControls?: boolean;
  compactControls?: boolean;
  topLeftOverlay?: ReactNode;
  bottomLeftOverlay?: ReactNode;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onToggleFaceFocus?: () => void;
  onWheelZoom?: (deltaY: number) => void;
  onPanByPixels?: (dx: number, dy: number, viewportW: number, viewportH: number) => void;
  onImageClick?: () => void;
  onExpandClick?: () => void;
  onDoubleClick?: () => void;
}

export function ZoomableImage({
  src,
  alt,
  transform,
  fit = 'cover',
  height = '100%',
  maxHeight,
  aspectRatio,
  loading = 'lazy',
  faceFocusActive = false,
  isDetectingFace = false,
  faceBadgeText,
  showOverlayControls = false,
  compactControls = false,
  topLeftOverlay,
  bottomLeftOverlay,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFaceFocus,
  onWheelZoom,
  onPanByPixels,
  onImageClick,
  onExpandClick,
  onDoubleClick,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isZoomed = transform.scale > 1.01;
  const zoomPercent = Math.round(transform.scale * 100);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!onWheelZoom) return;
    // Only capture wheel zoom when zoomed in or holding Ctrl/Meta, or in full viewer mode (!compactControls)
    if (!compactControls || isZoomed || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      onWheelZoom(event.deltaY);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isZoomed || !onPanByPixels) return;
    if ((event.target as HTMLElement).closest('button')) return;
    dragOriginRef.current = { x: event.clientX, y: event.clientY, moved: false };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current || !onPanByPixels || !containerRef.current) return;
    const dx = event.clientX - dragOriginRef.current.x;
    const dy = event.clientY - dragOriginRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragOriginRef.current.moved = true;
    }
    dragOriginRef.current.x = event.clientX;
    dragOriginRef.current.y = event.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    onPanByPixels(dx, dy, rect.width || 1, rect.height || 1);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setTimeout(() => {
      dragOriginRef.current = null;
    }, 0);
  };

  const handleClick = () => {
    if (dragOriginRef.current?.moved) return;
    if (onImageClick) onImageClick();
  };

  return (
    <Box
      ref={containerRef}
      pos="relative"
      w="100%"
      h={height}
      mah={maxHeight}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onDoubleClick?.();
      }}
      style={{
        aspectRatio,
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: isZoomed ? 'none' : 'auto',
        cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : onImageClick ? 'zoom-in' : 'default',
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          maxHeight: typeof maxHeight === 'string' || typeof maxHeight === 'number' ? maxHeight : undefined,
          objectFit: fit,
          display: 'block',
          transformOrigin: 'center center',
          transform: `scale(${transform.scale}) translate(${transform.offsetX}%, ${transform.offsetY}%)`,
          transition: isDragging ? 'none' : 'transform 180ms ease-out',
          willChange: 'transform',
        }}
      />

      {topLeftOverlay && (
        <Box pos="absolute" top={4} left={4} style={{ zIndex: 2 }}>
          {topLeftOverlay}
        </Box>
      )}

      {bottomLeftOverlay && (
        <Box pos="absolute" bottom={4} left={4} style={{ zIndex: 2 }}>
          {bottomLeftOverlay}
        </Box>
      )}

      {(isZoomed || faceBadgeText) && showOverlayControls && (
        <Group pos="absolute" bottom={4} right={4} gap={4} style={{ zIndex: 2 }}>
          {faceBadgeText && (
            <Badge size="xs" color="indigo" variant="filled">
              {faceBadgeText}
            </Badge>
          )}
          {isZoomed && (
            <Badge size="xs" color="dark" variant="filled">
              {zoomPercent}%
            </Badge>
          )}
        </Group>
      )}

      {showOverlayControls && (
        <Group
          pos="absolute"
          top={4}
          right={4}
          gap={3}
          style={{
            zIndex: 3,
            background: 'rgba(11, 13, 18, 0.72)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            padding: 2,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onToggleFaceFocus && (
            <Tooltip label={faceFocusActive ? 'Cycle / clear face focus' : 'Focus on face'}>
              <ActionIcon
                size={compactControls ? 20 : 'xs'}
                variant={faceFocusActive ? 'filled' : 'subtle'}
                color={faceFocusActive ? 'indigo' : 'gray'}
                aria-label="Focus on face"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFaceFocus();
                }}
              >
                {isDetectingFace ? (
                  <Loader size={10} color="white" />
                ) : (
                  <IconFaceId size={compactControls ? 12 : 14} />
                )}
              </ActionIcon>
            </Tooltip>
          )}

          {onZoomIn && (
            <Tooltip label="Zoom in">
              <ActionIcon
                size={compactControls ? 20 : 'xs'}
                variant="subtle"
                color="gray"
                aria-label="Zoom in"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomIn();
                }}
              >
                <IconZoomIn size={compactControls ? 12 : 14} />
              </ActionIcon>
            </Tooltip>
          )}

          {isZoomed && onZoomOut && (
            <Tooltip label="Zoom out">
              <ActionIcon
                size={compactControls ? 20 : 'xs'}
                variant="subtle"
                color="gray"
                aria-label="Zoom out"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomOut();
                }}
              >
                <IconZoomOut size={compactControls ? 12 : 14} />
              </ActionIcon>
            </Tooltip>
          )}

          {isZoomed && onResetZoom && (
            <Tooltip label="Reset zoom">
              <ActionIcon
                size={compactControls ? 20 : 'xs'}
                variant="subtle"
                color="gray"
                aria-label="Reset zoom"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetZoom();
                }}
              >
                <IconZoomReset size={compactControls ? 12 : 14} />
              </ActionIcon>
            </Tooltip>
          )}

          {onExpandClick && (
            <Tooltip label="Open full preview">
              <ActionIcon
                size={compactControls ? 20 : 'xs'}
                variant="subtle"
                color="gray"
                aria-label="Open full preview"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandClick();
                }}
              >
                <IconMaximize size={compactControls ? 12 : 14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      )}
    </Box>
  );
}
