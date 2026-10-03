import { AsyncEntry } from '@napi-rs/keyring';
import { digest } from '../core/util';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StateStore, ConfigurationStore } from '../app/host';
import type { SecretStore } from '../core/types';

export class JsonStore implements StateStore, ConfigurationStore {
  private data: Record<string, unknown> = {};
  private writes = Promise.resolve();
  constructor(private file: string) {}
  async load() {
    try {
      this.data = JSON.parse(await fs.readFile(this.file, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return this;
  }
  get<T>(key: string, fallback: T): T;
  get<T>(key: string): T | undefined;
  get<T>(key: string, fallback?: T): T | undefined {
    return (this.data[key] as T | undefined) ?? fallback;
  }
  update(key: string, value: unknown) {
    if (value === undefined) delete this.data[key];
    else this.data[key] = value;
    const data = JSON.stringify(this.data);
    const write = this.writes
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
        await fs.writeFile(this.file + '.tmp', data, { mode: 0o600 });
        await fs.rename(this.file + '.tmp', this.file);
      });
    this.writes = write;
    return write;
  }
}
export class KeyringSecretStore implements SecretStore {
  private service: string;
  constructor(dataDirectory: string) {
    this.service = 'AladdinDify.' + digest(dataDirectory);
  }
  async get(key: string) {
    return new AsyncEntry(this.service, key).getPassword();
  }
  async store(key: string, value: string) {
    await new AsyncEntry(this.service, key).setPassword(value);
  }
  async delete(key: string) {
    await new AsyncEntry(this.service, key).deleteCredential();
  }
}
