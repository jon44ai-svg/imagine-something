import { Badge, Card, Group, Progress, Stack, Text } from '@mantine/core';
import { useExecution } from '../../app/state/ExecutionContext';

export function PipelineProgress() {
  const { isRunning, progress, progressVisible, statusMessage } = useExecution();

  if (!progressVisible || !progress) return null;

  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Text size="sm">{statusMessage}</Text>
            {isRunning && progress.activeIds.length > 0 && (
              <Badge size="xs" variant="light" color="indigo">
                {progress.activeIds.length} active
              </Badge>
            )}
          </Group>
          <Text size="sm" fw={700}>
            {progress.percentage}%
          </Text>
        </Group>
        <Progress
          value={progress.percentage}
          animated={isRunning}
          striped={isRunning}
          color={progress.failed > 0 && !isRunning ? 'orange' : 'indigo'}
          radius="xl"
          size="sm"
        />
      </Stack>
    </Card>
  );
}
