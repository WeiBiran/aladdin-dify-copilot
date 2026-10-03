import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
await build({
  entryPoints: ['src/core/rules.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/example-rules.cjs',
});
const { minimalDsl } = createRequire(import.meta.url)('../dist/example-rules.cjs');
for (const [dir, mode] of [
  ['workflow', 'workflow'],
  ['chatflow', 'advanced-chat'],
]) {
  const root = 'examples/' + dir;
  await mkdir(root, { recursive: true });
  const name = 'Copilot ' + dir + ' smoke';
  await writeFile(root + '/workflow.yml', minimalDsl(mode, name));
  await writeFile(
    root + '/dify.project.json',
    JSON.stringify(
      {
        schemaVersion: 1,
        id: 'example-' + dir,
        name,
        mode,
        requirement: '保持示例的输入回显行为。用于验证导入、测试和发布接口。',
        allowSideEffects: false,
      },
      null,
      2,
    ) + '\n',
  );
  const cases =
    mode === 'workflow'
      ? [
          {
            name: '输入回显',
            inputs: { input: 'example-marker' },
            assertions: [{ op: 'equals', path: 'outputs.result', value: 'example-marker' }],
          },
        ]
      : [
          {
            name: '多轮草稿接口',
            inputs: { input: 'sample' },
            turns: [
              {
                query: 'first marker',
                assertions: [{ op: 'equals', path: 'answer', value: 'first marker' }],
              },
              { query: 'second marker' },
            ],
            assertions: [{ op: 'equals', path: 'answer', value: 'second marker' }],
          },
          {
            name: '独立案例',
            inputs: { input: 'isolated' },
            query: 'independent marker',
            assertions: [{ op: 'equals', path: 'answer', value: 'independent marker' }],
          },
        ];
  await writeFile(
    root + '/tests.json',
    JSON.stringify({ schemaVersion: 1, cases }, null, 2) + '\n',
  );
  await writeFile(
    root + '/requirements.md',
    '# 需求\n\n这是用于验证控制台导入、草稿运行和发布的最小回显示例，不含模型或业务工具，不能作为业务验收通过证据。\n',
  );
}
