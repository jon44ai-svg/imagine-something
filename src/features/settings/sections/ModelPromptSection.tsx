import { DepthSelect, type DepthSelectItem } from '@gfazioli/mantine-depth-select';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  CloseButton,
  Grid,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconLayersLinked, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../app/state/SettingsContext';
import { CUSTOM_MODEL_VALUE, MODEL_PRESETS } from '../../../domain/presets';
import { useModelLibrary } from '../useModelLibrary';

export function ModelPromptSection() {
  const { settings, updateSettings, applyModelPreset, requestedFocusField, requestFocusField } =
    useSettings();
  const { library, isFavorite, setFavorite, blockedFor, supportedDimensionsFor } = useModelLibrary();
  const [deckOpen, setDeckOpen] = useState(false);

  const modelInputRef = useRef<HTMLInputElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (requestedFocusField === 'model') {
      modelInputRef.current?.focus();
      requestFocusField(null);
    } else if (requestedFocusField === 'positivePrompt') {
      promptRef.current?.focus();
      requestFocusField(null);
    }
  }, [requestedFocusField, requestFocusField]);

  const presetOptions = useMemo(
    () => [
      ...Object.values(MODEL_PRESETS).map((preset) => ({
        value: preset.id,
        label: preset.label,
      })),
      { value: CUSTOM_MODEL_VALUE, label: 'Custom AIR ID...' },
    ],
    [],
  );

  const selectedPreset = Object.prototype.hasOwnProperty.call(MODEL_PRESETS, settings.model)
    ? settings.model
    : CUSTOM_MODEL_VALUE;

  const selectModelId = (modelId: string) => {
    if (Object.prototype.hasOwnProperty.call(MODEL_PRESETS, modelId)) {
      applyModelPreset(modelId);
    } else {
      updateSettings({ model: modelId });
    }
  };

  const deckItems = useMemo<DepthSelectItem[]>(() => {
    const ids = new Set<string>([
      ...library.favorites,
      ...Object.keys(MODEL_PRESETS),
      'meta:muse@image',
    ]);
    if (settings.model.trim()) ids.add(settings.model.trim());

    return [...ids].map((modelId) => {
      const preset = MODEL_PRESETS[modelId];
      const dims = supportedDimensionsFor(modelId);
      const blocked = blockedFor(modelId);
      const fav = isFavorite(modelId);
      return {
        value: modelId,
        view: (
          <Card
            withBorder
            p="sm"
            radius="md"
            h="100%"
            style={{
              background:
                'linear-gradient(135deg, rgba(13, 24, 42, 0.95), rgba(19, 17, 46, 0.92))',
              borderColor: fav ? 'rgba(250, 204, 21, 0.45)' : 'rgba(56, 189, 248, 0.28)',
            }}
          >
            <Stack gap={6} justify="space-between" h="100%">
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={700} className="cyber-mono" truncate>
                  {modelId}
                </Text>
                {fav && (
                  <Badge size="xs" color="yellow" variant="light">
                    Favorite
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {preset ? preset.label : 'Custom / Learned Runware AIR model'}
              </Text>
              <Group gap={6} wrap="wrap">
                {dims.length > 0 && (
                  <Badge size="xs" color="cyan" variant="outline" className="cyber-mono">
                    {dims.length} saved sizes
                  </Badge>
                )}
                {blocked.length > 0 && (
                  <Badge size="xs" color="violet" variant="light" className="cyber-mono">
                    omits: {blocked.join(', ')}
                  </Badge>
                )}
                {dims.length === 0 && blocked.length === 0 && (
                  <Badge size="xs" color="gray" variant="light">
                    Flexible 64px grid
                  </Badge>
                )}
              </Group>
            </Stack>
          </Card>
        ),
      };
    });
  }, [library, settings.model, supportedDimensionsFor, blockedFor, isFavorite]);

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Title order={5}>Model &amp; Prompt</Title>
            <Text size="xs" c="dimmed">
              Choose a preset, flip through the 3D Model Deck, or enter any Runware AIR model ID
            </Text>
          </div>
          <Button
            size="compact-xs"
            variant={deckOpen ? 'filled' : 'light'}
            color="cyan"
            leftSection={<IconLayersLinked size={14} />}
            onClick={() => setDeckOpen((prev) => !prev)}
          >
            {deckOpen ? 'Hide 3D Model Deck' : '3D Model Deck'}
          </Button>
        </Group>

        {deckOpen && (
          <Box
            pt={64}
            pb="md"
            px="xs"
            style={{
              display: 'flex',
              justifyContent: 'center',
              borderRadius: 10,
              background: 'rgba(6, 11, 22, 0.72)',
              border: '1px solid rgba(56, 189, 248, 0.16)',
            }}
          >
            <DepthSelect
              ariaLabel="3D Model Deck"
              data={deckItems}
              value={settings.model}
              onChange={(val) => selectModelId(String(val))}
              w={380}
              h={126}
              visibleCards={4}
              translateYStep={18}
              loop
            />
          </Box>
        )}

        <Grid>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Select
              label="Model Preset"
              data={presetOptions}
              value={selectedPreset}
              allowDeselect={false}
              onChange={(val) => {
                if (!val) return;
                if (val === CUSTOM_MODEL_VALUE) {
                  updateSettings({ steps: '', CFGScale: '', acceleration: 'omit' });
                  modelInputRef.current?.focus();
                } else {
                  applyModelPreset(val);
                }
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 7 }}>
            <TextInput
              ref={modelInputRef}
              label="Model (AIR ID)"
              placeholder="e.g. runware:400@6, google:nano-banana@2.1, or meta:muse@image"
              value={settings.model}
              rightSectionPointerEvents="all"
              rightSection={
                <ActionIcon
                  variant="subtle"
                  color={isFavorite(settings.model) ? 'yellow' : 'gray'}
                  aria-label={
                    isFavorite(settings.model) ? 'Remove favorite model' : 'Add favorite model'
                  }
                  disabled={!settings.model.trim()}
                  onClick={() => setFavorite(settings.model, !isFavorite(settings.model))}
                >
                  {isFavorite(settings.model) ? (
                    <IconStarFilled size={16} />
                  ) : (
                    <IconStar size={16} />
                  )}
                </ActionIcon>
              }
              onChange={(event) => {
                const nextModel = event.currentTarget.value.trim();
                selectModelId(nextModel);
              }}
            />
          </Grid.Col>
        </Grid>

        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Favorite models
            </Text>
            <Button
              size="compact-xs"
              variant="default"
              disabled={!settings.model.trim() || isFavorite(settings.model)}
              onClick={() => setFavorite(settings.model, true)}
            >
              Save current model
            </Button>
          </Group>
          {library.favorites.length === 0 ? (
            <Text size="xs" c="dimmed">
              Star a model to keep it here. Unsupported parameters and allowed resolutions are
              remembered automatically after Runware reports them.
            </Text>
          ) : (
            <Group gap={6}>
              {library.favorites.map((modelId) => (
                <Badge
                  key={modelId}
                  variant={settings.model === modelId ? 'filled' : 'light'}
                  color="yellow"
                  style={{ cursor: 'pointer' }}
                  rightSection={
                    <CloseButton
                      size="xs"
                      aria-label={`Remove ${modelId} from favorites`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setFavorite(modelId, false);
                      }}
                    />
                  }
                  onClick={() => selectModelId(modelId)}
                >
                  {modelId}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>

        <Textarea
          ref={promptRef}
          label="Prompt"
          description="Applied to every image in the pipeline"
          placeholder="Describe how to edit each image (e.g., Make this a remarkable photo by converting it to 4-6 colors only, round pixels 80's style)..."
          minRows={3}
          autosize
          value={settings.positivePrompt}
          onChange={(event) => updateSettings({ positivePrompt: event.currentTarget.value })}
        />
      </Stack>
    </Card>
  );
}
