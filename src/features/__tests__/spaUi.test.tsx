import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AppContainer } from '../../app/container';
import { AppRoutes } from '../../app/router';
import { ServicesProvider } from '../../app/ServicesContext';
import { ExecutionProvider } from '../../app/state/ExecutionContext';
import { LightboxProvider } from '../../app/state/LightboxContext';
import { QueueDataProvider } from '../../app/state/QueueDataContext';
import { SettingsProvider } from '../../app/state/SettingsContext';
import { appTheme } from '../../app/theme';
import type { GenerationSettings, InputRecord, OutputRecord } from '../../domain/models';
import { DEFAULT_SETTINGS } from '../../domain/presets';

function createStubContainer(initial?: {
  settings?: Partial<GenerationSettings>;
  inputs?: InputRecord[];
  outputs?: OutputRecord[];
}): AppContainer {
  let settings: GenerationSettings = { ...DEFAULT_SETTINGS, ...initial?.settings };
  let apiKey = 'rw_test';
  const inputs = initial?.inputs ?? [];
  const outputs = initial?.outputs ?? [];

  return {
    settingsReader: { load: async () => ({ ...settings }) },
    settingsWriter: {
      save: async (next) => {
        settings = { ...next };
      },
    },
    credentialReader: { getApiKey: async () => apiKey },
    credentialWriter: {
      setApiKey: async (key) => {
        apiKey = key;
      },
    },
    inputReader: {
      list: async () => [...inputs],
      getById: async (id) => inputs.find((i) => i.id === id),
    },
    outputReader: {
      list: async () => [...outputs],
      listByInputId: async (inputId) => outputs.filter((o) => o.inputId === inputId),
    },
    objectUrlRegistry: {
      acquire: (id) => `blob:mock/${id}`,
      release: vi.fn(),
      releaseAll: vi.fn(),
    },
    ingestFiles: { execute: vi.fn() } as unknown as AppContainer['ingestFiles'],
    removeInput: { execute: vi.fn().mockResolvedValue([]) } as unknown as AppContainer['removeInput'],
    removeOutput: { execute: vi.fn().mockResolvedValue(undefined) } as unknown as AppContainer['removeOutput'],
    resetQueue: { execute: vi.fn().mockResolvedValue([]) } as unknown as AppContainer['resetQueue'],
    clearStorage: {
      clearOutputs: vi.fn().mockResolvedValue(undefined),
      clearAll: vi.fn().mockResolvedValue(undefined),
    } as unknown as AppContainer['clearStorage'],
    recoverStuckItems: {
      execute: vi.fn().mockResolvedValue([...inputs]),
    } as unknown as AppContainer['recoverStuckItems'],
    validatePreflight: {
      execute: vi.fn().mockReturnValue({ ok: true }),
    } as unknown as AppContainer['validatePreflight'],
    runBatchPipeline: { execute: vi.fn() } as unknown as AppContainer['runBatchPipeline'],
    exportSingleOutput: { execute: vi.fn() } as unknown as AppContainer['exportSingleOutput'],
    exportZipArchive: {
      execute: vi.fn().mockResolvedValue({ fileCount: 0, archiveName: '' }),
    } as unknown as AppContainer['exportZipArchive'],
  };
}

function renderAppAt(route: string, container: AppContainer) {
  return render(
    <MantineProvider theme={appTheme} defaultColorScheme="dark">
      <ModalsProvider>
        <MemoryRouter initialEntries={[route]}>
          <ServicesProvider container={container}>
            <SettingsProvider>
              <QueueDataProvider>
                <ExecutionProvider>
                  <LightboxProvider>
                    <AppRoutes />
                  </LightboxProvider>
                </ExecutionProvider>
              </QueueDataProvider>
            </SettingsProvider>
          </ServicesProvider>
        </MemoryRouter>
      </ModalsProvider>
    </MantineProvider>,
  );
}

describe('SPA UI flows (Settings & Lightbox)', () => {
  it('reveals async polling controls when switching Delivery Method to Async on /settings', async () => {
    const user = userEvent.setup();
    const container = createStubContainer();
    renderAppAt('/settings', container);

    expect(await screen.findByText('Generation Settings')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Async Poll Interval/i)).not.toBeInTheDocument();

    await user.click(screen.getByText('Async (Submit + Poll)'));

    expect(await screen.findByLabelText(/Async Poll Interval/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Async Job Timeout/i)).toBeInTheDocument();
  });

  it('auto-fills model preset parameters when selecting another AIR model preset on /settings', async () => {
    const user = userEvent.setup();
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    const container = createStubContainer();
    container.settingsWriter.save = saveSpy;

    renderAppAt('/settings', container);
    expect(await screen.findByText('Generation Settings')).toBeInTheDocument();

    const presetInput = screen.getByRole('combobox', { name: 'Model Preset' });
    await user.click(presetInput);
    await user.click(await screen.findByText('runware:400@3 (Flux.2 Klein)'));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'runware:400@3',
          steps: '',
          CFGScale: '',
          acceleration: 'omit',
          inputMode: 'referenceImages',
        }),
      );
    });
  });

  it('opens Lightbox from Gallery, navigates with ArrowRight/ArrowLeft, toggles Side-by-Side, and closes with Escape', async () => {
    const user = userEvent.setup();
    const input: InputRecord = {
      id: 'in-1',
      name: 'cat.png',
      type: 'image/png',
      width: 512,
      height: 512,
      blob: new Blob(['a'], { type: 'image/png' }),
      status: 'done',
      error: '',
      order: 1,
      createdAt: 100,
    };
    const outputs: OutputRecord[] = [
      {
        id: 'out-1',
        inputId: 'in-1',
        inputName: 'cat.png',
        blob: new Blob(['o1'], { type: 'image/jpeg' }),
        imageURL: '',
        format: 'JPG',
        width: 1024,
        height: 1024,
        prompt: 'cyberpunk cat',
        model: 'runware:400@6',
        seed: 101,
        cost: 0.002,
        createdAt: 200,
      },
      {
        id: 'out-2',
        inputId: 'in-1',
        inputName: 'cat.png',
        blob: new Blob(['o2'], { type: 'image/jpeg' }),
        imageURL: '',
        format: 'JPG',
        width: 1024,
        height: 1024,
        prompt: 'cyberpunk cat',
        model: 'runware:400@6',
        seed: 202,
        cost: 0.003,
        createdAt: 300,
      },
    ];

    const container = createStubContainer({ inputs: [input], outputs });
    renderAppAt('/gallery', container);

    const thumbs = await screen.findAllByAltText('cat.png');
    expect(thumbs).toHaveLength(2);

    // Gallery sorts newest-first, so clicking second thumb opens out-1 (index 1 / 2)
    await user.click(thumbs[1]);
    expect(await screen.findByText('cat.png (1 / 2)')).toBeInTheDocument();

    // Keyboard ArrowRight moves to (2 / 2)
    await user.keyboard('{ArrowRight}');
    expect(await screen.findByText('cat.png (2 / 2)')).toBeInTheDocument();

    // Keyboard ArrowLeft moves back to (1 / 2)
    await user.keyboard('{ArrowLeft}');
    expect(await screen.findByText('cat.png (1 / 2)')).toBeInTheDocument();

    // Side-by-Side toggle shows Original Input and Generated Output
    await user.click(screen.getByRole('button', { name: /Side-by-Side: Off/i }));
    expect(await screen.findByText('Original Input')).toBeInTheDocument();
    expect(screen.getByText('Generated Output')).toBeInTheDocument();

    // Escape closes modal
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('cat.png (1 / 2)')).not.toBeInTheDocument();
    });
  });
});
