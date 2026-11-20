import { Card, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useSettings } from '../../../app/state/SettingsContext';

export function CredentialsSection() {
  const { apiKey, setApiKey, requestedFocusField, requestFocusField } = useSettings();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (requestedFocusField === 'apiKey') {
      inputRef.current?.focus();
      requestFocusField(null);
    }
  }, [requestedFocusField, requestFocusField]);

  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="sm">
        <div>
          <Title order={5}>API Credentials</Title>
          <Text size="xs" c="dimmed">
            Stored in browser localStorage only (`runware_i2i_api_key`)
          </Text>
        </div>

        <PasswordInput
          ref={inputRef}
          label="Runware API Key"
          placeholder="Paste your Runware API key..."
          value={apiKey}
          onChange={(event) => setApiKey(event.currentTarget.value)}
          autoComplete="off"
        />
      </Stack>
    </Card>
  );
}
