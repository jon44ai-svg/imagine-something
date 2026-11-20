import { Led } from '@gfazioli/mantine-led';
import { Badge, Button, Card, Collapse, Group, Stack, Text } from '@mantine/core';
import { IconAdjustments, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useExecution } from '../../app/state/ExecutionContext';
import { useSettings } from '../../app/state/SettingsContext';
import { formatSizingPreview } from '../../domain/modelCapabilities';
import { useModelLibrary } from './useModelLibrary';

export function SettingsSummaryBar() {
  const { settings, apiKey, toggleSettingsHidden } = useSettings();
  const { isRunning } = useExecution();
  const { supportedDimensionsFor } = useModelLibrary();
  const navigate = useNavigate();

  const supportedDims = supportedDimensionsFor(settings.model);
  const preview = formatSizingPreview(settings, supportedDims);
  const sizeLabel =
    supportedDims.length > 0 || settings.aspectRatio === 'custom' || settings.aspectRatio === 'match'
      ? preview
      : `${settings.aspectRatio} | ${preview}`;

  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
            <Led
              variant="neon"
              size={10}
              color={isRunning ? 'cyan' : apiKey.trim() ? 'teal' : 'yellow'}
              animate={isRunning}
              animationType="pulse"
              tooltip={
                isRunning
                  ? 'Pipeline active'
                  : apiKey.trim()
                    ? 'Runware API armed'
                    : 'API key missing'
              }
            />
            <Badge variant="default" size="sm" className="cyber-mono">
              {settings.model || 'No model'}
            </Badge>
            <Badge variant="default" size="sm" className="cyber-mono">
              {sizeLabel}
            </Badge>
            <Badge variant="default" size="sm" className="cyber-mono">
              {settings.numberResults} / img
            </Badge>
            <Badge variant="default" size="sm" className="cyber-mono">
              {settings.outputFormat} {settings.outputQuality}%
            </Badge>
            <Badge variant="light" color="cyan" size="sm" className="cyber-mono">
              {settings.deliveryMethod.toUpperCase()} &bull; {settings.concurrency}x
            </Badge>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              rightSection={
                settings.settingsHidden ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronUp size={14} />
                )
              }
              onClick={toggleSettingsHidden}
            >
              {settings.settingsHidden ? 'Show Prompt' : 'Hide Prompt'}
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconAdjustments size={14} />}
              onClick={() => navigate('/settings')}
            >
              Edit Settings
            </Button>
          </Group>
        </Group>

        <Collapse expanded={!settings.settingsHidden}>
          <Text size="xs" c="dimmed" fs="italic" lineClamp={2}>
            {settings.positivePrompt.trim()
              ? `"${settings.positivePrompt.trim()}"`
              : 'No prompt set — click Edit Settings to configure your Runware API key and prompt.'}
          </Text>
        </Collapse>
      </Stack>
    </Card>
  );
}
