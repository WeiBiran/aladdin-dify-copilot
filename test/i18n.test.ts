import { describe, expect, it } from 'vitest';
import { resolveLanguage, translate, translateMarkup } from '../src/core/i18n';
import { settingsMarkup, taskMarkup } from '../src/ui/markup';
import { workbenchMarkup } from '../src/web/workbench-view';

describe('interface localization', () => {
  it('follows Chinese locales, falls back to English, and honors overrides', () => {
    expect(resolveLanguage('auto', 'zh-tw')).toBe('zh-CN');
    expect(resolveLanguage('auto', 'de')).toBe('en');
    expect(resolveLanguage('en', 'zh-cn')).toBe('en');
    expect(resolveLanguage('zh-CN', 'en')).toBe('zh-CN');
  });

  it('translates both static pages without changing DOM IDs or command bindings', () => {
    for (const source of [settingsMarkup, taskMarkup, workbenchMarkup]) {
      const translated = translateMarkup(source, 'en');
      expect(translated.match(/id="[^"]+"/g)).toEqual(source.match(/id="[^"]+"/g));
      expect(translated.match(/data-action="[^"]+"/g)).toEqual(
        source.match(/data-action="[^"]+"/g),
      );
      expect(translated.replaceAll('简体中文', '')).not.toMatch(/[\u4e00-\u9fff]/);
      expect(translateMarkup(source, 'zh-CN')).toBe(source);
    }
  });

  it('keeps external content intact and translates known progress messages', () => {
    const external = '客户数据与工具输出：账单金额 318 元';
    expect(translate(external, 'en')).toBe(external);
    expect(translate('正在测试 · 第 3 轮', 'en')).toBe('Testing · Round 3');
    expect(translate('已选应用 · 客户服务', 'en')).toBe('Selected application · 客户服务');
  });
});
