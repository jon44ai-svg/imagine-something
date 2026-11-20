import { Accordion, Grid, Select, TextInput } from '@mantine/core';
import { useSettings } from '../../../app/state/SettingsContext';
import type { AccelerationMode, InputMode, OutputDeliveryType } from '../../../domain/models';
import {
  ACCELERATION_OPTIONS,
  INPUT_MODE_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
} from '../../../domain/presets';

export function AdvancedParamsSection() {
  const { settings, updateSettings } = useSettings();

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
                description="Optional — omitted from API payload if blank"
                placeholder="Elements to avoid (leave blank to omit)..."
                value={settings.negativePrompt}
                onChange={(event) => updateSettings({ negativePrompt: event.currentTarget.value })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3 }}>
              <TextInput
                label="Steps"
                description="Blank = omit"
                placeholder="4"
                type="number"
                value={settings.steps}
                onChange={(event) => updateSettings({ steps: event.currentTarget.value.trim() })}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3 }}>
              <TextInput
                label="CFGScale"
                description="Blank = omit"
                placeholder="3.5"
                type="number"
                step="0.5"
                value={settings.CFGScale}
                onChange={(event) =>
                  updateSettings({ CFGScale: event.currentTarget.value.trim() })
                }
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Acceleration"
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
                data={INPUT_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={settings.inputMode}
                allowDeselect={false}
                onChange={(val) => {
                  if (val) updateSettings({ inputMode: val as InputMode });
                }}
              />
            </Grid.Col>

            {settings.inputMode === 'seedImage' && (
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
