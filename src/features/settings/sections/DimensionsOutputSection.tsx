import {
  Badge,
  Card,
  Grid,
  Group,
  NumberInput,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useSettings } from '../../../app/state/SettingsContext';
import { formatSizingPreview, resolveModelCapabilities } from '../../../domain/modelCapabilities';
import type { AspectRatio, OutputFormat } from '../../../domain/models';
import {
  ASPECT_RATIO_OPTIONS,
  BASE_SIZE_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
} from '../../../domain/presets';
import { clampNumberResults, round64 } from '../../../utils/dimensions';

export function DimensionsOutputSection() {
  const { settings, updateSettings } = useSettings();

  const capabilities = resolveModelCapabilities(settings.model);
  const isCustom = settings.aspectRatio === 'custom';
  const dimPreview = formatSizingPreview(settings);

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={5}>Dimensions &amp; Output</Title>
            <Text size="xs" c="dimmed">
              {capabilities.dimensionMode === 'googleNanoBanana'
                ? 'Automatically maps to Google Nano Banana supported resolutions (1K / 2K / 4K)'
                : 'All output dimensions snap to multiples of 64 (128–2048 px)'}
            </Text>
          </div>
          <Badge variant="light" color="indigo" size="md">
            {dimPreview}
          </Badge>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select
              label="Aspect Ratio"
              data={ASPECT_RATIO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={settings.aspectRatio}
              allowDeselect={false}
              onChange={(val) => {
                if (val) updateSettings({ aspectRatio: val as AspectRatio });
              }}
            />
          </Grid.Col>

          {!isCustom ? (
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Select
                label="Target Long Side"
                data={BASE_SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={String(settings.baseSize)}
                allowDeselect={false}
                onChange={(val) => {
                  if (val) updateSettings({ baseSize: Number(val) });
                }}
              />
            </Grid.Col>
          ) : (
            <>
              <Grid.Col span={{ base: 6, md: 2 }}>
                <NumberInput
                  label="Custom Width"
                  min={128}
                  max={2048}
                  step={64}
                  value={settings.customWidth}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : Number(val);
                    if (Number.isFinite(num)) {
                      updateSettings({ customWidth: round64(num) });
                    }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 2 }}>
                <NumberInput
                  label="Custom Height"
                  min={128}
                  max={2048}
                  step={64}
                  value={settings.customHeight}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : Number(val);
                    if (Number.isFinite(num)) {
                      updateSettings({ customHeight: round64(num) });
                    }
                  }}
                />
              </Grid.Col>
            </>
          )}

          <Grid.Col span={{ base: 12, sm: 4, md: 4 }}>
            <NumberInput
              label="Outputs / Input"
              description="1–10 images per input"
              min={1}
              max={10}
              value={settings.numberResults}
              onChange={(val) => {
                const num = typeof val === 'number' ? val : Number(val);
                if (Number.isFinite(num)) {
                  updateSettings({ numberResults: clampNumberResults(num) });
                }
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Output Format"
              data={OUTPUT_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={settings.outputFormat}
              allowDeselect={false}
              onChange={(val) => {
                if (val) updateSettings({ outputFormat: val as OutputFormat });
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 8 }}>
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Quality
                </Text>
                <Text size="xs" c="dimmed">
                  {settings.outputQuality}%
                </Text>
              </Group>
              <Slider
                min={50}
                max={100}
                value={settings.outputQuality}
                onChange={(val) => updateSettings({ outputQuality: val })}
                marks={[
                  { value: 50, label: '50' },
                  { value: 75, label: '75' },
                  { value: 95, label: '95' },
                  { value: 100, label: '100' },
                ]}
              />
            </Stack>
          </Grid.Col>

          <Grid.Col span={12}>
            <Switch
              label="Show generation time on images"
              description="Display a badge showing how long each generation took on output images and in the lightbox"
              checked={settings.showGenerationTime}
              onChange={(event) =>
                updateSettings({ showGenerationTime: event.currentTarget.checked })
              }
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  );
}
