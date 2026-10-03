import { parse } from 'yaml';
import type { CapabilitySnapshot } from './types';
import { array, object, digest, stableJson } from './util';
// Only used dependencies participate; unrelated catalog changes do not force a
// retest. Fetch times are intentionally excluded from the comparison.
export function environmentDigest(yaml: string, snapshot: CapabilitySnapshot): string {
  const nodes = array(object(object(parse(yaml)).workflow).graph?.nodes);
  const tools = nodes
    .filter((n) => n.data?.type === 'tool')
    .map((n) => {
      const d = n.data;
      const t = snapshot.tools.find(
        (x) =>
          x.kind === d.provider_type && x.providerId === d.provider_id && x.name === d.tool_name,
      );
      if (!t) return { missing: [d.provider_type, d.provider_id, d.tool_name] };
      const { fetchedAt, source, ...definition } = t;
      return definition;
    });
  const models = nodes
    .filter((n) => n.data?.type === 'llm')
    .map((n) => {
      const m = object(n.data.model);
      return (
        snapshot.models.find((x) => x.provider === m.provider && x.model === m.name) ?? {
          missing: m,
        }
      );
    });
  const datasets = nodes
    .flatMap((n) => (n.data?.type === 'knowledge-retrieval' ? array(n.data.dataset_ids) : []))
    .map((id) => snapshot.datasets.find((x) => x.id === id) ?? { missing: id });
  return digest(
    stableJson({
      connection: snapshot.connectionId,
      difyVersion: snapshot.difyVersion,
      workspace: snapshot.workspaceId,
      tools,
      models,
      datasets,
    }),
  );
}
