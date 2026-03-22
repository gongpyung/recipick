import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateText = vi.fn();

vi.mock('@/lib/llm/client', () => ({
  generateText,
}));

describe('extractStructuredRecipe', () => {
  beforeEach(() => {
    generateText.mockReset();
  });

  it('repairs invalid output on the second attempt', async () => {
    generateText
      .mockResolvedValueOnce({
        content: JSON.stringify({
          title: '제육볶음',
          source: {
            youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
            videoId: 'abc123',
            sourceType: 'video',
            language: 'ko',
          },
          baseServings: 2,
          summary: null,
          ingredients: [],
          steps: [],
          tips: [],
          warnings: [],
          confidence: 'medium',
        }),
        model: 'glm-test',
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          title: '제육볶음',
          source: {
            youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
            videoId: 'abc123',
            sourceType: 'video',
            language: 'ko',
          },
          baseServings: 2,
          summary: null,
          ingredients: [
            {
              name: '돼지고기',
              amount: 300,
              amountText: '300g',
              unit: 'g',
              scalable: true,
              note: null,
              confidence: 'high',
            },
          ],
          steps: [
            {
              stepNo: 1,
              text: '볶는다.',
              note: null,
              confidence: 'high',
            },
          ],
          tips: [],
          warnings: [],
          confidence: 'high',
        }),
        model: 'glm-test',
      });

    const { extractStructuredRecipe } =
      await import('@/lib/extraction/extractor');
    const result = await extractStructuredRecipe({
      title: '제육볶음',
      cleanedText: {
        combinedText: '돼지고기를 볶는다.',
        descriptionText: '돼지고기를 볶는다.',
        captionText: null,
        usedSources: ['description'],
      },
      source: {
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
        videoId: 'abc123',
        sourceType: 'video',
        language: 'ko',
      },
    });

    expect(generateText).toHaveBeenCalledTimes(2);
    expect(result.attemptCount).toBe(2);
    expect(result.recipe.ingredients).toHaveLength(1);
    expect(result.recipe.steps).toHaveLength(1);
  });
});
