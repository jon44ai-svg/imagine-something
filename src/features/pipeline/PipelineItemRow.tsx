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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconPlayerPlay, IconTrash, IconX } from '@tabler/icons-react';
import { useExecution } from '../../app/state/ExecutionContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import type { InputRecord, OutputRecord } from '../../domain/models';
import { useImageZoom } from '../media/useImageZoom';
import { ZoomableImage } from '../media/ZoomableImage';
import { OutputCard } from './OutputCard';

export interface PipelineItemRowProps {
  item: InputRecord;
  index: number;
  outputs: OutputRecord[];
}

export function PipelineItemRow({ item, index, outputs }: PipelineItemRowProps) {
  const { getObjectUrl, removeInput } = useQueueData();
  const { isRunning, runPipeline, cancelItem } = useExecution();
  const { openInputLightbox } = useLightbox();

  const thumbUrl = getObjectUrl(item.id, item.blob);
  const thumbZoom = useImageZoom({
    imageSrc: thumbUrl,
    cacheKey: `in:${item.id}`,
  });

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

  const renderStatusBadge = () => {
    if (item.status === 'processing') {
      return (
        <Badge
          color="indigo"
          variant="light"
          size="sm"
          leftSection={<Loader size={10} color="indigo" />}
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

  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      style={{
        borderColor:
          item.status === 'processing'
            ? 'var(--mantine-color-indigo-6)'
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
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid var(--mantine-color-dark-4)',
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
                  <Badge size="xs" variant="filled" color="dark" px={5}>
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
              <Text size="sm" fw={600} truncate title={item.name}>
                {item.name}
              </Text>
              <Text size="xs" c="dimmed">
                {item.width && item.height ? `${item.width} x ${item.height}` : 'Unknown size'}
              </Text>
              <div>{renderStatusBadge()}</div>

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
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={16} />}
                p="xs"
              >
                <Text size="xs">{item.error}</Text>
              </Alert>
            )}

            {outputs.length === 0 ? (
              <Box
                p="lg"
                style={{
                  border: '1px dashed var(--mantine-color-dark-4)',
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
}
