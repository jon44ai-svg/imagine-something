import { Card, Grid, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../../../app/state/SettingsContext';
import { CUSTOM_MODEL_VALUE, MODEL_PRESETS } from '../../../domain/presets';

export function ModelPromptSection() {
  const { settings, updateSettings, applyModelPreset, requestedFocusField, requestFocusField } =
    useSettings();

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

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="md">
        <div>
          <Title order={5}>Model &amp; Prompt</Title>
          <Text size="xs" c="dimmed">
            Choose a preset or enter any Runware AIR model ID; prompt applies to every queued image
          </Text>
        </div>

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
              placeholder="e.g. runware:400@6 or google:nano-banana@2.1"
              value={settings.model}
              onChange={(event) => {
                const nextModel = event.currentTarget.value.trim();
                if (Object.prototype.hasOwnProperty.call(MODEL_PRESETS, nextModel)) {
                  applyModelPreset(nextModel);
                } else {
                  updateSettings({ model: nextModel });
                }
              }}
            />
          </Grid.Col>
        </Grid>

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
