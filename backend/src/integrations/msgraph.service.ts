import { Injectable, Logger } from '@nestjs/common';

/**
 * Placeholder for Microsoft Graph API integration.
 *
 * Likely use cases in SORA:
 *   - Enrich user profiles beyond what the JWT provides (photo, department, manager)
 *   - Read Azure AD group membership to derive roles
 *   - Send notifications via Teams webhook
 *
 * Authentication will use the On-Behalf-Of (OBO) flow:
 *   the user's Azure AD access token is exchanged for a Graph-scoped token.
 *
 * Required env vars (future):
 *   AZURE_AD_TENANT_ID
 *   AZURE_AD_CLIENT_ID
 *   AZURE_AD_CLIENT_SECRET
 */
@Injectable()
export class MsGraphService {
  private readonly logger = new Logger(MsGraphService.name);

  /**
   * Fetch extended profile for the authenticated user.
   * Returns fields not present in the JWT: photo, department, jobTitle, manager.
   */
  async getUserProfile(_oid: string): Promise<Record<string, unknown>> {
    this.logger.warn('MsGraphService.getUserProfile() — not implemented yet');
    return {};
  }

  /**
   * Fetch the AAD group memberships for a user.
   * Used to map AAD groups → SORA roles (admin / standard).
   */
  async getUserGroups(_oid: string): Promise<string[]> {
    this.logger.warn('MsGraphService.getUserGroups() — not implemented yet');
    return [];
  }

  /**
   * Send an Adaptive Card notification to a Teams channel.
   */
  async sendTeamsNotification(
    _webhookUrl: string,
    _payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.warn('MsGraphService.sendTeamsNotification() — not implemented yet');
  }
}
