import {
  Card,
  Grid,
  Group,
  NumberInput,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useSettings } from '../../../app/state/SettingsContext';
import type { DeliveryMethod } from '../../../domain/models';
import { MAX_CONCURRENCY, MIN_CONCURRENCY } from '../../../domain/presets';
import { clampConcurrency } from '../../../utils/dimensions';

export function ExecutionModeSection() {
  const { settings, updateSettings } = useSettings();

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <div>
          <Title order={5}>Execution &amp; Concurrency</Title>
          <Text size="xs" c="dimmed">
            Run multiple images in parallel and choose between synchronous or async (submit + poll)
            Runware delivery
          </Text>
        </div>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Parallel Workers
                </Text>
                <Text size="xs" c="dimmed">
                  {settings.concurrency} {settings.concurrency === 1 ? '(Sequential)' : 'concurrent'}
                </Text>
              </Group>
              <Slider
                min={MIN_CONCURRENCY}
                max={MAX_CONCURRENCY}
                step={1}
                value={settings.concurrency}
                onChange={(val) => updateSettings({ concurrency: clampConcurrency(val) })}
                marks={[
                  { value: 1, label: '1' },
                  { value: 3, label: '3' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                ]}
              />
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                API Delivery Method
              </Text>
              <SegmentedControl
                fullWidth
                value={settings.deliveryMethod}
                onChange={(val) => updateSettings({ deliveryMethod: val as DeliveryMethod })}
                data={[
                  { value: 'sync', label: 'Sync (Direct)' },
                  { value: 'async', label: 'Async (Submit + Poll)' },
                ]}
              />
              <Text size="xs" c="dimmed">
                {settings.deliveryMethod === 'async'
                  ? 'Submits jobs asynchronously and polls getResponse until complete — ideal for heavy parallel batches.'
                  : 'Waits for each generation in a single HTTP request — fastest for quick models.'}
              </Text>
            </Stack>
          </Grid.Col>

          {settings.deliveryMethod === 'async' && (
            <>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Async Poll Interval (ms)"
                  description="Delay between getResponse polls"
                  min={250}
                  max={10000}
                  step={250}
                  value={settings.asyncPollIntervalMs}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : Number(val);
                    if (Number.isFinite(num) && num >= 250) {
                      updateSettings({ asyncPollIntervalMs: num });
                    }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Async Job Timeout (seconds)"
                  description="Maximum wait time per image"
                  min={15}
                  max={600}
                  step={15}
                  value={Math.round(settings.asyncTimeoutMs / 1000)}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : Number(val);
                    if (Number.isFinite(num) && num >= 15) {
                      updateSettings({ asyncTimeoutMs: num * 1000 });
                    }
                  }}
                />
              </Grid.Col>
            </>
          )}
        </Grid>
      </Stack>
    </Card>
  );
}
