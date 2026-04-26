import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ClickUp v3 Docs API client.
 *
 * Fetches documents and page content from the workspace.
 * Base URL: https://api.clickup.com/api/v3
 *
 * Docs structure: Workspace → Docs → Pages (each page has markdown content).
 */

export interface ClickUpDoc {
  id: string;
  name: string;
}

export interface ClickUpPage {
  id: string;
  name: string;
  content: string; // markdown
}

@Injectable()
export class ClickUpDocsService {
  private readonly logger = new Logger(ClickUpDocsService.name);
  private readonly apiKey: string;
  private readonly teamId: string;
  private readonly folderId: string;
  private readonly baseUrl = 'https://api.clickup.com/api/v3';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('CLICKUP_API_KEY', '');
    this.teamId = this.config.get<string>('CLICKUP_TEAM_ID', '9015583051');
    this.folderId = this.config.get<string>(
      'CLICKUP_DOCS_FOLDER_ID',
      '901513874495',
    );
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ClickUp API ${res.status}: ${body}`);
    }

    return (await res.json()) as T;
  }

  /**
   * List all docs in the configured workspace.
   * Filters by parent folder if CLICKUP_DOCS_FOLDER_ID is set.
   */
  async listDocs(): Promise<ClickUpDoc[]> {
    if (!this.apiKey) {
      throw new Error('CLICKUP_API_KEY not configured');
    }

    this.logger.log(
      `Fetching docs from workspace ${this.teamId}, folder ${this.folderId}`,
    );

    // The v3 API uses workspace_id in the path
    // Query params to filter by parent container
    let url = `${this.baseUrl}/workspaces/${this.teamId}/docs`;

    // If we have a folder filter, try to pass it
    // ClickUp v3 docs endpoint accepts parent_id and parent_type params
    if (this.folderId) {
      url += `?parent_id=${this.folderId}&parent_type=folder`;
    }

    try {
      const data = await this.fetchJson<{
        docs: Array<{ id: string; name: string }>;
      }>(url);

      this.logger.log(`Found ${data.docs?.length ?? 0} docs`);
      return (data.docs ?? []).map((d) => ({
        id: d.id,
        name: d.name,
      }));
    } catch (err) {
      // If folder filter fails, try without it and log warning
      this.logger.warn(
        `Failed to fetch docs with folder filter, trying without: ${err}`,
      );
      const fallbackUrl = `${this.baseUrl}/workspaces/${this.teamId}/docs`;
      const data = await this.fetchJson<{
        docs: Array<{ id: string; name: string }>;
      }>(fallbackUrl);

      this.logger.log(`Found ${data.docs?.length ?? 0} docs (unfiltered)`);
      return (data.docs ?? []).map((d) => ({ id: d.id, name: d.name }));
    }
  }

  /**
   * Fetch metadata (id, name) for a single doc by ID.
   */
  async getDocInfo(docId: string): Promise<ClickUpDoc> {
    const url = `${this.baseUrl}/workspaces/${this.teamId}/docs/${docId}`;
    const data = await this.fetchJson<{ id: string; name: string }>(url);
    return { id: data.id ?? docId, name: data.name ?? docId };
  }

  /**
   * Get all pages of a document with their content.
   */
  async getDocPages(docId: string): Promise<ClickUpPage[]> {
    const url = `${this.baseUrl}/workspaces/${this.teamId}/docs/${docId}/pages`;

    // ClickUp v3 returns a plain array (not wrapped in { pages: [] })
    const raw = await this.fetchJson<unknown>(url);
    const topLevel: any[] = Array.isArray(raw) ? raw : (raw as any)?.pages ?? [];

    this.logger.log(`  getDocPages(${docId}): ${topLevel.length} top-level pages`);

    // Recursively flatten pages and their subpages
    return this.flattenPages(topLevel);
  }

  private flattenPages(
    pages: Array<{ id: string; name: string; content?: string; pages?: any[] }>,
  ): ClickUpPage[] {
    const result: ClickUpPage[] = [];
    for (const page of pages) {
      result.push({
        id: page.id,
        name: page.name,
        content: page.content ?? '',
      });
      if (page.pages?.length) {
        result.push(...this.flattenPages(page.pages));
      }
    }
    return result;
  }
}
