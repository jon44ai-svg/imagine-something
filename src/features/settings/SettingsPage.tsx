import { Badge, Button, Container, Group, Stack, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { AdvancedParamsSection } from './sections/AdvancedParamsSection';
import { CredentialsSection } from './sections/CredentialsSection';
import { DimensionsOutputSection } from './sections/DimensionsOutputSection';
import { ExecutionModeSection } from './sections/ExecutionModeSection';
import { ModelPromptSection } from './sections/ModelPromptSection';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <Container size="lg" px={0}>
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="sm">
            <Title order={3}>Generation Settings</Title>
            <Badge variant="light" color="gray" size="sm">
              Auto-saved to localStorage
            </Badge>
          </Group>
          <Button
            size="xs"
            variant="default"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => navigate('/pipeline')}
          >
            Back to Pipeline
          </Button>
        </Group>

        <CredentialsSection />
        <ModelPromptSection />
        <DimensionsOutputSection />
        <ExecutionModeSection />
        <AdvancedParamsSection />
      </Stack>
    </Container>
  );
}
