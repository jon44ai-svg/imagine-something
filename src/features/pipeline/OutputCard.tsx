import { ActionIcon, Badge, Card, Group, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconClock,
  IconColumns,
  IconCopy,
  IconDownload,
  IconEye,
  IconFaceId,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useContextMenu } from 'mantine-contextmenu';
import { useServices } from '../../app/ServicesContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import type { OutputRecord } from '../../domain/models';
import { formatDuration } from '../../utils/duration';
import { useImageZoom } from '../media/useImageZoom';
import { ZoomableImage } from '../media/ZoomableImage';

export interface OutputCardProps {
  output: OutputRecord;
  caption: string;
  fullWidth?: boolean;
  defaultFaceFocus?: boolean;
}

export function OutputCard({
  output,
  caption,
  fullWidth = false,
  defaultFaceFocus = false,
}: OutputCardProps) {
  const { exportSingleOutput } = useServices();
  const { getObjectUrl, removeOutput } = useQueueData();
  const { settings } = useSettings();
  const { openLightbox, activeOutputId, closeLightbox } = useLightbox();
  const { showContextMenu } = useContextMenu();

  const imageSrc = getObjectUrl(output.id, output.blob, output.imageURL);
  const zoom = useImageZoom({
    imageSrc,
    cacheKey: `out:${output.id}`,
    initialFaceFocus: defaultFaceFocus,
  });

  const handleDelete = async () => {
    if (activeOutputId === output.id) {
      closeLightbox();
    }
    await removeOutput(output.id);
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notifications.show({ message: `Copied ${label} to clipboard.`, color: 'cyan' });
    } catch {
      notifications.show({ message: `Unable to copy ${label}.`, color: 'red' });
    }
  };

  const handleContextMenu = showContextMenu([
    {
      key: 'open',
      icon: <IconEye size={14} />,
      title: 'Open in Lightbox',
      onClick: () => openLightbox(output.id, 'inspect'),
    },
    {
      key: 'compare',
      icon: <IconColumns size={14} />,
      title: 'Compare Before / After',
      onClick: () => openLightbox(output.id, 'slider'),
    },
    {
      key: 'face',
      icon: <IconFaceId size={14} />,
      title: zoom.faceFocusActive ? 'Reset Face Focus' : 'Focus on Face',
      onClick: () => void zoom.toggleFaceFocus(),
    },
    { key: 'div-copy' },
    {
      key: 'copy-prompt',
      icon: <IconCopy size={14} />,
      title: 'Copy Prompt',
      disabled: !output.prompt,
      onClick: () => void copyText('prompt', output.prompt),
    },
    {
      key: 'copy-seed',
      icon: <IconCopy size={14} />,
      title: 'Copy Seed',
      hidden: output.seed === null || output.seed === undefined,
      onClick: () => void copyText('seed', String(output.seed)),
    },
    { key: 'div-io' },
    {
      key: 'download',
      icon: <IconDownload size={14} />,
      title: 'Download Image',
      onClick: () => void exportSingleOutput.execute(output),
    },
    {
      key: 'delete',
      icon: <IconTrash size={14} />,
      title: 'Delete Output',
      color: 'red',
      onClick: () => void handleDelete(),
    },
  ]);

  const faceBadgeText =
    zoom.faceFocusActive && zoom.faceResult
      ? zoom.faceResult.boxes.length > 1
        ? `Face ${zoom.activeFaceIndex + 1}/${zoom.faceResult.boxes.length}`
        : zoom.faceResult.source === 'portrait-fallback'
          ? 'Portrait'
          : 'Face'
      : null;

  const durationOverlay =
    settings.showGenerationTime && typeof output.durationMs === 'number' ? (
      <Badge
        size="xs"
        variant="filled"
        color="dark"
        className="cyber-mono"
        leftSection={<IconClock size={10} />}
        style={{ backgroundColor: 'rgba(8, 13, 24, 0.85)' }}
        title={`Generated in ${formatDuration(output.durationMs)}`}
      >
        {formatDuration(output.durationMs)}
      </Badge>
    ) : undefined;

  return (
    <Card
      withBorder
      padding={0}
      radius="sm"
      w={fullWidth ? '100%' : 176}
      onContextMenu={handleContextMenu}
      style={{ overflow: 'hidden' }}
    >
      <ZoomableImage
        src={imageSrc}
        alt={caption}
        transform={zoom.transform}
        fit="cover"
        aspectRatio="1 / 1"
        loading="lazy"
        showOverlayControls
        compactControls
        faceFocusActive={zoom.faceFocusActive}
        isDetectingFace={zoom.isDetectingFace}
        faceBadgeText={faceBadgeText}
        bottomLeftOverlay={durationOverlay}
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onResetZoom={zoom.resetZoom}
        onToggleFaceFocus={() => void zoom.toggleFaceFocus()}
        onWheelZoom={zoom.applyWheelZoom}
        onPanByPixels={zoom.panByPixels}
        onImageClick={() => {
          if (!zoom.isZoomed) openLightbox(output.id);
        }}
        onExpandClick={() => openLightbox(output.id)}
      />

      <Group justify="space-between" gap={4} px="xs" py={6} wrap="nowrap">
        <Text
          size="xs"
          c="dimmed"
          truncate
          className="cyber-mono"
          style={{ flex: 1, minWidth: 0 }}
          title={caption}
        >
          {caption}
        </Text>
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Download">
            <ActionIcon
              size="xs"
              variant="default"
              aria-label="Download output"
              onClick={(e) => {
                e.stopPropagation();
                void exportSingleOutput.execute(output);
              }}
            >
              <IconDownload size={12} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon
              size="xs"
              variant="light"
              color="red"
              aria-label="Delete output"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete();
              }}
            >
              <IconX size={12} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}
