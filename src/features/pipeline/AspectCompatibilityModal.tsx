import { Carousel } from '@mantine/carousel';
import { LensSelect, type LensSelectItem } from '@gfazioli/mantine-lens-select';
import { Mask } from '@gfazioli/mantine-mask';
import {
  Badge,
  Box,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { IconAspectRatio } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import { resolveTargetSizing } from '../../domain/modelCapabilities';
import {
  computeAspectCompatibility,
  formatAspectRatioLabel,
  formatDimensionKey,
  type AspectCompatibilitySeverity,
} from '../../domain/modelLibrary';
import type { ResolutionMode } from '../../domain/models';
import { useModelLibrary } from '../settings/useModelLibrary';

function severityColor(severity: AspectCompatibilitySeverity): string {
  if (severity === 'exact') return 'teal';
  if (severity === 'good') return 'cyan';
  if (severity === 'moderate') return 'yellow';
  return 'red';
}

function severityLabel(severity: AspectCompatibilitySeverity, cropPercent: number): string {
  if (severity === 'exact') return 'Exact match';
  return `~${cropPercent}% crop (${severity})`;
}

export function AspectCompatibilityModal() {
  const { inputs, getObjectUrl } = useQueueData();
  const { settings, updateSettings } = useSettings();
  const { supportedDimensionsFor } = useModelLibrary();
  const { aspectPreviewOpen, aspectPreviewInputId, closeAspectPreview } = useLightbox();

  const [previewMode, setPreviewMode] = useState<'mask' | 'contain'>('mask');
  const [activeSlide, setActiveSlide] = useState(0);

  const supportedDims = supportedDimensionsFor(settings.model);

  useEffect(() => {
    if (!aspectPreviewOpen) return;
    if (aspectPreviewInputId) {
      const idx = inputs.findIndex((i) => i.id === aspectPreviewInputId);
      setActiveSlide(idx >= 0 ? idx : 0);
    } else {
      setActiveSlide(0);
    }
  }, [aspectPreviewOpen, aspectPreviewInputId, inputs]);

  const activeFixedKey = useMemo(() => {
    if (supportedDims.length === 0) return '';
    const match = supportedDims.find((d) => formatDimensionKey(d) === settings.fixedResolution);
    return match ? settings.fixedResolution : formatDimensionKey(supportedDims[0]);
  }, [supportedDims, settings.fixedResolution]);

  const lensItems = useMemo<LensSelectItem[]>(
    () =>
      supportedDims.map((dim) => {
        const key = formatDimensionKey(dim);
        return {
          value: key,
          view: (
            <Stack gap={0} align="center" justify="center">
              <Text size="10px" fw={700} lh={1.1} className="cyber-mono">
                {formatAspectRatioLabel(dim.width, dim.height)}
              </Text>
              <Text size="9px" c="dimmed" lh={1.1} className="cyber-mono">
                {key}
              </Text>
            </Stack>
          ),
        };
      }),
    [supportedDims],
  );

  if (!aspectPreviewOpen) return null;

  return (
    <Modal
      opened={aspectPreviewOpen}
      onClose={closeAspectPreview}
      size="xl"
      centered
      title={
        <Group gap="xs">
          <IconAspectRatio size={18} />
          <Text fw={700} size="sm">
            Aspect-Ratio Compatibility Preview ({inputs.length} original image
            {inputs.length === 1 ? '' : 's'})
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Badge variant="outline" color="cyan" className="cyber-mono">
              {settings.model}
            </Badge>
            {supportedDims.length > 0 && (
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
                  { value: 'infer', label: 'Infer per Image' },
                  { value: 'fixed', label: 'Fixed Size' },
                ]}
              />
            )}
          </Group>

          <SegmentedControl
            size="xs"
            value={previewMode}
            onChange={(val) => setPreviewMode(val as 'mask' | 'contain')}
            data={[
              { value: 'mask', label: 'Crop Frame Mask' },
              { value: 'contain', label: 'Target Ratio Fit' },
            ]}
          />
        </Group>

        {inputs.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Add images to the pipeline queue to verify aspect-ratio compatibility.
          </Text>
        ) : (
          <Carousel
            withIndicators={inputs.length > 1}
            withControls={inputs.length > 1}
            initialSlide={activeSlide}
            onSlideChange={setActiveSlide}
            slideGap="md"
          >
            {inputs.map((item, idx) => {
              const src = getObjectUrl(item.id, item.blob);
              const resolved = resolveTargetSizing(
                settings,
                item.width,
                item.height,
                supportedDims,
              );
              const target =
                resolved.mode === 'resolution'
                  ? resolved.fallbackDimensions
                  : { width: resolved.width, height: resolved.height };
              const compat = computeAspectCompatibility(
                item.width || target.width,
                item.height || target.height,
                target.width,
                target.height,
              );

              return (
                <Carousel.Slide key={item.id}>
                  <Stack gap="sm" align="center" pb={inputs.length > 1 ? 'md' : 0}>
                    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
                      <Group gap="xs">
                        <Badge size="xs" variant="filled" color="dark" className="cyber-mono">
                          #{idx + 1}
                        </Badge>
                        <Text size="sm" fw={600} truncate maw={280}>
                          {item.name}
                        </Text>
                      </Group>
                      <Group gap="xs">
                        <Badge size="sm" variant="default" className="cyber-mono">
                          In: {compat.inputWidth}x{compat.inputHeight} (
                          {formatAspectRatioLabel(compat.inputWidth, compat.inputHeight)})
                        </Badge>
                        <Badge size="sm" variant="light" color="cyan" className="cyber-mono">
                          Target: {compat.targetWidth}x{compat.targetHeight} (
                          {compat.targetAspectLabel})
                        </Badge>
                        <Badge
                          size="sm"
                          variant="light"
                          color={severityColor(compat.severity)}
                          className="cyber-mono"
                        >
                          {severityLabel(compat.severity, compat.cropPercent)}
                        </Badge>
                      </Group>
                    </Group>

                    <Paper
                      withBorder
                      p="sm"
                      radius="md"
                      w="100%"
                      style={{
                        background: '#04070e',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 340,
                      }}
                    >
                      {previewMode === 'mask' ? (
                        <Box
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            maxWidth: '100%',
                            maxHeight: 360,
                            lineHeight: 0,
                          }}
                        >
                          {/* Dimmed background copy of the full original */}
                          <img
                            src={src}
                            alt={item.name}
                            style={{
                              maxWidth: '100%',
                              maxHeight: 360,
                              display: 'block',
                              opacity: 0.28,
                              filter: 'saturate(0.5)',
                              borderRadius: 6,
                            }}
                          />
                          {/* Illuminated spotlight mask highlighting active center */}
                          <Box
                            style={{
                              position: 'absolute',
                              inset: 0,
                              overflow: 'hidden',
                              borderRadius: 6,
                              clipPath: `inset(${compat.cropRect.y * 100}% ${
                                (1 - compat.cropRect.x - compat.cropRect.width) * 100
                              }% ${(1 - compat.cropRect.y - compat.cropRect.height) * 100}% ${
                                compat.cropRect.x * 100
                              }%)`,
                            }}
                          >
                            <Mask
                              maskX={50}
                              maskY={50}
                              maskRadiusX={1000}
                              maskRadiusY={1000}
                              maskFeather={10}
                              maskOpacity={1}
                            >
                              <img
                                src={src}
                                alt={`${item.name} target frame`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                              />
                            </Mask>
                          </Box>
                          {/* Glowing target aspect frame border */}
                          <Box
                            style={{
                              position: 'absolute',
                              left: `${compat.cropRect.x * 100}%`,
                              top: `${compat.cropRect.y * 100}%`,
                              width: `${compat.cropRect.width * 100}%`,
                              height: `${compat.cropRect.height * 100}%`,
                              border: '2px solid var(--mantine-color-cyan-4)',
                              boxShadow: '0 0 18px rgba(34, 211, 238, 0.45)',
                              borderRadius: 4,
                              pointerEvents: 'none',
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          style={{
                            width: '100%',
                            maxWidth: 480,
                            maxHeight: 360,
                            aspectRatio: `${compat.targetWidth} / ${compat.targetHeight}`,
                            border: '2px solid var(--mantine-color-cyan-5)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#090f1d',
                            boxShadow: '0 0 22px rgba(6, 182, 212, 0.2)',
                          }}
                        >
                          <img
                            src={src}
                            alt={`${item.name} fitted to ${compat.targetWidth}x${compat.targetHeight}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        </Box>
                      )}
                    </Paper>
                  </Stack>
                </Carousel.Slide>
              );
            })}
          </Carousel>
        )}

        {supportedDims.length > 0 && (
          <Stack gap={6} align="center">
            <Text size="xs" c="dimmed">
              Test supported resolutions for <span className="cyber-mono">{settings.model}</span>{' '}
              (click any size to lock Fixed mode)
            </Text>
            <Box
              py={4}
              style={{
                maxWidth: '100%',
                overflowX: 'auto',
              }}
            >
              <LensSelect
                ariaLabel="Preview model resolutions"
                data={lensItems}
                value={activeFixedKey}
                onChange={(val) =>
                  updateSettings({
                    resolutionMode: 'fixed',
                    fixedResolution: String(val),
                  })
                }
                itemSize={72}
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
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
