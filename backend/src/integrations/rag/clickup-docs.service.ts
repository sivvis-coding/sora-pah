import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../database/app-config.service';

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
  /** Direct link: https://app.clickup.com/{teamId}/docs/{docId}/{pageId} */
  url: string;
}

/** Page with its children — preserves ClickUp hierarchy for sidebar tree */
export interface PageNode {
  id: string;
  name: string;
  url: string;
  children: PageNode[];
}

@Injectable()
export class ClickUpDocsService {
  private readonly logger = new Logger(ClickUpDocsService.name);
  private readonly baseUrl = 'https://api.clickup.com/api/v3';

  constructor(private readonly appConfig: AppConfigService) {}

  private async fetchJson<T>(url: string): Promise<T> {
    const apiKey = await this.appConfig.get('clickup', 'apiKey');
    if (!apiKey) throw new Error('ClickUp API key not configured');

    const res = await fetch(url, {
      headers: {
        Authorization: apiKey,
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
    const apiKey = await this.appConfig.get('clickup', 'apiKey');
    if (!apiKey) {
      throw new Error('ClickUp API key not configured');
    }

    const teamId = (await this.appConfig.get('clickup', 'teamId')) ?? '9015583051';
    const folderId = (await this.appConfig.get('clickup', 'docsFolderId')) ?? '';

    this.logger.log(
      `Fetching docs from workspace ${teamId}, folder ${folderId || '(all)'}`,
    );

    let url = `${this.baseUrl}/workspaces/${teamId}/docs`;

    if (folderId) {
      url += `?parent_id=${folderId}&parent_type=folder`;
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
      const fallbackUrl = `${this.baseUrl}/workspaces/${teamId}/docs`;
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
    const teamId = (await this.appConfig.get('clickup', 'teamId')) ?? '9015583051';
    const url = `${this.baseUrl}/workspaces/${teamId}/docs/${docId}`;
    const data = await this.fetchJson<{ id: string; name: string }>(url);
    return { id: data.id ?? docId, name: data.name ?? docId };
  }

  /**
   * Get a single page by docId + pageId with its markdown content.
   */
  async getPage(docId: string, pageId: string): Promise<ClickUpPage> {
    const teamId = (await this.appConfig.get('clickup', 'teamId')) ?? '9015583051';
    const url = `${this.baseUrl}/workspaces/${teamId}/docs/${docId}/pages/${pageId}`;
    const raw = await this.fetchJson<any>(url);
    const effectiveDocId = raw.doc_id ?? docId;
    const effectiveTeamId = raw.workspace_id ? String(raw.workspace_id) : teamId;
    return {
      id: raw.id ?? pageId,
      name: raw.name ?? '',
      content: raw.content ?? '',
      url: `https://doc.clickup.com/${effectiveTeamId}/d/h/${effectiveDocId}/${raw.id ?? pageId}`,
    };
  }

  /**
   * Get page tree for a document — preserves parent/child hierarchy.
   * Used by the docs browser to render the sidebar tree.
   */
  async getDocTree(docId: string): Promise<PageNode[]> {
    const teamId = (await this.appConfig.get('clickup', 'teamId')) ?? '9015583051';
    const url = `${this.baseUrl}/workspaces/${teamId}/docs/${docId}/pages`;
    const raw = await this.fetchJson<unknown>(url);
    const topLevel: any[] = Array.isArray(raw) ? raw : (raw as any)?.pages ?? [];
    return this.buildTree(topLevel, docId, teamId);
  }

  private buildTree(
    pages: Array<{ id: string; name: string; order_index?: number; pages?: any[]; doc_id?: string; workspace_id?: number }>,
    docId: string,
    teamId: string,
  ): PageNode[] {
    const sorted = [...pages].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return sorted.map((page) => {
      const effectiveDocId = page.doc_id ?? docId;
      const effectiveTeamId = page.workspace_id ? String(page.workspace_id) : teamId;
      return {
        id: page.id,
        name: page.name,
        url: `https://doc.clickup.com/${effectiveTeamId}/d/h/${effectiveDocId}/${page.id}`,
        children: page.pages?.length ? this.buildTree(page.pages, docId, teamId) : [],
      };
    });
  }

  /**
   * Get all pages of a document with their content.
   */
  async getDocPages(docId: string): Promise<ClickUpPage[]> {
    const teamId = (await this.appConfig.get('clickup', 'teamId')) ?? '9015583051';
    const url = `${this.baseUrl}/workspaces/${teamId}/docs/${docId}/pages`;

    // ClickUp v3 returns a plain array (not wrapped in { pages: [] })
    const raw = await this.fetchJson<unknown>(url);
    const topLevel: any[] = Array.isArray(raw) ? raw : (raw as any)?.pages ?? [];

    this.logger.log(`  getDocPages(${docId}): ${topLevel.length} top-level pages`);

    // Recursively flatten pages and their subpages
    return this.flattenPages(topLevel, docId, teamId);
  }

  private flattenPages(
    pages: Array<{ id: string; name: string; content?: string; pages?: any[]; doc_id?: string; workspace_id?: number }>,
    docId: string,
    teamId: string,
  ): ClickUpPage[] {
    const result: ClickUpPage[] = [];
    for (const page of pages) {
      // Use doc_id from response if available (matches public URL format)
      const effectiveDocId = page.doc_id ?? docId;
      const effectiveTeamId = page.workspace_id ? String(page.workspace_id) : teamId;
      result.push({
        id: page.id,
        name: page.name,
        content: page.content ?? '',
        url: `https://doc.clickup.com/${effectiveTeamId}/d/h/${effectiveDocId}/${page.id}`,
      });
      if (page.pages?.length) {
        result.push(...this.flattenPages(page.pages, docId, teamId));
      }
    }
    return result;
  }
}
