import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
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
  IconLink,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useServices } from '../../app/ServicesContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import { formatDuration } from '../../utils/duration';
import { useImageZoom } from '../media/useImageZoom';
import { ZoomableImage } from '../media/ZoomableImage';

export function LightboxModal() {
  const { exportSingleOutput } = useServices();
  const { inputs, outputs, getObjectUrl, removeOutput } = useQueueData();
  const { settings } = useSettings();
  const {
    activeOutputId,
    activeInputId,
    compareEnabled,
    closeLightbox,
    toggleCompare,
    goPrev,
    goNext,
  } = useLightbox();

  const [syncZoom, setSyncZoom] = useState(true);

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

  if (!isOpen) return null;

  const showSideBySide = Boolean(activeOutput && compareEnabled && originalInput);
  const zoomPercent = Math.round(primaryZoom.transform.scale * 100);

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

  return (
    <Modal
      opened={isOpen}
      onClose={closeLightbox}
      size="90%"
      centered
      title={
        <Text fw={600} size="sm">
          {activeOutput
            ? `${activeOutput.inputName} (${activeIdx + 1} / ${outputs.length})`
            : `${standaloneInput?.name} (Original Input)`}
        </Text>
      }
    >
      <Stack gap="sm">
        <Group justify="space-between" gap="xs" wrap="wrap">
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
              color={primaryZoom.faceFocusActive ? 'indigo' : undefined}
              leftSection={<IconFaceId size={14} />}
              loading={primaryZoom.isDetectingFace}
              onClick={() => void primaryZoom.toggleFaceFocus()}
            >
              {faceButtonLabel}
            </Button>
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
          </Group>

          {activeOutput && (
            <Group gap="xs" wrap="wrap">
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
            </Group>
          )}
        </Group>

        <Box
          p="md"
          style={{
            backgroundColor: 'var(--mantine-color-dark-9)',
            borderRadius: 8,
            minHeight: 340,
          }}
        >
          <SimpleGrid cols={{ base: 1, sm: showSideBySide ? 2 : 1 }} spacing="md">
            {showSideBySide && originalInput && (
              <Stack gap="xs" align="center">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Original Input
                </Text>
                <Box w="100%" h="60vh" style={{ borderRadius: 8, overflow: 'hidden' }}>
                  <ZoomableImage
                    src={origSrc}
                    alt="Original"
                    fit="contain"
                    height="60vh"
                    transform={syncZoom ? primaryZoom.transform : origZoom.transform}
                    onWheelZoom={syncZoom ? primaryZoom.applyWheelZoom : origZoom.applyWheelZoom}
                    onPanByPixels={syncZoom ? primaryZoom.panByPixels : origZoom.panByPixels}
                    onDoubleClick={syncZoom ? primaryZoom.toggleQuickZoom : origZoom.toggleQuickZoom}
                  />
                </Box>
              </Stack>
            )}

            <Stack gap="xs" align="center">
              {showSideBySide && (
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Generated Output
                </Text>
              )}
              <Box w="100%" h="60vh" style={{ borderRadius: 8, overflow: 'hidden' }}>
                <ZoomableImage
                  src={primarySrc}
                  alt={activeOutput ? 'Generated' : 'Original'}
                  fit="contain"
                  height="60vh"
                  transform={primaryZoom.transform}
                  bottomLeftOverlay={
                    settings.showGenerationTime &&
                    activeOutput &&
                    typeof activeOutput.durationMs === 'number' ? (
                      <Badge
                        size="sm"
                        variant="filled"
                        color="dark"
                        leftSection={<IconClock size={12} />}
                        style={{ backgroundColor: 'rgba(18, 19, 24, 0.85)' }}
                      >
                        {formatDuration(activeOutput.durationMs)}
                      </Badge>
                    ) : undefined
                  }
                  onWheelZoom={primaryZoom.applyWheelZoom}
                  onPanByPixels={primaryZoom.panByPixels}
                  onDoubleClick={primaryZoom.toggleQuickZoom}
                />
              </Box>
            </Stack>
          </SimpleGrid>
        </Box>

        <Divider />

        <Group justify="space-between" gap="sm" wrap="wrap">
          <Text
            size="xs"
            c="dimmed"
            truncate
            maw={640}
            title={activeOutput?.prompt || ''}
          >
            {activeOutput?.prompt
              ? `Prompt: ${activeOutput.prompt}`
              : 'Scroll to zoom, drag to pan, double-click or press F to focus face'}
          </Text>
          <Text size="xs" c="dimmed">
            {metaParts.filter(Boolean).join(' | ')}
          </Text>
        </Group>
      </Stack>
    </Modal>
  );
}
