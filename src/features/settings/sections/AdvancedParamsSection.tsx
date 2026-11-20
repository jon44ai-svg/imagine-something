import { Accordion, Grid, Select, TextInput } from '@mantine/core';
import { useSettings } from '../../../app/state/SettingsContext';
import { resolveModelCapabilities } from '../../../domain/modelCapabilities';
import type { AccelerationMode, InputMode, OutputDeliveryType } from '../../../domain/models';
import {
  ACCELERATION_OPTIONS,
  INPUT_MODE_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
} from '../../../domain/presets';

export function AdvancedParamsSection() {
  const { settings, updateSettings } = useSettings();
  const capabilities = resolveModelCapabilities(settings.model);

  return (
    <Accordion variant="contained" radius="md">
      <Accordion.Item value="advanced">
        <Accordion.Control>
          Advanced Model &amp; API Parameters (Steps, CFG, Acceleration, Input Mode, Negative
          Prompt)
        </Accordion.Control>
        <Accordion.Panel>
          <Grid>
            <Grid.Col span={12}>
              <TextInput
                label="Negative Prompt"
                description={
                  capabilities.supportsNegativePrompt
                    ? 'Optional — omitted from API payload if blank'
                    : 'Not supported by this model — omitted automatically'
                }
                placeholder="Elements to avoid (leave blank to omit)..."
                disabled={!capabilities.supportsNegativePrompt}
                value={settings.negativePrompt}
                onChange={(event) => updateSettings({ negativePrompt: event.currentTarget.value })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3 }}>
              <TextInput
                label="Steps"
                description={
                  capabilities.supportsSteps ? 'Blank = omit' : 'Not supported — omitted'
                }
                placeholder="4"
                type="number"
                disabled={!capabilities.supportsSteps}
                value={settings.steps}
                onChange={(event) => updateSettings({ steps: event.currentTarget.value.trim() })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3 }}>
              <TextInput
                label="CFGScale"
                description={
                  capabilities.supportsCfgScale ? 'Blank = omit' : 'Not supported — omitted'
                }
                placeholder="3.5"
                type="number"
                step="0.5"
                disabled={!capabilities.supportsCfgScale}
                value={settings.CFGScale}
                onChange={(event) =>
                  updateSettings({ CFGScale: event.currentTarget.value.trim() })
                }
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Acceleration"
                description={
                  capabilities.supportsAcceleration ? undefined : 'Not supported — omitted'
                }
                disabled={!capabilities.supportsAcceleration}
                data={ACCELERATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={settings.acceleration}
                allowDeselect={false}
                onChange={(val) => {
                  if (val) updateSettings({ acceleration: val as AccelerationMode });
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Image Input Field"
                description={
                  capabilities.supportsSeedImage
                    ? undefined
                    : 'This model requires inputs.referenceImages'
                }
                disabled={!capabilities.supportsSeedImage}
                data={INPUT_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={capabilities.supportsSeedImage ? settings.inputMode : 'referenceImages'}
                allowDeselect={false}
                onChange={(val) => {
                  if (val) updateSettings({ inputMode: val as InputMode });
                }}
              />
            </Grid.Col>

            {capabilities.supportsSeedImage && settings.inputMode === 'seedImage' && (
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Strength"
                  description="0.05 – 1.0"
                  type="number"
                  step="0.05"
                  min={0.05}
                  max={1}
                  value={settings.strength}
                  onChange={(event) =>
                    updateSettings({ strength: event.currentTarget.value.trim() })
                  }
                />
              </Grid.Col>
            )}

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="API Output Delivery"
                description="dataURI avoids CORS"
                data={OUTPUT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={settings.outputType}
                allowDeselect={false}
                onChange={(val) => {
                  if (val) updateSettings({ outputType: val as OutputDeliveryType });
                }}
              />
            </Grid.Col>
          </Grid>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
