import { Led } from '@gfazioli/mantine-led';
import { spotlight } from '@mantine/spotlight';
import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Group,
  Kbd,
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
  IconSearch,
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
import { AspectCompatibilityModal } from '../pipeline/AspectCompatibilityModal';
import { CommandSpotlight } from '../spotlight/CommandSpotlight';

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
        width: 248,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header px="md" className="cyber-shell-header">
        <Group h="100%" justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Box
              w={34}
              h={34}
              style={{
                borderRadius: 9,
                background: 'linear-gradient(135deg, #06b6d4, #6366f1 60%, #a855f7)',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.35)',
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
                Batch image-to-image studio &bull; LocalStorage + IndexedDB
              </Text>
            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              variant="default"
              leftSection={<IconSearch size={13} />}
              rightSection={
                <Kbd size="xs" style={{ fontSize: 10 }}>
                  Ctrl+K
                </Kbd>
              }
              visibleFrom="md"
              className="cyber-hud-pill"
              onClick={() => spotlight.open()}
            >
              Commands
            </Button>

            {isRunning && progress && (
              <Badge
                color="cyan"
                variant="light"
                visibleFrom="md"
                className="cyber-mono"
                leftSection={
                  <Led variant="neon" size={7} color="cyan" animate animationType="pulse" />
                }
              >
                Active: {progress.activeIds.length}
              </Badge>
            )}
            <Badge variant="default" size="md" visibleFrom="sm" className="cyber-mono">
              Queue: {inputs.length} / {MAX_IMAGES}
            </Badge>
            <Badge variant="default" size="md" visibleFrom="sm" className="cyber-mono">
              Outputs: {outputs.length}
            </Badge>
            {totalCost > 0 && (
              <Badge color="teal" variant="light" size="md" visibleFrom="md" className="cyber-mono">
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

      <AppShell.Navbar p="sm" className="cyber-shell-navbar">
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
                <Badge size="xs" variant="light" color="cyan" className="cyber-mono">
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
                <Badge size="xs" variant="light" color="teal" className="cyber-mono">
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

          <Stack gap={6} px="xs" pb="xs">
            <Group gap={6} wrap="nowrap">
              <Led
                variant="neon"
                size={8}
                color={apiKey.trim() ? 'teal' : 'yellow'}
                animate={isRunning}
                animationType="breathe"
              />
              <Text size="xs" c="dimmed" className="cyber-mono">
                {apiKey.trim() ? 'API ARMED' : 'API KEY NEEDED'}
              </Text>
            </Group>
            <Text size="xs" c="dimmed" className="cyber-mono">
              Mode: {settings.deliveryMethod.toUpperCase()} &bull; {settings.concurrency}x parallel
            </Text>
            {totalCost > 0 && (
              <Text size="xs" c="teal" className="cyber-mono">
                Total cost: ${totalCost.toFixed(4)}
              </Text>
            )}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <CommandSpotlight />
      <AspectCompatibilityModal />
      <LightboxModal />
    </AppShell>
  );
}
