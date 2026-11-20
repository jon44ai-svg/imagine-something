import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconDownload,
  IconListDetails,
  IconPhoto,
  IconSettings,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useServices } from '../../app/ServicesContext';
import { useExecution } from '../../app/state/ExecutionContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import { MAX_IMAGES } from '../../domain/presets';
import { LightboxModal } from '../lightbox/LightboxModal';

export function AppShellLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [isZipping, setIsZipping] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { exportZipArchive } = useServices();
  const { inputs, outputs, totalCost } = useQueueData();
  const { apiKey, settings } = useSettings();
  const { isRunning, progress } = useExecution();

  const settingsIncomplete = !apiKey.trim() || !settings.positivePrompt.trim();

  const handleNav = (path: string) => {
    navigate(path);
    closeMobile();
  };

  const handleDownloadZip = async () => {
    if (outputs.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      const result = await exportZipArchive.execute();
      if (result.fileCount === 0) {
        notifications.show({
          message: 'No downloadable image blobs available.',
          color: 'red',
        });
      } else {
        notifications.show({
          message: `Downloaded ZIP with ${result.fileCount} image(s).`,
          color: 'teal',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notifications.show({
        message: `ZIP creation failed: ${msg}`,
        color: 'red',
      });
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Box
              w={34}
              h={34}
              style={{
                borderRadius: 9,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 16,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              R
            </Box>
            <Box>
              <Title order={4} size="h5" lh={1.2}>
                Runware I2I Pipeline
              </Title>
              <Text size="xs" c="dimmed" visibleFrom="xs">
                Batch image-to-image editor &bull; LocalStorage + IndexedDB
              </Text>
            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap">
            {isRunning && progress && (
              <Badge color="indigo" variant="light" visibleFrom="md">
                Active: {progress.activeIds.length}
              </Badge>
            )}
            <Badge variant="default" size="md" visibleFrom="sm">
              Queue: {inputs.length} / {MAX_IMAGES}
            </Badge>
            <Badge variant="default" size="md" visibleFrom="sm">
              Outputs: {outputs.length}
            </Badge>
            {totalCost > 0 && (
              <Badge color="teal" variant="light" size="md" visibleFrom="md">
                Cost: ${totalCost.toFixed(4)}
              </Badge>
            )}
            <Button
              size="xs"
              color="teal"
              variant="light"
              leftSection={<IconDownload size={14} />}
              disabled={outputs.length === 0}
              loading={isZipping}
              onClick={() => void handleDownloadZip()}
            >
              {isZipping ? 'Building ZIP...' : 'Download All (ZIP)'}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack gap={4} h="100%" justify="space-between">
          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="xs" mb={4}>
              Workspace
            </Text>
            <NavLink
              label="Pipeline"
              description="Upload & batch process"
              leftSection={<IconListDetails size={18} />}
              rightSection={
                <Badge size="xs" variant="light" color="indigo">
                  {inputs.length}
                </Badge>
              }
              active={location.pathname === '/pipeline'}
              onClick={() => handleNav('/pipeline')}
            />
            <NavLink
              label="Outputs Gallery"
              description="Browse generated results"
              leftSection={<IconPhoto size={18} />}
              rightSection={
                <Badge size="xs" variant="light" color="teal">
                  {outputs.length}
                </Badge>
              }
              active={location.pathname === '/gallery'}
              onClick={() => handleNav('/gallery')}
            />
            <NavLink
              label="Settings"
              description="Model, sizing & concurrency"
              leftSection={<IconSettings size={18} />}
              rightSection={
                settingsIncomplete ? (
                  <Badge size="xs" variant="filled" color="yellow">
                    Setup
                  </Badge>
                ) : undefined
              }
              active={location.pathname === '/settings'}
              onClick={() => handleNav('/settings')}
            />
          </Stack>

          <Stack gap={4} px="xs" pb="xs">
            <Text size="xs" c="dimmed">
              Mode: {settings.deliveryMethod.toUpperCase()} &bull; {settings.concurrency}x parallel
            </Text>
            {totalCost > 0 && (
              <Text size="xs" c="teal">
                Total cost: ${totalCost.toFixed(4)}
              </Text>
            )}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <LightboxModal />
    </AppShell>
  );
}
