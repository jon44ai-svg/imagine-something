import { Button, Card, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecution } from '../../app/state/ExecutionContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { OutputCard } from '../pipeline/OutputCard';

export function GalleryPage() {
  const { outputs, clearOutputs } = useQueueData();
  const { isRunning } = useExecution();
  const navigate = useNavigate();

  const sortedOutputs = useMemo(
    () => [...outputs].sort((a, b) => b.createdAt - a.createdAt),
    [outputs],
  );

  const confirmClearOutputs = () => {
    modals.openConfirmModal({
      title: 'Clear Generated Outputs',
      children: (
        <Text size="sm">
          Delete all {outputs.length} generated output image(s) from IndexedDB?
        </Text>
      ),
      labels: { confirm: 'Delete Outputs', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => void clearOutputs(),
    });
  };

  return (
    <Container size="xl" px={0}>
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="sm">
            <Title order={3}>Outputs Gallery</Title>
            <Text size="sm" c="dimmed">
              {outputs.length} image(s) &bull; newest first
            </Text>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => navigate('/pipeline')}
            >
              Back to Pipeline
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<IconTrash size={14} />}
              disabled={isRunning || outputs.length === 0}
              onClick={confirmClearOutputs}
            >
              Clear Outputs
            </Button>
          </Group>
        </Group>

        <Card withBorder padding="md" radius="md">
          {sortedOutputs.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No generated images yet. Run the pipeline to see results here.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="md">
              {sortedOutputs.map((out) => (
                <OutputCard key={out.id} output={out} caption={out.inputName} fullWidth />
              ))}
            </SimpleGrid>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
