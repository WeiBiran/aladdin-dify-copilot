/** Source-pinned contracts; adding a version requires its own compatibility evidence. */
export const DIFY_VERSIONS = {
  '1.14.2': { dslVersion: '0.6.0', environmentPatch: false },
  '1.17.1': { dslVersion: '0.7.0', environmentPatch: true },
} as const;
export type DifyVersion = keyof typeof DIFY_VERSIONS;
export function versionContract(version: DifyVersion) {
  const contract = DIFY_VERSIONS[version];
  if (!contract) throw new Error(`未实现 Dify ${version} 的版本适配器`);
  return contract;
}
