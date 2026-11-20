import { Box, Button, Divider, Group, Image, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
  IconDownload,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useServices } from '../../app/ServicesContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';

export function LightboxModal() {
  const { exportSingleOutput } = useServices();
  const { inputs, outputs, getObjectUrl, removeOutput } = useQueueData();
  const { activeOutputId, compareEnabled, closeLightbox, toggleCompare, goPrev, goNext } =
    useLightbox();

  const activeIdx = activeOutputId ? outputs.findIndex((o) => o.id === activeOutputId) : -1;
  const activeOutput = activeIdx >= 0 ? outputs[activeIdx] : null;
  const originalInput = activeOutput
    ? inputs.find((i) => i.id === activeOutput.inputId)
    : undefined;

  useEffect(() => {
    if (!activeOutputId) return;
    if (activeIdx === -1) {
      closeLightbox();
    }
  }, [activeOutputId, activeIdx, closeLightbox]);

  useEffect(() => {
    if (!activeOutput) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOutput, closeLightbox, goPrev, goNext]);

  if (!activeOutput) return null;

  const outUrl = getObjectUrl(activeOutput.id, activeOutput.blob, activeOutput.imageURL);
  const origUrl = originalInput ? getObjectUrl(originalInput.id, originalInput.blob) : '';
  const showSideBySide = compareEnabled && Boolean(originalInput);

  const metaParts: string[] = [
    activeOutput.model,
    `${activeOutput.width}x${activeOutput.height}`,
    activeOutput.format,
  ];
  if (activeOutput.seed !== null && activeOutput.seed !== undefined) {
    metaParts.push(`Seed: ${activeOutput.seed}`);
  }
  if (typeof activeOutput.cost === 'number') {
    metaParts.push(`$${activeOutput.cost.toFixed(4)}`);
  }

  const handleDelete = async () => {
    const id = activeOutput.id;
    closeLightbox();
    await removeOutput(id);
  };

  return (
    <Modal
      opened={Boolean(activeOutput)}
      onClose={closeLightbox}
      size="90%"
      centered
      title={
        <Text fw={600} size="sm">
          {activeOutput.inputName} ({activeIdx + 1} / {outputs.length})
        </Text>
      }
    >
      <Stack gap="sm">
        <Group justify="flex-end" gap="xs" wrap="wrap">
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

        <Box
          p="md"
          style={{
            backgroundColor: 'var(--mantine-color-dark-9)',
            borderRadius: 8,
            minHeight: 300,
          }}
        >
          <SimpleGrid cols={{ base: 1, sm: showSideBySide ? 2 : 1 }} spacing="md">
            {showSideBySide && originalInput && (
              <Stack gap="xs" align="center">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Original Input
                </Text>
                <Image
                  src={origUrl}
                  alt="Original"
                  fit="contain"
                  mah="62vh"
                  radius="sm"
                />
              </Stack>
            )}

            <Stack gap="xs" align="center">
              {showSideBySide && (
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Generated Output
                </Text>
              )}
              <Image
                src={outUrl}
                alt="Generated"
                fit="contain"
                mah="62vh"
                radius="sm"
              />
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
            title={activeOutput.prompt}
          >
            {activeOutput.prompt ? `Prompt: ${activeOutput.prompt}` : ''}
          </Text>
          <Text size="xs" c="dimmed">
            {metaParts.filter(Boolean).join(' | ')}
          </Text>
        </Group>
      </Stack>
    </Modal>
  );
}
