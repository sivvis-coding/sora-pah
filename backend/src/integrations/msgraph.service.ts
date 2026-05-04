import { Injectable, Logger } from '@nestjs/common';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import 'isomorphic-fetch';
import { AppConfigService } from '../database/app-config.service';

export interface AadUser {
  oid: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
  department: string | null;
}

@Injectable()
export class MsGraphService {
  private readonly logger = new Logger(MsGraphService.name);
  private _client: Client | null = null;
  private _configHash = '';

  constructor(private appConfig: AppConfigService) {}

  /**
   * Lazy-init MS Graph client. Recreates if config changes in Cosmos.
   * Uses azure_ad credentials — same app registration handles auth + Graph.
   */
  private async getClient(): Promise<Client | null> {
    const vals = await this.appConfig.getAll('azure_ad');
    if (!vals.tenantId || !vals.clientId || !vals.clientSecret) return null;

    const hash = `${vals.tenantId}:${vals.clientId}:${vals.clientSecret}`;
    if (this._client && hash === this._configHash) return this._client;

    const credential = new ClientSecretCredential(vals.tenantId, vals.clientId, vals.clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    this._client = Client.initWithMiddleware({ authProvider });
    this._configHash = hash;
    this.logger.log('MS Graph client initialized');
    return this._client;
  }

  /**
   * Search Azure AD users by name or email.
   * Uses $search (requires ConsistencyLevel: eventual) — works for
   * displayName, mail and userPrincipalName partial matching.
   */
  async searchUsers(search: string): Promise<AadUser[]> {
    const client = await this.getClient();
    if (!client) return [];

    try {
      const response = await client
        .api('/users')
        .header('ConsistencyLevel', 'eventual')
        .search(`"displayName:${search}" OR "mail:${search}" OR "userPrincipalName:${search}"`)
        .select('id,displayName,mail,userPrincipalName,jobTitle,department')
        .top(10)
        .get();

      return (response.value || []).map((u: any) => ({
        oid: u.id,
        displayName: u.displayName,
        mail: u.mail,
        userPrincipalName: u.userPrincipalName,
        jobTitle: u.jobTitle,
        department: u.department,
      }));
    } catch (err: any) {
      this.logger.error(`Graph searchUsers failed: ${err.message}`, err.body ?? err.stack);
      return [];
    }
  }

  /**
   * Get a single user profile by OID.
   */
  async getUserProfile(oid: string): Promise<AadUser | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const u = await client
        .api(`/users/${oid}`)
        .select('id,displayName,mail,userPrincipalName,jobTitle,department')
        .get();

      return {
        oid: u.id,
        displayName: u.displayName,
        mail: u.mail,
        userPrincipalName: u.userPrincipalName,
        jobTitle: u.jobTitle,
        department: u.department,
      };
    } catch (err: any) {
      this.logger.error(`Graph getUserProfile failed for ${oid}: ${err.message}`);
      return null;
    }
  }

  /**
   * Get user photo as base64-encoded string.
   * Returns null if no photo is available.
   */
  async getUserPhoto(oid: string): Promise<string | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const response = await client
        .api(`/users/${oid}/photo/$value`)
        .responseType('arraybuffer' as any)
        .get();

      const buffer = Buffer.from(response);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (err: any) {
      // 404 = no photo set, not an error
      if (err.statusCode === 404) return null;
      this.logger.warn(`Graph getUserPhoto failed for ${oid}: ${err.message}`);
      return null;
    }
  }

  /**
   * Resolve a user by email — finds exact match on mail or userPrincipalName.
   */
  async resolveByEmail(email: string): Promise<AadUser | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const response = await client
        .api('/users')
        .filter(`mail eq '${email}' or userPrincipalName eq '${email}'`)
        .select('id,displayName,mail,userPrincipalName,jobTitle,department')
        .top(1)
        .get();

      const user = response.value?.[0];
      if (!user) return null;

      return {
        oid: user.id,
        displayName: user.displayName,
        mail: user.mail,
        userPrincipalName: user.userPrincipalName,
        jobTitle: user.jobTitle,
        department: user.department,
      };
    } catch (err: any) {
      this.logger.error(`Graph resolveByEmail failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Send a direct Teams message to a user by their OID.
   * Requires Chat.Create + ChatMessage.Send application permissions.
   * Returns true if sent, false if permissions are missing or user not found.
   */
  async sendTeamsDirectMessage(recipientOid: string, message: string): Promise<boolean> {
    const client = await this.getClient();
    if (!client) return false;

    try {
      // Step 1 — create or get existing 1:1 chat
      const chat = await client
        .api('/chats')
        .post({
          chatType: 'oneOnOne',
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${recipientOid}`,
            },
          ],
        });

      // Step 2 — send message
      await client
        .api(`/chats/${chat.id}/messages`)
        .post({
          body: { content: message, contentType: 'html' },
        });

      this.logger.log(`Teams DM sent to OID ${recipientOid}`);
      return true;
    } catch (err: any) {
      this.logger.error(`sendTeamsDirectMessage failed for OID ${recipientOid}: ${err.message}`);
      return false;
    }
  }
}
