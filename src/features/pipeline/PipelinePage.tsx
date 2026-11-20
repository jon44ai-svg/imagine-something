import { Card, Container, Stack, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useQueueData } from '../../app/state/QueueDataContext';
import type { OutputRecord, PipelineFilter } from '../../domain/models';
import { SettingsSummaryBar } from '../settings/SettingsSummaryBar';
import { AspectCompatibilityModal } from './AspectCompatibilityModal';
import { PipelineItemRow } from './PipelineItemRow';
import { PipelineProgress } from './PipelineProgress';
import { PipelineToolbar } from './PipelineToolbar';
import { UploadDropzone } from './UploadDropzone';

export function PipelinePage() {
  const { inputs, outputs, addFiles } = useQueueData();
  const [activeFilter, setActiveFilter] = useState<PipelineFilter>('all');

  const outputsByInput = useMemo(() => {
    const map = new Map<string, OutputRecord[]>();
    for (const out of outputs) {
      const list = map.get(out.inputId);
      if (list) list.push(out);
      else map.set(out.inputId, [out]);
    }
    return map;
  }, [outputs]);

  const filteredInputs = useMemo(() => {
    if (activeFilter === 'all') return inputs;
    return inputs.filter((item) => item.status === activeFilter);
  }, [inputs, activeFilter]);

  return (
    <Container size="xl" px={0}>
      <Stack gap="md">
        <SettingsSummaryBar />

        <Card withBorder padding="md" radius="md">
          <Stack gap="md">
            <PipelineToolbar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            <PipelineProgress />
            <UploadDropzone
              compact={inputs.length > 0}
              onFilesDropped={(files) => void addFiles(files)}
            />

            {filteredInputs.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                {inputs.length === 0
                  ? 'No images in the pipeline yet. Drop images above to get started.'
                  : `No images match the "${activeFilter}" filter.`}
              </Text>
            ) : (
              <Stack gap="sm">
                {filteredInputs.map((item) => {
                  const globalIdx = inputs.findIndex((i) => i.id === item.id) + 1;
                  return (
                    <PipelineItemRow
                      key={item.id}
                      item={item}
                      index={globalIdx}
                      outputs={outputsByInput.get(item.id) || []}
                    />
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
      <AspectCompatibilityModal />
    </Container>
  );
}
