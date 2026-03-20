import { describe, expect, it } from 'vitest';

import { cleanYouTubeText } from '@/lib/youtube/text-cleaner';

describe('cleanYouTubeText', () => {
  it('removes timestamps from description and captions', () => {
    const result = cleanYouTubeText({
      description: '[00:00] Intro\n0:45 Add onions',
      captions: '01:15 Stir the sauce',
    });

    expect(result.descriptionText).toBe('Intro\nAdd onions');
    expect(result.captionText).toBe('Stir the sauce');
  });

  it('deduplicates consecutive caption lines', () => {
    const result = cleanYouTubeText({
      captions: 'Mix well\nMix well\nServe hot',
    });

    expect(result.captionText).toBe('Mix well\nServe hot');
  });

  it('normalizes whitespace and strips links and hashtags', () => {
    const result = cleanYouTubeText({
      description:
        '  Full recipe here  https://example.com  \n\n#recipe   #dinner  ',
    });

    expect(result.descriptionText).toBe('Full recipe here');
  });

  it('handles empty input safely', () => {
    expect(cleanYouTubeText({})).toEqual({
      combinedText: '',
      descriptionText: '',
      captionText: null,
      usedSources: [],
    });
  });

  it('combines title, description, and captions in order', () => {
    const result = cleanYouTubeText({
      title: 'Spicy Pork Stir-Fry',
      description: 'Slice the pork.',
      captions: 'Cook on medium heat.',
    });

    expect(result.usedSources).toEqual(['title', 'description', 'captions']);
    expect(result.combinedText).toBe(
      'Spicy Pork Stir-Fry\n\nSlice the pork.\n\nCook on medium heat.',
    );
  });
});
