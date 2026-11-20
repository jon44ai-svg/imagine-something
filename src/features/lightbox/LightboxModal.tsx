import { Compare } from '@gfazioli/mantine-compare';
import { Mask } from '@gfazioli/mantine-mask';
import { Lightbox, type LightboxSlideData } from '@mantine/lightbox';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconColumns,
  IconDownload,
  IconFaceId,
  IconFocus2,
  IconLayoutColumns,
  IconLink,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useServices } from '../../app/ServicesContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import { formatDuration } from '../../utils/duration';
import { useImageZoom } from '../media/useImageZoom';
import { ZoomableImage } from '../media/ZoomableImage';

const COMPARE_ANGLES = [0, 45, 90] as const;

export function LightboxModal() {
  const { exportSingleOutput } = useServices();
  const { inputs, outputs, getObjectUrl, removeOutput } = useQueueData();
  const { settings } = useSettings();
  const {
    activeOutputId,
    activeInputId,
    viewMode,
    openLightbox,
    closeLightbox,
    toggleCompare,
    setViewMode,
    goPrev,
    goNext,
  } = useLightbox();

  const [syncZoom, setSyncZoom] = useState(true);
  const [loupeEnabled, setLoupeEnabled] = useState(false);
  const [compareHover, setCompareHover] = useState(false);
  const [compareAngleIdx, setCompareAngleIdx] = useState(0);

  const activeIdx = activeOutputId ? outputs.findIndex((o) => o.id === activeOutputId) : -1;
  const activeOutput = activeIdx >= 0 ? outputs[activeIdx] : null;
  const standaloneInput =
    !activeOutput && activeInputId ? inputs.find((i) => i.id === activeInputId) ?? null : null;
  const originalInput = activeOutput
    ? inputs.find((i) => i.id === activeOutput.inputId)
    : undefined;

  const isOpen = Boolean(activeOutput || standaloneInput);

  const primarySrc = activeOutput
    ? getObjectUrl(activeOutput.id, activeOutput.blob, activeOutput.imageURL)
    : standaloneInput
      ? getObjectUrl(standaloneInput.id, standaloneInput.blob)
      : '';
  const primaryCacheKey = activeOutput
    ? `out:${activeOutput.id}`
    : standaloneInput
      ? `in:${standaloneInput.id}`
      : undefined;

  const origSrc = originalInput ? getObjectUrl(originalInput.id, originalInput.blob) : '';

  const primaryZoom = useImageZoom({
    imageSrc: primarySrc,
    cacheKey: primaryCacheKey,
  });

  const origZoom = useImageZoom({
    imageSrc: origSrc,
    cacheKey: originalInput ? `in:${originalInput.id}` : undefined,
  });

  useEffect(() => {
    if (activeOutputId && activeIdx === -1) {
      closeLightbox();
    }
  }, [activeOutputId, activeIdx, closeLightbox]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      else if (event.key === 'ArrowLeft' && activeOutput) goPrev();
      else if (event.key === 'ArrowRight' && activeOutput) goNext();
      else if (event.key === '+' || event.key === '=') primaryZoom.zoomIn();
      else if (event.key === '-') primaryZoom.zoomOut();
      else if (event.key === '0') {
        primaryZoom.resetZoom();
        origZoom.resetZoom();
      } else if (event.key.toLowerCase() === 'f') {
        void primaryZoom.toggleFaceFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeOutput, closeLightbox, goPrev, goNext, primaryZoom, origZoom]);

  const showSideBySide = Boolean(activeOutput && viewMode === 'side-by-side' && originalInput);
  const showSliderCompare = Boolean(activeOutput && viewMode === 'slider' && originalInput);
  const compareAngle = COMPARE_ANGLES[compareAngleIdx];

  const durationBadge =
    settings.showGenerationTime && activeOutput && typeof activeOutput.durationMs === 'number' ? (
      <Badge
        size="sm"
        variant="filled"
        color="dark"
        className="cyber-mono"
        leftSection={<IconClock size={12} />}
        style={{ backgroundColor: 'rgba(8, 13, 24, 0.85)' }}
      >
        {formatDuration(activeOutput.durationMs)}
      </Badge>
    ) : undefined;

  const slides = useMemo<LightboxSlideData[]>(() => {
    if (standaloneInput) {
      return [
        {
          type: 'custom',
          thumbSrc: primarySrc,
          render: () => (
            <Box w="100%" maw={1100} h="66vh" px="md" style={{ borderRadius: 10, overflow: 'hidden' }}>
              <ZoomableImage
                src={primarySrc}
                alt="Original"
                fit="contain"
                height="66vh"
                transform={primaryZoom.transform}
                onWheelZoom={primaryZoom.applyWheelZoom}
                onPanByPixels={primaryZoom.panByPixels}
                onDoubleClick={primaryZoom.toggleQuickZoom}
              />
            </Box>
          ),
        },
      ];
    }

    return outputs.map((out) => {
      const slideSrc = getObjectUrl(out.id, out.blob, out.imageURL);
      return {
        type: 'custom',
        thumbSrc: slideSrc,
        render: ({ active }) => {
          if (!active || out.id !== activeOutput?.id) {
            return (
              <Box
                w="100%"
                maw={1100}
                h="66vh"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img
                  src={slideSrc}
                  alt={out.inputName}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </Box>
            );
          }

          if (showSliderCompare && originalInput) {
            return (
              <Box
                w="100%"
                maw={1040}
                h="66vh"
                px="md"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Box w="100%" h="100%" style={{ maxWidth: 960 }}>
                  <Compare
                    variant={compareHover ? 'hover' : 'drag'}
                    angle={compareAngle}
                    sliderColor="cyan"
                    sliderWidth={3}
                    radius="md"
                    leftLabel="Original Input"
                    rightLabel="Generated Output"
                    h="100%"
                    leftSection={
                      <img
                        src={origSrc}
                        alt="Original"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          background: '#050811',
                        }}
                      />
                    }
                    rightSection={
                      <img
                        src={primarySrc}
                        alt="Generated"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          background: '#050811',
                        }}
                      />
                    }
                  />
                </Box>
              </Box>
            );
          }

          if (showSideBySide && originalInput) {
            return (
              <Box w="100%" maw={1280} px="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Stack gap="xs" align="center">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                      Original Input
                    </Text>
                    <Box w="100%" h="62vh" style={{ borderRadius: 8, overflow: 'hidden' }}>
                      <ZoomableImage
                        src={origSrc}
                        alt="Original"
                        fit="contain"
                        height="62vh"
                        transform={syncZoom ? primaryZoom.transform : origZoom.transform}
                        onWheelZoom={syncZoom ? primaryZoom.applyWheelZoom : origZoom.applyWheelZoom}
                        onPanByPixels={syncZoom ? primaryZoom.panByPixels : origZoom.panByPixels}
                        onDoubleClick={
                          syncZoom ? primaryZoom.toggleQuickZoom : origZoom.toggleQuickZoom
                        }
                      />
                    </Box>
                  </Stack>

                  <Stack gap="xs" align="center">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                      Generated Output
                    </Text>
                    <Box w="100%" h="62vh" style={{ borderRadius: 8, overflow: 'hidden' }}>
                      <ZoomableImage
                        src={primarySrc}
                        alt="Generated"
                        fit="contain"
                        height="62vh"
                        transform={primaryZoom.transform}
                        bottomLeftOverlay={durationBadge}
                        onWheelZoom={primaryZoom.applyWheelZoom}
                        onPanByPixels={primaryZoom.panByPixels}
                        onDoubleClick={primaryZoom.toggleQuickZoom}
                      />
                    </Box>
                  </Stack>
                </SimpleGrid>
              </Box>
            );
          }

          const zoomView = (
            <ZoomableImage
              src={primarySrc}
              alt="Generated"
              fit="contain"
              height="66vh"
              transform={primaryZoom.transform}
              bottomLeftOverlay={durationBadge}
              onWheelZoom={primaryZoom.applyWheelZoom}
              onPanByPixels={primaryZoom.panByPixels}
              onDoubleClick={primaryZoom.toggleQuickZoom}
            />
          );

          return (
            <Box w="100%" maw={1100} h="66vh" px="md" style={{ borderRadius: 10, overflow: 'hidden' }}>
              {loupeEnabled ? (
                <Mask
                  withCursorMask
                  maskRadius={145}
                  maskFeather={28}
                  maskOpacity={1}
                  maskSmoothing
                  radius="md"
                  h="100%"
                >
                  {zoomView}
                </Mask>
              ) : (
                zoomView
              )}
            </Box>
          );
        },
      };
    });
  }, [
    standaloneInput,
    outputs,
    getObjectUrl,
    activeOutput,
    showSliderCompare,
    showSideBySide,
    originalInput,
    compareHover,
    compareAngle,
    origSrc,
    primarySrc,
    syncZoom,
    primaryZoom,
    origZoom,
    durationBadge,
    loupeEnabled,
  ]);

  if (!isOpen) return null;

  const zoomPercent = Math.round(primaryZoom.transform.scale * 100);
  const currentSlideIndex = standaloneInput ? 0 : Math.max(0, activeIdx);

  const faceButtonLabel = primaryZoom.faceFocusActive
    ? primaryZoom.faceResult && primaryZoom.faceResult.boxes.length > 1
      ? `Face ${primaryZoom.activeFaceIndex + 1}/${primaryZoom.faceResult.boxes.length}`
      : 'Focus Face: On'
    : 'Focus Face';

  const metaParts: string[] = activeOutput
    ? [
        activeOutput.model,
        `${activeOutput.width}x${activeOutput.height}`,
        activeOutput.format,
        ...(typeof activeOutput.durationMs === 'number'
          ? [formatDuration(activeOutput.durationMs)]
          : []),
        ...(activeOutput.seed !== null && activeOutput.seed !== undefined
          ? [`Seed: ${activeOutput.seed}`]
          : []),
        ...(typeof activeOutput.cost === 'number' ? [`$${activeOutput.cost.toFixed(4)}`] : []),
      ]
    : standaloneInput
      ? [
          standaloneInput.width && standaloneInput.height
            ? `${standaloneInput.width}x${standaloneInput.height}`
            : 'Unknown size',
          standaloneInput.type,
        ]
      : [];

  const handleDelete = async () => {
    if (!activeOutput) return;
    const id = activeOutput.id;
    closeLightbox();
    await removeOutput(id);
  };

  const handleResetAllZoom = () => {
    primaryZoom.resetZoom();
    origZoom.resetZoom();
  };

  const handleIndexChange = (nextIdx: number) => {
    if (standaloneInput) return;
    const target = outputs[nextIdx];
    if (target && target.id !== activeOutputId) {
      openLightbox(target.id);
    }
  };

  return (
    <Lightbox.Root
      opened={isOpen}
      onClose={closeLightbox}
      slides={slides}
      currentIndex={currentSlideIndex}
      onIndexChange={handleIndexChange}
      withThumbnails={slides.length > 1}
      withKeyboardEvents={false}
      closeOnSwipeDown={false}
      emblaOptions={{ watchDrag: false }}
    >
      <Stack
        gap="xs"
        h="100%"
        w="100%"
        p="sm"
        justify="space-between"
        style={{
          background:
            'radial-gradient(circle at 50% 10%, rgba(14, 24, 42, 0.96), rgba(4, 7, 13, 0.98))',
        }}
      >
        {/* Top Futuristic HUD Toolbar */}
        <Group
          justify="space-between"
          gap="xs"
          wrap="wrap"
          px="sm"
          py={8}
          className="cyber-hud-pill"
          style={{ borderRadius: 10 }}
        >
          <Group gap="xs" wrap="wrap">
            <Text fw={700} size="sm" className="cyber-mono">
              {activeOutput
                ? `${activeOutput.inputName} (${activeIdx + 1} / ${outputs.length})`
                : `${standaloneInput?.name} (Original Input)`}
            </Text>

            {!showSliderCompare && (
              <Group gap={4} wrap="wrap">
                <Tooltip label="Zoom out (-)">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    aria-label="Lightbox zoom out"
                    disabled={!primaryZoom.isZoomed}
                    onClick={primaryZoom.zoomOut}
                  >
                    <IconZoomOut size={14} />
                  </ActionIcon>
                </Tooltip>
                <Badge
                  variant="default"
                  size="md"
                  className="cyber-mono"
                  style={{ cursor: 'pointer' }}
                  onClick={handleResetAllZoom}
                  title="Click to reset zoom (0)"
                >
                  {zoomPercent}%
                </Badge>
                <Tooltip label="Zoom in (+)">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    aria-label="Lightbox zoom in"
                    onClick={primaryZoom.zoomIn}
                  >
                    <IconZoomIn size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Reset zoom (0)">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    aria-label="Lightbox reset zoom"
                    disabled={!primaryZoom.isZoomed && !origZoom.isZoomed}
                    onClick={handleResetAllZoom}
                  >
                    <IconZoomReset size={14} />
                  </ActionIcon>
                </Tooltip>
                <Button
                  size="xs"
                  variant={primaryZoom.faceFocusActive ? 'filled' : 'default'}
                  color={primaryZoom.faceFocusActive ? 'cyan' : undefined}
                  leftSection={<IconFaceId size={14} />}
                  loading={primaryZoom.isDetectingFace}
                  onClick={() => void primaryZoom.toggleFaceFocus()}
                >
                  {faceButtonLabel}
                </Button>
                {activeOutput && viewMode === 'inspect' && (
                  <Button
                    size="xs"
                    variant={loupeEnabled ? 'filled' : 'default'}
                    color={loupeEnabled ? 'violet' : undefined}
                    leftSection={<IconFocus2 size={14} />}
                    onClick={() => setLoupeEnabled((prev) => !prev)}
                  >
                    {loupeEnabled ? 'Loupe: On' : 'Loupe'}
                  </Button>
                )}
              </Group>
            )}

            {showSideBySide && (
              <Button
                size="xs"
                variant={syncZoom ? 'light' : 'default'}
                leftSection={<IconLink size={14} />}
                onClick={() => setSyncZoom((prev) => !prev)}
              >
                {syncZoom ? 'Sync Zoom: On' : 'Sync Zoom: Off'}
              </Button>
            )}

            {showSliderCompare && (
              <Group gap={4}>
                <Button
                  size="xs"
                  variant={compareHover ? 'light' : 'default'}
                  onClick={() => setCompareHover((prev) => !prev)}
                >
                  {compareHover ? 'Mode: Hover' : 'Mode: Drag'}
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  className="cyber-mono"
                  onClick={() => setCompareAngleIdx((prev) => (prev + 1) % COMPARE_ANGLES.length)}
                >
                  Angle: {compareAngle}&deg;
                </Button>
              </Group>
            )}
          </Group>

          <Group gap="xs" wrap="wrap">
            {activeOutput && (
              <>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconChevronLeft size={14} />}
                  disabled={activeIdx <= 0}
                  onClick={goPrev}
                >
                  Prev
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  rightSection={<IconChevronRight size={14} />}
                  disabled={activeIdx >= outputs.length - 1}
                  onClick={goNext}
                >
                  Next
                </Button>
                <Button
                  size="xs"
                  variant={showSliderCompare ? 'filled' : 'default'}
                  color={showSliderCompare ? 'cyan' : undefined}
                  leftSection={<IconLayoutColumns size={14} />}
                  disabled={!originalInput}
                  onClick={() => setViewMode(showSliderCompare ? 'inspect' : 'slider')}
                >
                  {showSliderCompare ? 'Compare Slider: On' : 'Compare Slider'}
                </Button>
                <Button
                  size="xs"
                  variant={showSideBySide ? 'filled' : 'default'}
                  leftSection={<IconColumns size={14} />}
                  disabled={!originalInput}
                  onClick={toggleCompare}
                >
                  {!originalInput
                    ? 'Original Removed'
                    : showSideBySide
                      ? 'Side-by-Side: On'
                      : 'Side-by-Side: Off'}
                </Button>
                <Button
                  size="xs"
                  color="teal"
                  variant="light"
                  leftSection={<IconDownload size={14} />}
                  onClick={() => void exportSingleOutput.execute(activeOutput)}
                >
                  Download
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
              </>
            )}
            <Lightbox.CloseButton />
          </Group>
        </Group>

        {/* Native @mantine/lightbox Slides Viewport */}
        <Box style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <Lightbox.Slides>
            {slides.map((slide, index) => (
              <Lightbox.Slide key={index} slide={slide} index={index} />
            ))}
          </Lightbox.Slides>
        </Box>

        {/* Thumbnails + Metadata HUD Footer */}
        <Stack gap={6}>
          {slides.length > 1 && <Lightbox.Thumbnails />}
          <Group
            justify="space-between"
            gap="sm"
            wrap="wrap"
            px="sm"
            py={6}
            className="cyber-hud-pill"
            style={{ borderRadius: 8 }}
          >
            <Text size="xs" c="dimmed" truncate maw={640} title={activeOutput?.prompt || ''}>
              {activeOutput?.prompt
                ? `Prompt: ${activeOutput.prompt}`
                : 'Scroll to zoom, drag to pan, double-click or press F to focus face'}
            </Text>
            <Text size="xs" c="dimmed" className="cyber-mono">
              {metaParts.filter(Boolean).join(' | ')}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Lightbox.Root>
  );
}
