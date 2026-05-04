import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Database, Container } from '@azure/cosmos';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { COSMOS_DATABASE } from './cosmos.provider';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppSetting {
  id: string;           // setting key, e.g. 'azure_ad', 'openai', 'clickup'
  category: string;     // grouping: 'auth', 'integration', 'system'
  values: Record<string, string>;  // key-value pairs (encrypted at rest)
  enabled: boolean;
  updatedAt: string;
}

// ─── Encryption helpers ──────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'sora-settings-salt', 32);
}

function encrypt(text: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(payload: string, secret: string): string {
  const key = deriveKey(secret);
  const [ivB64, tagB64, dataB64] = payload.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private container!: Container;
  private readonly encryptionKey: string;

  /** In-memory cache — avoids hitting Cosmos on every config read */
  private cache = new Map<string, AppSetting>();
  private cacheLoaded = false;

  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {
    // Use COSMOS_KEY as encryption secret — it's already a secret the app has
    this.encryptionKey = process.env.COSMOS_KEY || 'fallback-dev-key';
  }

  async onModuleInit() {
    const { container } = await this.db.containers.createIfNotExists({
      id: 'settings',
      partitionKey: { paths: ['/id'] },
    });
    this.container = container;
    await this.loadCache();
  }

  // ─── Cache ─────────────────────────────────────────────────────────────────

  private async loadCache(): Promise<void> {
    try {
      const { resources } = await this.container.items
        .query('SELECT * FROM c')
        .fetchAll();
      this.cache.clear();
      for (const doc of resources) {
        this.cache.set(doc.id, {
          ...doc,
          values: this.decryptValues(doc.values),
        });
      }
      this.cacheLoaded = true;
      this.logger.log(`Settings cache loaded (${this.cache.size} entries)`);
    } catch (err: any) {
      this.logger.error(`Failed to load settings cache: ${err.message}`);
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async getAll(): Promise<AppSetting[]> {
    if (!this.cacheLoaded) await this.loadCache();
    return Array.from(this.cache.values());
  }

  async get(id: string): Promise<AppSetting | null> {
    if (!this.cacheLoaded) await this.loadCache();
    return this.cache.get(id) ?? null;
  }

  /**
   * Get a specific value from a setting.
   * Returns undefined if setting doesn't exist, is disabled, or key is missing.
   */
  async getValue(settingId: string, key: string): Promise<string | undefined> {
    const setting = await this.get(settingId);
    if (!setting || !setting.enabled) return undefined;
    return setting.values[key];
  }

  async upsert(id: string, category: string, values: Record<string, string>, enabled = true): Promise<AppSetting> {
    const encryptedValues = this.encryptValues(values);
    const doc = {
      id,
      category,
      values: encryptedValues,
      enabled,
      updatedAt: new Date().toISOString(),
    };

    await this.container.items.upsert(doc);

    // Update cache with decrypted values
    const cached: AppSetting = { ...doc, values };
    this.cache.set(id, cached);

    this.logger.log(`Setting upserted: ${id} (enabled: ${enabled})`);
    return cached;
  }

  /**
   * Merge specific keys into an existing setting without touching other values.
   */
  async patch(id: string, keys: Record<string, string>): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Setting ${id} not found`);
    const merged = { ...existing.values, ...keys };
    await this.upsert(id, existing.category, merged, existing.enabled);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.container.item(id, id).delete();
      this.cache.delete(id);
      this.logger.log(`Setting deleted: ${id}`);
    } catch (err: any) {
      if (err.code !== 404) throw err;
    }
  }

  async deleteAll(): Promise<void> {
    const { resources } = await this.container.items
      .query('SELECT c.id FROM c')
      .fetchAll();
    await Promise.all(
      resources.map((doc) => this.container.item(doc.id, doc.id).delete().catch(() => {})),
    );
    this.cache.clear();
    this.logger.log('All settings deleted');
  }

  // ─── Encryption ────────────────────────────────────────────────────────────

  private encryptValues(values: Record<string, string>): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      encrypted[k] = v ? encrypt(v, this.encryptionKey) : '';
    }
    return encrypted;
  }

  private decryptValues(values: Record<string, string>): Record<string, string> {
    const decrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      try {
        decrypted[k] = v ? decrypt(v, this.encryptionKey) : '';
      } catch {
        decrypted[k] = '';
        this.logger.warn(`Failed to decrypt setting value for key: ${k}`);
      }
    }
    return decrypted;
  }
}
