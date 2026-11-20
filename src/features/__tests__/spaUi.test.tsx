import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextMenuProvider } from 'mantine-contextmenu';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AppContainer } from '../../app/container';
import { LocalStorageModelLibraryStore } from '../../infrastructure/storage/localStorageModelLibraryStore';
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
    modelLibrary: new LocalStorageModelLibraryStore(),
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
    faceDetector: {
      detectFaces: vi.fn().mockResolvedValue({
        boxes: [{ x: 0.35, y: 0.15, width: 0.25, height: 0.25 }],
        source: 'heuristic',
      }),
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
      <ContextMenuProvider>
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
      </ContextMenuProvider>
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

    // Lightbox Zoom In & Focus Face work cleanly
    await user.click(screen.getByRole('button', { name: 'Lightbox zoom in' }));
    expect(await screen.findByText('135%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Focus Face' }));
    expect(await screen.findByRole('button', { name: 'Focus Face: On' })).toBeInTheDocument();

    // Escape closes modal
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('cat.png (1 / 2)')).not.toBeInTheDocument();
    });
  });

  it('supports per-image zoom and focus-on-face controls directly on pipeline cards', async () => {
    const user = userEvent.setup();
    const container = createStubContainer({
      inputs: [
        {
          id: 'in-1',
          name: 'portrait.png',
          type: 'image/png',
          blob: new Blob(['orig'], { type: 'image/png' }),
          width: 512,
          height: 512,
          status: 'done',
          error: '',
          order: 0,
          createdAt: 1000,
        },
      ],
      outputs: [
        {
          id: 'out-1',
          inputId: 'in-1',
          inputName: 'portrait.png',
          blob: new Blob(['gen1'], { type: 'image/png' }),
          imageURL: 'https://cdn.example/1.png',
          width: 512,
          height: 512,
          format: 'PNG',
          model: 'bfl:2@1',
          prompt: 'portrait edit',
          seed: 1,
          cost: 0.01,
          createdAt: 2000,
        },
      ],
    });

    renderAppAt('/pipeline', container);

    const zoomInButtons = await screen.findAllByRole('button', { name: 'Zoom in' });
    await user.click(zoomInButtons[0]);
    expect(await screen.findByText('135%')).toBeInTheDocument();

    const focusButtons = screen.getAllByRole('button', { name: 'Focus on face' });
    await user.click(focusButtons[1]);

    await waitFor(() => {
      expect(container.faceDetector.detectFaces).toHaveBeenCalledWith(
        'blob:mock/out-1',
        'out:out-1',
      );
    });
    expect(await screen.findByText('Face')).toBeInTheDocument();
  });

  it('displays generation duration badge on output images and hides it when toggled off in settings', async () => {
    const user = userEvent.setup();
    const container = createStubContainer({
      settings: { showGenerationTime: true },
      outputs: [
        {
          id: 'out-timed-1',
          inputId: 'in-1',
          inputName: 'cat.png',
          blob: new Blob(['gen1'], { type: 'image/png' }),
          imageURL: 'https://cdn.example/1.png',
          width: 1024,
          height: 1024,
          format: 'PNG',
          model: 'bfl:2@1',
          prompt: 'fast edit',
          seed: 1,
          cost: 0.01,
          durationMs: 4320,
          createdAt: 2000,
        },
      ],
    });

    renderAppAt('/gallery', container);

    // Shown by default when showGenerationTime is enabled
    expect(await screen.findByText('4.3s')).toBeInTheDocument();

    // Navigate to Settings and toggle off "Show generation time on images"
    await user.click(screen.getByText('Settings'));
    const toggle = await screen.findByLabelText(/Show generation time on images/i);
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();

    // Return to Gallery — badge should no longer be displayed on the image
    await user.click(screen.getByText('Outputs Gallery'));
    expect(await screen.findByText('cat.png')).toBeInTheDocument();
    expect(screen.queryByText('4.3s')).not.toBeInTheDocument();
  });

  it('saves, selects, and removes a favorite model from settings', async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    const container = createStubContainer();
    renderAppAt('/settings', container);
    expect(await screen.findByText('Generation Settings')).toBeInTheDocument();

    const modelInput = screen.getByLabelText('Model (AIR ID)');
    await user.clear(modelInput);
    await user.type(modelInput, 'meta:muse@image');
    await user.click(screen.getByRole('button', { name: 'Add favorite model' }));

    expect(await screen.findByText('meta:muse@image')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove meta:muse@image from favorites' }));
    expect(screen.queryByRole('button', { name: 'Remove meta:muse@image from favorites' })).not.toBeInTheDocument();
  });

  it('shows saved resolutions and Infer/Fixed toggle for meta:muse@image and opens Aspect Compatibility Preview', async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    const container = createStubContainer({
      settings: { model: 'meta:muse@image', resolutionMode: 'infer' },
      inputs: [
        {
          id: 'in-wide',
          name: 'landscape.png',
          type: 'image/png',
          blob: new Blob(['orig'], { type: 'image/png' }),
          width: 1920,
          height: 1280,
          status: 'pending',
          error: '',
          order: 0,
          createdAt: 1000,
        },
      ],
    });

    renderAppAt('/settings', container);
    expect(await screen.findByText('8 saved sizes')).toBeInTheDocument();
    expect(screen.getByText('Infer (8 sizes)')).toBeInTheDocument();

    await user.click(screen.getByText('Fixed Resolution'));
    expect(await screen.findByText('1600x1600 (Fixed)')).toBeInTheDocument();

    // Switch to Pipeline and open Aspect Compatibility Preview
    await user.click(screen.getByText('Pipeline'));
    expect(await screen.findByText('landscape.png')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Verify Aspect/i }));
    expect(await screen.findByText(/Aspect-Ratio Compatibility Preview/i)).toBeInTheDocument();
    expect(screen.getByText('Target Ratio Fit')).toBeInTheDocument();
  });

  it('supports Compare Slider, Spotlight Loupe in Lightbox and opens Command Spotlight', async () => {
    const user = userEvent.setup();
    const container = createStubContainer({
      inputs: [
        {
          id: 'in-c1',
          name: 'studio.png',
          type: 'image/png',
          blob: new Blob(['orig'], { type: 'image/png' }),
          width: 1024,
          height: 1024,
          status: 'done',
          error: '',
          order: 0,
          createdAt: 1000,
        },
      ],
      outputs: [
        {
          id: 'out-c1',
          inputId: 'in-c1',
          inputName: 'studio.png',
          blob: new Blob(['gen'], { type: 'image/webp' }),
          imageURL: '',
          prompt: 'neon cyber studio',
          model: 'meta:muse@image',
          width: 1600,
          height: 1600,
          format: 'WEBP',
          seed: 42,
          cost: 0.002,
          durationMs: 2400,
          createdAt: 2000,
        },
      ],
    });

    renderAppAt('/gallery', container);
    const thumb = await screen.findByAltText('studio.png');

    await user.click(thumb);
    expect(await screen.findByText('studio.png (1 / 1)')).toBeInTheDocument();

    // Toggle Spotlight Loupe in inspect mode
    await user.click(screen.getByRole('button', { name: 'Loupe' }));
    expect(screen.getByRole('button', { name: 'Loupe: On' })).toBeInTheDocument();

    // Switch to Compare Slider (@gfazioli/mantine-compare)
    await user.click(screen.getByRole('button', { name: 'Compare Slider' }));
    expect(screen.getByRole('button', { name: 'Compare Slider: On' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mode: Drag' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Angle: 0/i })).toBeInTheDocument();

    // Close lightbox via Escape
    await user.keyboard('{Escape}');
    expect(screen.queryByText('studio.png (1 / 1)')).not.toBeInTheDocument();

    // Open Command Spotlight via HUD button
    await user.click(screen.getByRole('button', { name: /Commands/i }));
    expect(await screen.findByPlaceholderText(/Search commands/i)).toBeInTheDocument();
  });
});
