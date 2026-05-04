import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

/**
 * Unified config layer. Source of truth: Cosmos DB settings only.
 * Env vars are infra-only (COSMOS_ENDPOINT, COSMOS_KEY, PORT, etc.).
 * Integrations must be configured via the setup wizard.
 *
 * Setting IDs and their keys (matching setup wizard payloads):
 *   'azure_ad'   → tenantId, clientId, clientSecret
 *   'openai'     → apiKey
 *   'clickup'    → apiKey, listId, productBacklogListId, teamId, docsFolderId
 *   'msgraph'    → tenantId, clientId, clientSecret
 *   'teams'      → webhookUrl
 *   'app'        → frontendUrl, corsOrigin
 */

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly envConfig: ConfigService,
  ) {}

  /**
   * Get a config value from Cosmos settings only.
   */
  async get(settingId: string, key: string, defaultValue?: string): Promise<string | undefined> {
    const fromDb = await this.settings.getValue(settingId, key);
    if (fromDb) return fromDb;
    return defaultValue;
  }

  /**
   * Check if an integration is configured (has required keys in Cosmos).
   */
  async isConfigured(settingId: string, requiredKeys: string[]): Promise<boolean> {
    for (const key of requiredKeys) {
      const val = await this.get(settingId, key);
      if (!val) return false;
    }
    return true;
  }

  /**
   * Get all values for a setting from Cosmos.
   */
  async getAll(settingId: string): Promise<Record<string, string>> {
    const setting = await this.settings.get(settingId);
    if (!setting?.enabled) return {};
    return { ...setting.values };
  }

  /**
   * Quick feature status check — for frontend consumption.
   */
  async getFeatureStatus(): Promise<Record<string, boolean>> {
    return {
      azure_ad: await this.isConfigured('azure_ad', ['tenantId', 'clientId']),
      openai: await this.isConfigured('openai', ['apiKey']),
      clickup: await this.isConfigured('clickup', ['apiKey']),
      // MS Graph reuses azure_ad credentials — needs clientSecret for client credentials flow
      msgraph: await this.isConfigured('azure_ad', ['tenantId', 'clientId', 'clientSecret']),
      teams: await this.isConfigured('teams', ['webhookUrl']),
    };
  }

  /** Auth-specific: still reads from env for infra-level config */
  getEnv(key: string): string | undefined {
    return this.envConfig.get<string>(key);
  }
}
