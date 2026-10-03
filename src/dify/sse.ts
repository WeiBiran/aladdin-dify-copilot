import type { DifyRun, NodeExecution } from '../core/types';
import { object, throwIfAborted } from '../core/util';
export async function* parseSse(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<Record<string, any>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const abort = () => {
    void reader.cancel(signal?.reason).catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      throwIfAborted(signal);
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const chunk = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const lines = chunk.split(/\r?\n/);
        const data = lines
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (data && data !== '[DONE]') {
          const v = JSON.parse(data);
          yield object(v);
        }
      }
      if (done) {
        if (buffer.trim() && !buffer.trim().startsWith(':'))
          throw new Error('Dify SSE 在事件完成前中断');
        break;
      }
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function collectRun(
  response: Response,
  mode: 'workflow' | 'advanced-chat',
  signal?: AbortSignal,
  onTask?: (task: string) => void | Promise<void>,
  onEvent?: (event: Record<string, any>) => void,
): Promise<DifyRun> {
  if (!response.ok) throw new Error(`Dify 测试 HTTP ${response.status}`);
  if (!response.body) throw new Error('Dify 测试没有事件流');
  const run: DifyRun = {
    status: 'unknown',
    outputs: {},
    answer: '',
    elapsed: 0,
    tokens: 0,
    nodes: [],
  };
  let terminal = false,
    messageEnd = mode === 'workflow';
  for await (const event of parseSse(response.body, signal)) {
    onEvent?.(event);
    const d = object(event.data);
    if (event.task_id) {
      run.taskId = String(event.task_id);
      await onTask?.(run.taskId);
    }
    if (event.workflow_run_id) run.runId = String(event.workflow_run_id);
    if (event.conversation_id) run.conversationId = String(event.conversation_id);
    if (event.event === 'message' || event.event === 'agent_message')
      run.answer += String(event.answer ?? '');
    if (event.event === 'message_replace') run.answer = String(event.answer ?? '');
    if (event.event === 'message_end') {
      messageEnd = true;
      run.tokens = Math.max(
        run.tokens,
        Number(object(object(event.metadata).usage).total_tokens ?? 0),
      );
    }
    if (event.event === 'node_finished') {
      run.nodes.push({
        id: String(d.node_id ?? ''),
        type: String(d.node_type ?? ''),
        status: String(d.status ?? ''),
        error: d.error ? String(d.error) : undefined,
        outputs: d.outputs,
      } satisfies NodeExecution);
    }
    if (event.event === 'workflow_finished') {
      terminal = true;
      run.status = run.error ? 'failed' : String(d.status);
      run.outputs = object(d.outputs);
      run.error = run.error ?? (d.error ? String(d.error) : undefined);
      run.elapsed = Number(d.elapsed_time ?? 0);
      run.tokens = Math.max(run.tokens, Number(d.total_tokens ?? 0));
      if (Number(d.exceptions_count ?? 0) > 0) run.error = run.error ?? '工作流包含节点异常';
    }
    if (event.event === 'error') {
      run.error = String(event.message ?? 'Dify 执行错误');
      run.status = 'failed';
      terminal = true;
    }
  }
  throwIfAborted(signal);
  if (!terminal) throw new Error('事件流结束，但未收到 Dify 执行终态');
  if (mode === 'advanced-chat' && !messageEnd && run.status === 'succeeded')
    throw new Error('Chatflow 未收到 message_end');
  return run;
}
