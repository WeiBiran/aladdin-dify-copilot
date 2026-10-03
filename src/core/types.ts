import type { DifyVersion } from '../dify/versions';
export type AppMode = 'workflow' | 'advanced-chat';
export type ToolKind = 'builtin' | 'api' | 'workflow' | 'mcp';
export type Availability = 'ready' | 'unconfigured' | 'unknown';
export type JsonObject = Record<string, unknown>;
export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
export interface ConnectionProfile {
  id: string;
  baseUrl: string;
  workspaceId: string;
  version: DifyVersion;
  email: string;
}
export interface ModelProfile {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKeyRef: string;
}
export interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  form: string;
  description: string;
  options?: unknown[];
  default?: unknown;
  schema?: JsonObject;
}
export interface ToolDescriptor {
  key: string;
  kind: ToolKind;
  providerId: string;
  name: string;
  label: string;
  description: string;
  availability: Availability;
  parameters: ToolParameter[];
  outputSchema?: JsonObject;
  pluginId?: string;
  hasRuntimeParameters: boolean;
  source: string;
  fetchedAt: string;
}
export interface ModelDescriptor {
  provider: string;
  model: string;
  type: string;
  availability: Availability;
}
export interface DatasetDescriptor {
  id: string;
  name: string;
  description: string;
  permission?: string;
}
export interface SyncIssue {
  category: string;
  reason: string;
  status?: number;
}
export interface CapabilitySnapshot {
  difyVersion: DifyVersion;
  connectionId: string;
  workspaceId: string;
  fetchedAt: string;
  complete: boolean;
  tools: ToolDescriptor[];
  models: ModelDescriptor[];
  datasets: DatasetDescriptor[];
  issues: SyncIssue[];
}
export interface ProjectSpec {
  schemaVersion: 1;
  id: string;
  name: string;
  mode: AppMode;
  requirement: string;
  brief?: { requirement: string; acceptance: string };
  connectionId?: string;
  originalAppId?: string;
  originalDigest?: string;
  testAppId?: string;
  allowSideEffects: boolean;
  runtimeModel?: { provider: string; model: string };
}
export type Assertion = {
  op: 'exists' | 'equals' | 'contains' | 'type' | 'range' | 'matches' | 'node';
  path?: string;
  value?: unknown;
  min?: number;
  max?: number;
  nodeId?: string;
  nodeType?: string;
};
export interface TestCase {
  name: string;
  inputs: JsonObject;
  query?: string;
  turns?: { query: string; assertions?: Assertion[] }[];
  assertions: Assertion[];
}
export interface TestSuite {
  schemaVersion: 1;
  cases: TestCase[];
}
export interface NodeExecution {
  id: string;
  type: string;
  status: string;
  error?: string;
  outputs?: unknown;
}
export interface DifyRun {
  taskId?: string;
  runId?: string;
  conversationId?: string;
  status: string;
  outputs: JsonObject;
  answer: string;
  error?: string;
  elapsed: number;
  tokens: number;
  nodes: NodeExecution[];
}
export interface CaseResult {
  name: string;
  passed: boolean;
  failures: string[];
  runs: DifyRun[];
}
export interface TestReport {
  testedDigest: string;
  suiteDigest: string;
  environmentDigest?: string;
  passed: boolean;
  cases: CaseResult[];
  createdAt: string;
  tokens: number;
}
export type RunPhase =
  | 'idle'
  | 'generating'
  | 'validating'
  | 'importing'
  | 'testing'
  | 'repairing'
  | 'publishing'
  | 'complete'
  | 'needs-input'
  | 'failed'
  | 'cancelled';
export interface RunRecord {
  id: string;
  projectId: string;
  sessionId?: string;
  phase: RunPhase;
  round: number;
  startedAt: string;
  error?: string;
  candidateDigest?: string;
  remoteDraftDigest?: string;
  suiteDigest?: string;
  generationTokens: number;
  difyTokens: number;
  originalDigest?: string;
  testAppId?: string;
  pendingImportDigest?: string;
  pendingPublishDigest?: string;
  pendingTest?: boolean;
  knownTasks?: { appId: string; taskId: string }[];
  pendingPromotion?: { appId: string; digest: string; stage: 'importing' | 'publishing' };
  report?: TestReport;
}
export interface DeploymentRecord {
  appId: string;
  digest: string;
  suiteDigest: string;
  publishedAt: string;
  projectId: string;
  target: 'test' | 'original';
}
export interface ValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
}
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  usedToolKeys: string[];
  document?: JsonObject;
}
export interface EngineEvent {
  type: string;
  text?: string;
  data?: unknown;
}
export interface AgentEngine {
  sessionId?: string;
  tokens: number;
  start(): Promise<void>;
  run(prompt: string, signal: AbortSignal): Promise<string>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}
