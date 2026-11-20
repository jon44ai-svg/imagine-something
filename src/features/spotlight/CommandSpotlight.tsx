import {
  Spotlight,
  type SpotlightActionData,
  type SpotlightActionGroupData,
} from '@mantine/spotlight';
import { notifications } from '@mantine/notifications';
import {
  IconAspectRatio,
  IconClock,
  IconCpu,
  IconDownload,
  IconListDetails,
  IconPhoto,
  IconPlayerPlay,
  IconPlayerStop,
  IconSearch,
  IconSettings,
  IconStarFilled,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../../app/ServicesContext';
import { useExecution } from '../../app/state/ExecutionContext';
import { useLightbox } from '../../app/state/LightboxContext';
import { useQueueData } from '../../app/state/QueueDataContext';
import { useSettings } from '../../app/state/SettingsContext';
import { MODEL_PRESETS } from '../../domain/presets';
import { useModelLibrary } from '../settings/useModelLibrary';

export function CommandSpotlight() {
  const navigate = useNavigate();
  const { exportZipArchive } = useServices();
  const { settings, updateSettings, applyModelPreset } = useSettings();
  const { inputs, outputs } = useQueueData();
  const { isRunning, runPipeline, stopAll } = useExecution();
  const { openAspectPreview } = useLightbox();
  const { library } = useModelLibrary();

  const groups = useMemo<SpotlightActionGroupData[]>(() => {
    const navActions: SpotlightActionData[] = [
      {
        id: 'nav-pipeline',
        label: 'Go to Pipeline',
        description: `Upload & batch process (${inputs.length} queued)`,
        leftSection: <IconListDetails size={18} />,
        onClick: () => navigate('/pipeline'),
      },
      {
        id: 'nav-gallery',
        label: 'Go to Outputs Gallery',
        description: `Browse ${outputs.length} generated image(s)`,
        leftSection: <IconPhoto size={18} />,
        onClick: () => navigate('/gallery'),
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'Model, dimensions, concurrency & API key',
        leftSection: <IconSettings size={18} />,
        onClick: () => navigate('/settings'),
      },
    ];

    const commandActions: SpotlightActionData[] = [
      isRunning
        ? {
            id: 'cmd-stop',
            label: 'Stop Active Batch',
            description: 'Cancel running pipeline requests',
            leftSection: <IconPlayerStop size={18} />,
            onClick: () => stopAll(),
          }
        : {
            id: 'cmd-run',
            label: 'Run Pipeline',
            description:
              inputs.length > 0
                ? `Start processing queued images with ${settings.model}`
                : 'Queue is currently empty',
            leftSection: <IconPlayerPlay size={18} />,
            onClick: () => {
              if (inputs.length === 0) {
                notifications.show({ message: 'Add images to the pipeline first.', color: 'cyan' });
                return;
              }
              navigate('/pipeline');
              void runPipeline();
            },
          },
      {
        id: 'cmd-aspect',
        label: 'Verify Aspect Compatibility',
        description: 'Preview original images against target model aspect ratios',
        leftSection: <IconAspectRatio size={18} />,
        onClick: () => {
          if (inputs.length === 0) {
            notifications.show({ message: 'Queue at least one image first.', color: 'cyan' });
            return;
          }
          openAspectPreview();
        },
      },
      {
        id: 'cmd-toggle-time',
        label: settings.showGenerationTime
          ? 'Hide Generation Time Badges'
          : 'Show Generation Time Badges',
        description: 'Toggle elapsed generation time overlay on images',
        leftSection: <IconClock size={18} />,
        onClick: () => updateSettings({ showGenerationTime: !settings.showGenerationTime }),
      },
      {
        id: 'cmd-toggle-res-mode',
        label:
          settings.resolutionMode === 'infer'
            ? 'Switch Resolution Strategy to Fixed'
            : 'Switch Resolution Strategy to Infer from Input',
        description: 'Choose whether supported model resolutions are inferred per image or fixed',
        leftSection: <IconAspectRatio size={18} />,
        onClick: () =>
          updateSettings({
            resolutionMode: settings.resolutionMode === 'infer' ? 'fixed' : 'infer',
          }),
      },
      {
        id: 'cmd-download-zip',
        label: 'Download All Outputs (ZIP)',
        description: `Bundle ${outputs.length} generated output(s)`,
        leftSection: <IconDownload size={18} />,
        onClick: () => {
          if (outputs.length === 0) {
            notifications.show({ message: 'No outputs available to export.', color: 'cyan' });
            return;
          }
          void exportZipArchive.execute();
        },
      },
    ];

    const seenModels = new Set<string>();
    const modelActions: SpotlightActionData[] = [];

    for (const favId of library.favorites) {
      seenModels.add(favId.toLowerCase());
      modelActions.push({
        id: `model-fav-${favId}`,
        label: favId,
        description: 'Favorite model — click to switch immediately',
        leftSection: <IconStarFilled size={16} color="var(--mantine-color-yellow-4)" />,
        onClick: () => {
          if (Object.prototype.hasOwnProperty.call(MODEL_PRESETS, favId)) {
            applyModelPreset(favId);
          } else {
            updateSettings({ model: favId });
          }
          notifications.show({ message: `Switched model to ${favId}`, color: 'cyan' });
        },
      });
    }

    for (const preset of Object.values(MODEL_PRESETS)) {
      if (seenModels.has(preset.id.toLowerCase())) continue;
      seenModels.add(preset.id.toLowerCase());
      modelActions.push({
        id: `model-preset-${preset.id}`,
        label: preset.label,
        description: 'Built-in preset',
        leftSection: <IconCpu size={16} />,
        onClick: () => {
          applyModelPreset(preset.id);
          notifications.show({ message: `Switched model to ${preset.id}`, color: 'cyan' });
        },
      });
    }

    if (!seenModels.has('meta:muse@image')) {
      modelActions.push({
        id: 'model-muse',
        label: 'meta:muse@image',
        description: '8 saved resolutions • omits steps automatically',
        leftSection: <IconCpu size={16} />,
        onClick: () => {
          updateSettings({ model: 'meta:muse@image' });
          notifications.show({ message: 'Switched model to meta:muse@image', color: 'cyan' });
        },
      });
    }

    return [
      { group: 'Workspace Navigation', actions: navActions },
      { group: 'Pipeline & Inspection Actions', actions: commandActions },
      { group: 'Switch Model (Favorites & Presets)', actions: modelActions },
    ];
  }, [
    inputs.length,
    outputs.length,
    isRunning,
    settings.model,
    settings.showGenerationTime,
    settings.resolutionMode,
    library.favorites,
    navigate,
    runPipeline,
    stopAll,
    openAspectPreview,
    updateSettings,
    applyModelPreset,
    exportZipArchive,
  ]);

  return (
    <Spotlight
      actions={groups}
      nothingFound="No matching commands or models..."
      highlightQuery
      scrollable
      maxHeight={420}
      shortcut={['mod + K', '/']}
      searchProps={{
        leftSection: <IconSearch size={18} stroke={1.5} />,
        placeholder: 'Search commands, favorite models, routes...',
      }}
    />
  );
}
