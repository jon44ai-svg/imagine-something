import { BorderAnimate } from '@gfazioli/mantine-border-animate';
import { Led } from '@gfazioli/mantine-led';
import { Carousel } from '@mantine/carousel';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconAspectRatio,
  IconEye,
  IconFaceId,
  IconPlayerPlay,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useContextMenu } from 'mantine-contextmenu';
import { useExecution } from '../../app/state/ExecutionContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import { resolveTargetSizing } from '../../domain/modelCapabilities';
import { computeAspectCompatibility } from '../../domain/modelLibrary';
import type { InputRecord, OutputRecord } from '../../domain/models';
import { useImageZoom } from '../media/useImageZoom';
import { ZoomableImage } from '../media/ZoomableImage';
import { useModelLibrary } from '../settings/useModelLibrary';
import { OutputCard } from './OutputCard';

export interface PipelineItemRowProps {
  item: InputRecord;
  index: number;
  outputs: OutputRecord[];
}

export function PipelineItemRow({ item, index, outputs }: PipelineItemRowProps) {
  const { getObjectUrl, removeInput } = useQueueData();
  const { settings } = useSettings();
  const { supportedDimensionsFor } = useModelLibrary();
  const { isRunning, runPipeline, cancelItem } = useExecution();
  const { openInputLightbox, openAspectPreview } = useLightbox();
  const { showContextMenu } = useContextMenu();

  const thumbUrl = getObjectUrl(item.id, item.blob);
  const thumbZoom = useImageZoom({
    imageSrc: thumbUrl,
    cacheKey: `in:${item.id}`,
  });

  const supportedDims = supportedDimensionsFor(settings.model);
  const resolvedSizing = resolveTargetSizing(settings, item.width, item.height, supportedDims);
  const targetDims =
    resolvedSizing.mode === 'resolution'
      ? resolvedSizing.fallbackDimensions
      : { width: resolvedSizing.width, height: resolvedSizing.height };
  const compat = computeAspectCompatibility(
    item.width || targetDims.width,
    item.height || targetDims.height,
    targetDims.width,
    targetDims.height,
  );
  const compatColor =
    compat.severity === 'exact'
      ? 'teal'
      : compat.severity === 'good'
        ? 'cyan'
        : compat.severity === 'moderate'
          ? 'yellow'
          : 'red';

  const handleRemove = () => {
    if (isRunning) {
      notifications.show({
        message: 'Stop the pipeline before removing items.',
        color: 'indigo',
      });
      return;
    }
    void removeInput(item.id);
  };

  const handleThumbContextMenu = showContextMenu([
    {
      key: 'run',
      icon: <IconPlayerPlay size={14} />,
      title: outputs.length > 0 ? 'Re-run Image' : 'Run Image',
      disabled: isRunning,
      onClick: () => void runPipeline([item.id]),
    },
    {
      key: 'aspect',
      icon: <IconAspectRatio size={14} />,
      title: 'Verify Aspect Compatibility',
      onClick: () => openAspectPreview(item.id),
    },
    {
      key: 'preview',
      icon: <IconEye size={14} />,
      title: 'Open Input Preview',
      onClick: () => openInputLightbox(item.id),
    },
    {
      key: 'face',
      icon: <IconFaceId size={14} />,
      title: thumbZoom.faceFocusActive ? 'Reset Face Focus' : 'Focus on Face',
      onClick: () => void thumbZoom.toggleFaceFocus(),
    },
    { key: 'divider' },
    {
      key: 'remove',
      icon: <IconTrash size={14} />,
      title: 'Remove from Queue',
      color: 'red',
      disabled: isRunning,
      onClick: handleRemove,
    },
  ]);

  const ledColor =
    item.status === 'processing'
      ? 'cyan'
      : item.status === 'done'
        ? 'teal'
        : item.status === 'error'
          ? 'red'
          : 'gray';

  const renderStatusBadge = () => {
    if (item.status === 'processing') {
      return (
        <Badge
          color="cyan"
          variant="light"
          size="sm"
          leftSection={<Loader size={10} color="cyan" />}
        >
          Processing
        </Badge>
      );
    }
    if (item.status === 'done') {
      return (
        <Badge color="teal" variant="light" size="sm">
          Done ({outputs.length})
        </Badge>
      );
    }
    if (item.status === 'error') {
      return (
        <Badge color="red" variant="light" size="sm">
          Failed
        </Badge>
      );
    }
    return (
      <Badge color="gray" variant="light" size="sm">
        Pending
      </Badge>
    );
  };

  const cardBody = (
    <Card
      withBorder
      padding="sm"
      radius="md"
      style={{
        borderColor:
          item.status === 'processing'
            ? 'rgba(34, 211, 238, 0.55)'
            : item.status === 'error'
              ? 'var(--mantine-color-red-8)'
              : undefined,
      }}
    >
      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
          <Group align="flex-start" wrap="nowrap" gap="sm">
            <Box
              w={110}
              h={110}
              onContextMenu={handleThumbContextMenu}
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(56, 189, 248, 0.24)',
              }}
            >
              <ZoomableImage
                src={thumbUrl}
                alt={item.name}
                transform={thumbZoom.transform}
                fit="cover"
                height={110}
                loading="lazy"
                showOverlayControls
                compactControls
                faceFocusActive={thumbZoom.faceFocusActive}
                isDetectingFace={thumbZoom.isDetectingFace}
                topLeftOverlay={
                  <Badge size="xs" variant="filled" color="dark" px={5} className="cyber-mono">
                    #{index}
                  </Badge>
                }
                onZoomIn={thumbZoom.zoomIn}
                onZoomOut={thumbZoom.zoomOut}
                onResetZoom={thumbZoom.resetZoom}
                onToggleFaceFocus={() => void thumbZoom.toggleFaceFocus()}
                onWheelZoom={thumbZoom.applyWheelZoom}
                onPanByPixels={thumbZoom.panByPixels}
                onImageClick={() => {
                  if (!thumbZoom.isZoomed) openInputLightbox(item.id);
                }}
                onExpandClick={() => openInputLightbox(item.id)}
              />
            </Box>

            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                <Led
                  variant="neon"
                  size={8}
                  color={ledColor}
                  animate={item.status === 'processing'}
                  animationType="pulse"
                />
                <Text size="sm" fw={600} truncate title={item.name}>
                  {item.name}
                </Text>
              </Group>
              <Text size="xs" c="dimmed" className="cyber-mono">
                {item.width && item.height ? `${item.width} x ${item.height}` : 'Unknown size'}
              </Text>

              <Group gap={6} wrap="wrap">
                {renderStatusBadge()}
                <Tooltip label="Click to preview target aspect ratio crop">
                  <Badge
                    size="xs"
                    variant="outline"
                    color={compatColor}
                    className="cyber-mono"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openAspectPreview(item.id)}
                  >
                    {compat.targetWidth}x{compat.targetHeight}{' '}
                    {compat.severity === 'exact' ? '• Exact' : `• ~${compat.cropPercent}% crop`}
                  </Badge>
                </Tooltip>
              </Group>

              <Group gap={6} mt={2}>
                {item.status === 'processing' ? (
                  <Button
                    size="compact-xs"
                    color="orange"
                    variant="light"
                    leftSection={<IconX size={12} />}
                    onClick={() => cancelItem(item.id)}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<IconPlayerPlay size={12} />}
                    disabled={isRunning}
                    onClick={() => void runPipeline([item.id])}
                  >
                    {outputs.length > 0 ? 'Re-run' : 'Run'}
                  </Button>
                )}

                <Button
                  size="compact-xs"
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={12} />}
                  disabled={isRunning}
                  onClick={handleRemove}
                >
                  Remove
                </Button>
              </Group>
            </Stack>
          </Group>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
          <Stack gap="xs">
            {item.error && (
              <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} p="xs">
                <Text size="xs">{item.error}</Text>
              </Alert>
            )}

            {outputs.length === 0 ? (
              <Box
                p="lg"
                style={{
                  border: '1px dashed rgba(56, 189, 248, 0.2)',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <Text size="xs" c="dimmed">
                  {item.status === 'processing'
                    ? 'Generating with Runware...'
                    : 'Generated outputs will appear here'}
                </Text>
              </Box>
            ) : outputs.length > 2 ? (
              <Carousel
                slideSize={184}
                slideGap="sm"
                withControls
                emblaOptions={{ align: 'start', dragFree: true }}
              >
                {outputs.map((out, idx) => (
                  <Carousel.Slide key={out.id}>
                    <OutputCard
                      output={out}
                      caption={`#${idx + 1} | ${out.width}x${out.height}`}
                    />
                  </Carousel.Slide>
                ))}
              </Carousel>
            ) : (
              <Group gap="sm" align="flex-start" wrap="wrap">
                {outputs.map((out, idx) => (
                  <OutputCard
                    key={out.id}
                    output={out}
                    caption={`#${idx + 1} | ${out.width}x${out.height}`}
                  />
                ))}
              </Group>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Card>
  );

  if (item.status === 'processing') {
    return (
      <BorderAnimate
        variant="beam"
        beamMode="comet"
        colorFrom="cyan.4"
        colorTo="indigo.5"
        radius="md"
        borderWidth={2}
        duration={3}
      >
        {cardBody}
      </BorderAnimate>
    );
  }

  return cardBody;
}
