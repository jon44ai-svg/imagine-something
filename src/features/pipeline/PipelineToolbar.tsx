import { Button, Group, SegmentedControl, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import { useExecution } from '../../app/state/ExecutionContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import type { PipelineFilter } from '../../domain/models';

export interface PipelineToolbarProps {
  activeFilter: PipelineFilter;
  onFilterChange: (filter: PipelineFilter) => void;
}

export function PipelineToolbar({ activeFilter, onFilterChange }: PipelineToolbarProps) {
  const { inputs, outputs, resetAllToPending, clearOutputs, clearAll } = useQueueData();
  const { isRunning, runPipeline, stopAll, retryFailed } = useExecution();

  const pendingCount = inputs.filter((item) => item.status === 'pending').length;
  const failedCount = inputs.filter((item) => item.status === 'error').length;

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

  const confirmClearAll = () => {
    modals.openConfirmModal({
      title: 'Clear Entire Pipeline',
      children: (
        <Text size="sm">
          Delete the entire pipeline queue ({inputs.length} input(s)) and all generated images (
          {outputs.length} output(s)) from IndexedDB?
        </Text>
      ),
      labels: { confirm: 'Delete Everything', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => void clearAll(),
    });
  };

  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="xs" wrap="wrap">
        <Button
          size="xs"
          leftSection={<IconPlayerPlay size={14} />}
          disabled={isRunning || inputs.length === 0}
          onClick={() => void runPipeline()}
        >
          {pendingCount > 0 ? `Run Pipeline (${pendingCount})` : 'Run Pipeline'}
        </Button>

        {isRunning && (
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<IconPlayerStop size={14} />}
            onClick={stopAll}
          >
            Stop
          </Button>
        )}

        {!isRunning && failedCount > 0 && (
          <Button
            size="xs"
            variant="default"
            leftSection={<IconRefresh size={14} />}
            onClick={() => void retryFailed()}
          >
            Retry Failed ({failedCount})
          </Button>
        )}

        <Button
          size="xs"
          variant="default"
          leftSection={<IconRotateClockwise size={14} />}
          disabled={isRunning || inputs.length === 0}
          title="Mark all queued images as Pending so you can run them again with a new prompt"
          onClick={() => void resetAllToPending()}
        >
          Reset All to Pending
        </Button>

        <Button
          size="xs"
          color="red"
          variant="subtle"
          leftSection={<IconTrash size={14} />}
          disabled={isRunning || outputs.length === 0}
          onClick={confirmClearOutputs}
        >
          Clear Outputs
        </Button>

        <Button
          size="xs"
          color="red"
          variant="light"
          leftSection={<IconTrash size={14} />}
          disabled={isRunning || (inputs.length === 0 && outputs.length === 0)}
          onClick={confirmClearAll}
        >
          Clear All
        </Button>
      </Group>

      <SegmentedControl
        size="xs"
        value={activeFilter}
        onChange={(value) => onFilterChange(value as PipelineFilter)}
        data={[
          { label: 'All', value: 'all' },
          { label: 'Pending', value: 'pending' },
          { label: 'Done', value: 'done' },
          { label: 'Failed', value: 'error' },
        ]}
      />
    </Group>
  );
}
