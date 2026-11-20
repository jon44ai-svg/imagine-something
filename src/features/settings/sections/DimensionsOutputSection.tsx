import { LensSelect, type LensSelectItem } from '@gfazioli/mantine-lens-select';
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconPlus, IconRestore } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useSettings } from '../../../app/state/SettingsContext';
import { formatSizingPreview, resolveModelCapabilities } from '../../../domain/modelCapabilities';
import {
  formatAspectRatioLabel,
  formatDimensionKey,
  parseDimensionKey,
} from '../../../domain/modelLibrary';
import type { AspectRatio, OutputFormat, ResolutionMode } from '../../../domain/models';
import {
  ASPECT_RATIO_OPTIONS,
  BASE_SIZE_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
} from '../../../domain/presets';
import { clampNumberResults, round64 } from '../../../utils/dimensions';
import { useModelLibrary } from '../useModelLibrary';

export function DimensionsOutputSection() {
  const { settings, updateSettings } = useSettings();
  const {
    supportedDimensionsFor,
    blockedFor,
    rememberSupportedDimensions,
    clearModelKnowledge,
  } = useModelLibrary();
  const [newDimInput, setNewDimInput] = useState('');

  const supportedDimensions = supportedDimensionsFor(settings.model);
  const learnedBlocked = blockedFor(settings.model);
  const hasRestrictedDimensions = supportedDimensions.length > 0;
  const capabilities = resolveModelCapabilities(settings.model, learnedBlocked);
  const isCustom = settings.aspectRatio === 'custom';
  const dimPreview = formatSizingPreview(settings, supportedDimensions);

  const activeFixedKey = useMemo(() => {
    if (!hasRestrictedDimensions) return '';
    const existing = supportedDimensions.find(
      (d) => formatDimensionKey(d) === settings.fixedResolution,
    );
    return existing ? settings.fixedResolution : formatDimensionKey(supportedDimensions[0]);
  }, [hasRestrictedDimensions, supportedDimensions, settings.fixedResolution]);

  const lensResolutionItems = useMemo<LensSelectItem[]>(
    () =>
      supportedDimensions.map((dim) => {
        const key = formatDimensionKey(dim);
        const ratio = formatAspectRatioLabel(dim.width, dim.height);
        return {
          value: key,
          view: (
            <Stack gap={0} align="center" justify="center">
              <Text size="10px" fw={700} lh={1.1} className="cyber-mono">
                {ratio}
              </Text>
              <Text size="9px" c="dimmed" lh={1.1} className="cyber-mono">
                {dim.width}x{dim.height}
              </Text>
            </Stack>
          ),
        };
      }),
    [supportedDimensions],
  );

  const handleAddCustomResolution = () => {
    const parsed = parseDimensionKey(newDimInput);
    if (!parsed || !settings.model.trim()) return;
    rememberSupportedDimensions(settings.model, [...supportedDimensions, parsed]);
    setNewDimInput('');
  };

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={5}>Dimensions &amp; Output</Title>
            <Text size="xs" c="dimmed">
              {hasRestrictedDimensions
                ? `Saved ${supportedDimensions.length} supported resolution(s) for ${settings.model}`
                : capabilities.dimensionMode === 'googleNanoBanana'
                  ? 'Automatically maps to Google Nano Banana supported resolutions (1K / 2K / 4K)'
                  : 'All output dimensions snap to multiples of 64 (128–2048 px)'}
            </Text>
          </div>
          <Group gap="xs">
            {hasRestrictedDimensions && (
              <Badge variant="outline" color="cyan" size="sm" className="cyber-mono">
                {supportedDimensions.length} saved sizes
              </Badge>
            )}
            <Badge variant="light" color="cyan" size="md" className="cyber-mono">
              {dimPreview}
            </Badge>
          </Group>
        </Group>

        {hasRestrictedDimensions ? (
          <Paper withBorder p="sm" radius="md" className="cyber-hud-pill">
            <Stack gap="sm">
              <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                <div>
                  <Text size="sm" fw={600}>
                    Model Resolution Strategy
                  </Text>
                  <Text size="xs" c="dimmed">
                    {settings.resolutionMode === 'infer'
                      ? 'Infers the closest supported aspect ratio separately for each input image.'
                      : `Locks every queued image to ${activeFixedKey}.`}
                  </Text>
                </div>
                <SegmentedControl
                  size="xs"
                  value={settings.resolutionMode}
                  onChange={(val) => {
                    const mode = val as ResolutionMode;
                    updateSettings({
                      resolutionMode: mode,
                      fixedResolution:
                        mode === 'fixed' && !settings.fixedResolution
                          ? activeFixedKey
                          : settings.fixedResolution,
                    });
                  }}
                  data={[
                    { value: 'infer', label: 'Infer from Input' },
                    { value: 'fixed', label: 'Fixed Resolution' },
                  ]}
                />
              </Group>

              <Box
                py="xs"
                style={{
                  overflowX: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <LensSelect
                  ariaLabel="Supported model resolutions"
                  data={lensResolutionItems}
                  value={activeFixedKey}
                  onChange={(val) =>
                    updateSettings({
                      resolutionMode: 'fixed',
                      fixedResolution: String(val),
                    })
                  }
                  itemSize={74}
                  gap={8}
                  magnification={1.25}
                  lensRange={2}
                  withIndicator
                  activeColor="cyan"
                  hoverColor="indigo"
                  indicatorProps={{ color: 'cyan', size: 5, offset: 8 }}
                  renderItem={(item, { active }) => (
                    <Box
                      px={6}
                      py={4}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: active
                          ? '1px solid var(--mantine-color-cyan-4)'
                          : '1px solid rgba(56, 189, 248, 0.2)',
                        background:
                          active && settings.resolutionMode === 'fixed'
                            ? 'rgba(6, 182, 212, 0.22)'
                            : 'rgba(12, 20, 34, 0.78)',
                      }}
                    >
                      {item.view}
                    </Box>
                  )}
                />
              </Box>

              <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                <Group gap="xs">
                  <TextInput
                    size="xs"
                    w={136}
                    placeholder="Add e.g. 1536x1024"
                    aria-label="Add supported resolution"
                    value={newDimInput}
                    onChange={(e) => setNewDimInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomResolution();
                    }}
                  />
                  <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<IconPlus size={12} />}
                    disabled={!parseDimensionKey(newDimInput)}
                    onClick={handleAddCustomResolution}
                  >
                    Add size
                  </Button>
                </Group>

                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconRestore size={12} />}
                  onClick={() => clearModelKnowledge(settings.model)}
                >
                  Reset learned constraints
                </Button>
              </Group>
            </Stack>
          </Paper>
        ) : null}

        <Grid>
          {!hasRestrictedDimensions && (
            <>
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
                <Text size="xs" c="dimmed" className="cyber-mono">
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
