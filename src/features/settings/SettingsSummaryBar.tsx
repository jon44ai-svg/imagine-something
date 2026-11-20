import { Badge, Button, Card, Collapse, Group, Stack, Text } from '@mantine/core';
import { IconAdjustments, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../app/state/SettingsContext';
import { computeDimensions, round64 } from '../../utils/dimensions';

export function SettingsSummaryBar() {
  const { settings, toggleSettingsHidden } = useSettings();
  const navigate = useNavigate();

  let sizeLabel: string;
  if (settings.aspectRatio === 'match') {
    sizeLabel = `Match Input | ${settings.baseSize}px`;
  } else if (settings.aspectRatio === 'custom') {
    sizeLabel = `${round64(settings.customWidth)}x${round64(settings.customHeight)}`;
  } else {
    const dims = computeDimensions(settings.aspectRatio, settings.baseSize);
    sizeLabel = `${settings.aspectRatio} | ${dims.width}x${dims.height}`;
  }

  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
            <Badge variant="default" size="sm">
              {settings.model || 'No model'}
            </Badge>
            <Badge variant="default" size="sm">
              {sizeLabel}
            </Badge>
            <Badge variant="default" size="sm">
              {settings.numberResults} / img
            </Badge>
            <Badge variant="default" size="sm">
              {settings.outputFormat} {settings.outputQuality}%
            </Badge>
            <Badge variant="light" color="indigo" size="sm">
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
