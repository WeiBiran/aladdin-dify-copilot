import { describe, expect, it } from 'vitest';
import { previewPage } from '../src/web/preview';

describe('remote preview wrapper', () => {
  it('scopes framing to the Dify origin, retains an external fallback, and rejects executable URLs', () => {
    const page = previewPage(
      {
        editorUrl: 'https://dify.example.test/app/1/workflow',
        runtimeUrl: 'https://apps.example.test/chatbot/code',
        published: true,
      },
      'runtime',
      'en',
    );
    expect(page).toContain('frame-src https://apps.example.test;');
    expect(page).toContain('src="https://apps.example.test/chatbot/code"');
    expect(page).toContain('rel="noopener noreferrer"');
    expect(page).not.toContain('allow-top-navigation');
    const forbidden = previewPage(
      { editorUrl: 'javascript:alert(1)', published: false },
      'editor',
      'en',
      '<script>unsafe</script>',
    );
    expect(forbidden).not.toContain('<iframe');
    expect(forbidden).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
    const unpublished = previewPage(
      {
        editorUrl: 'https://dify.example.test',
        runtimeUrl: 'https://apps.example.test/workflow/code',
        published: false,
      },
      'runtime',
      'en',
    );
    expect(unpublished).not.toContain('<iframe');
    expect(unpublished).toContain('no published web app');
  });
});
