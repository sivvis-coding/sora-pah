import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import 'isomorphic-fetch';

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
  private client: Client;

  constructor(private config: ConfigService) {
    const tenantId = this.config.get<string>('MSGRAPH_TENANT_ID')!;
    const clientId = this.config.get<string>('MSGRAPH_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('MSGRAPH_CLIENT_SECRET')!;

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    this.client = Client.initWithMiddleware({ authProvider });
  }

  /**
   * Search Azure AD users by email (mail or userPrincipalName).
   * Uses $filter with startsWith for partial matching.
   */
  async searchUsers(search: string): Promise<AadUser[]> {
    try {
      const response = await this.client
        .api('/users')
        .filter(
          `startsWith(mail,'${search}') or startsWith(userPrincipalName,'${search}') or startsWith(displayName,'${search}')`,
        )
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
      this.logger.error(`Graph searchUsers failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Get a single user profile by OID.
   */
  async getUserProfile(oid: string): Promise<AadUser | null> {
    try {
      const u = await this.client
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
    try {
      const response = await this.client
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
    try {
      const response = await this.client
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
}
