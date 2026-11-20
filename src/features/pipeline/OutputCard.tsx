import { ActionIcon, Box, Card, Group, Image, Text, Tooltip } from '@mantine/core';
import { IconDownload, IconX } from '@tabler/icons-react';
import { useServices } from '../../app/ServicesContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import type { OutputRecord } from '../../domain/models';

export interface OutputCardProps {
  output: OutputRecord;
  caption: string;
  fullWidth?: boolean;
}

export function OutputCard({ output, caption, fullWidth = false }: OutputCardProps) {
  const { exportSingleOutput } = useServices();
  const { getObjectUrl, removeOutput } = useQueueData();
  const { openLightbox, activeOutputId, closeLightbox } = useLightbox();

  const imageSrc = getObjectUrl(output.id, output.blob, output.imageURL);

  const handleDelete = async () => {
    if (activeOutputId === output.id) {
      closeLightbox();
    }
    await removeOutput(output.id);
  };

  return (
    <Card
      withBorder
      padding={0}
      radius="sm"
      w={fullWidth ? '100%' : 156}
      style={{ overflow: 'hidden' }}
    >
      <Box
        onClick={() => openLightbox(output.id)}
        style={{ cursor: 'zoom-in', aspectRatio: '1 / 1', overflow: 'hidden' }}
      >
        <Image
          src={imageSrc}
          alt={caption}
          h="100%"
          w="100%"
          fit="cover"
          loading="lazy"
        />
      </Box>

      <Group justify="space-between" gap={4} px="xs" py={6} wrap="nowrap">
        <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }} title={caption}>
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
