import { describe, expect, it } from 'vitest';
import {
  mergeModelLibrary,
  parseUnsupportedParameter,
  withBlockedParameter,
  withFavorite,
  DEFAULT_MODEL_LIBRARY,
} from '../modelLibrary';

describe('model library', () => {
  it('parses Runware unsupported-parameter errors', () => {
    expect(
      parseUnsupportedParameter(
        "Unsupported use of 'steps' parameter. This parameter is not supported for the selected model.",
      ),
    ).toBe('steps');
    expect(parseUnsupportedParameter("parameter 'CFGScale' is not supported")).toBe('CFGScale');
    expect(parseUnsupportedParameter("Unsupported use of 'scheduler' parameter")).toBeNull();
  });

  it('records a blocked parameter once and toggles favorites without duplicates', () => {
    const blocked = withBlockedParameter(DEFAULT_MODEL_LIBRARY, 'bytedance:foo@1', 'steps');
    expect(withBlockedParameter(blocked, 'bytedance:foo@1', 'steps').blockedParameters['bytedance:foo@1']).toEqual([
      'steps',
    ]);

    const favorited = withFavorite(blocked, ' meta:muse@image ', true);
    expect(favorited.favorites).toEqual(['meta:muse@image']);
    expect(withFavorite(favorited, 'META:MUSE@IMAGE', false).favorites).toEqual([]);
  });

  it('merges stored favorites with the seeded meta:muse@image steps block', () => {
    const merged = mergeModelLibrary({
      favorites: [' runware:400@6 ', ''],
      blockedParameters: { 'custom:model@1': ['steps', 'not-a-param'] },
    });
    expect(merged.favorites).toEqual(['runware:400@6']);
    expect(merged.blockedParameters['meta:muse@image']).toEqual(['steps']);
    expect(merged.blockedParameters['custom:model@1']).toEqual(['steps']);
  });
});
