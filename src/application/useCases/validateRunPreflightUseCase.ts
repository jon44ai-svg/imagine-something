import type { GenerationSettings, PreflightResult } from '../../domain/models';

export class ValidateRunPreflightUseCase {
  execute(apiKey: string, settings: GenerationSettings): PreflightResult {
    if (!apiKey.trim()) {
      return {
        ok: false,
        field: 'apiKey',
        message: 'Please enter your Runware API key in Settings first.',
      };
    }

    if (!settings.model.trim()) {
      return {
        ok: false,
        field: 'model',
        message: 'Please specify a model AIR ID in Settings first.',
      };
    }

    if (!settings.positivePrompt.trim()) {
      return {
        ok: false,
        field: 'positivePrompt',
        message: 'Please enter a prompt first.',
      };
    }

    return { ok: true };
  }
}
