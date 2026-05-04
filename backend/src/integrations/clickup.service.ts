import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../database/app-config.service';

export interface ClickupTask {
  id: string;
  name: string;
  status: string;
}

// ─── Progress Board types ─────────────────────────────────────────────────────

export type ProgressColumn = 'planned' | 'in_progress' | 'done';
export type ProgressPriority = 'high' | 'medium' | 'low';

export interface ProgressCard {
  /** ClickUp task ID */
  id: string;
  title: string;
  column: ProgressColumn;
  /** Raw ClickUp status string (lowercase) */
  rawStatus: string;
  /** ISO date string when task was last updated / closed */
  dateUpdated: string | null;
  /** Task description (plain text, may be long) */
  description: string | null;
  /** Who requested this feature (from ClickUp custom field) */
  requestedBy: string | null;
  /** Value of the admin-configured custom field to display on the card */
  customFieldValue: string | null;
  /** Label (name) of that custom field */
  customFieldLabel: string | null;
  /** Mapped priority level (from admin-configured priority field + mapping) */
  priority: ProgressPriority | null;
  /** Free-text field read from description or custom field */
  builtBecause: string | null;
  /** SORA idea ID extracted from description/custom field */
  linkedIdeaId: string | null;
  /** SORA decision ID extracted from description/custom field */
  linkedDecisionId: string | null;
}

export interface ProgressBoard {
  planned: ProgressCard[];
  in_progress: ProgressCard[];
  done: ProgressCard[];
  fetchedAt: string;
}

/**
 * ClickUp integration.
 *
 * Read: fetch tasks from a list.
 * Write: create user story tasks in the Product Backlog list with
 *        the exact custom fields defined by the team's Python agent.
 *
 * Custom field IDs (Product Backlog list):
 *   1718913a-93b3-4c6c-9122-2a76b5ac31a0  → Technical Notes / Constraints
 *   2311f59f-aa3d-4622-b209-1e46892aa650  → User Story Statement
 *   7f0902c2-0efd-4989-b4da-79fd62ff87fb  → Out of Scope
 *   8988cf82-712f-4210-aa35-2fb810d4be22  → Acceptance Criteria (Gherkin)
 *   a2a15b34-0013-4ac2-bb8e-74647ccb1c27  → Requested By
 *   fa1ea1f2-d319-4f27-be5d-8b5aa808dd08  → Functional Description
 */

export interface UserStoryPayload {
  title: string;
  description: string;
  userStoryStatement: string;
  functionalDescription: string;
  acceptanceCriteriaInGherkin: string;
  constraints: string;
  outOfScope: string;
  requestedBy: string;
}

export interface ClickupCreateResult {
  taskId: string;
  taskUrl: string;
}

@Injectable()
export class ClickupService {
  private readonly logger = new Logger(ClickupService.name);
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

  // Task type ID for User Stories in the product backlog
  private static readonly USER_STORY_CUSTOM_ITEM_ID = 1006;

  // Custom field IDs — defined by the team's ClickUp workspace
  private static readonly FIELD_CONSTRAINTS = '1718913a-93b3-4c6c-9122-2a76b5ac31a0';
  private static readonly FIELD_USER_STORY_STATEMENT = '2311f59f-aa3d-4622-b209-1e46892aa650';
  private static readonly FIELD_OUT_OF_SCOPE = '7f0902c2-0efd-4989-b4da-79fd62ff87fb';
  private static readonly FIELD_ACCEPTANCE_CRITERIA = '8988cf82-712f-4210-aa35-2fb810d4be22';
  private static readonly FIELD_REQUESTED_BY = 'a2a15b34-0013-4ac2-bb8e-74647ccb1c27';
  private static readonly FIELD_FUNCTIONAL_DESCRIPTION = 'fa1ea1f2-d319-4f27-be5d-8b5aa808dd08';

  constructor(private readonly appConfig: AppConfigService) {}

  // ─── Read: fetch tasks ───────────────────────────────────────────────────────

  /**
   * Fetch active (non-closed) tasks from a ClickUp list.
   * Returns minimal data: id, name, status.
   */
  async getTasks(listId: string): Promise<ClickupTask[]> {
    const apiKey = await this.appConfig.get('clickup', 'apiKey');
    if (!apiKey) {
      this.logger.warn('ClickUp API key not configured — returning empty tasks');
      return [];
    }

    try {
      const url = `${this.baseUrl}/list/${listId}/task?include_closed=false&subtasks=false&page=0`;
      const res = await fetch(url, {
        headers: { Authorization: apiKey },
      });

      if (!res.ok) {
        this.logger.error(`ClickUp API error: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = (await res.json()) as {
        tasks: Array<{ id: string; name: string; status: { status: string } }>;
      };

      return data.tasks.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status.status,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch ClickUp tasks', error);
      return [];
    }
  }

  // ─── Write: create user story ────────────────────────────────────────────────

  /**
   * Create a User Story task in the Product Backlog ClickUp list.
   * Maps all fields to the exact custom field IDs used in the workspace.
   */
  async createUserStoryTask(
    story: UserStoryPayload,
  ): Promise<ClickupCreateResult> {
    const apiKey = await this.appConfig.get('clickup', 'apiKey');
    if (!apiKey) {
      this.logger.warn('ClickUp API key not configured');
      throw new Error('ClickUp integration not configured');
    }
    const backlogListId = await this.appConfig.get('clickup', 'productBacklogListId');
    if (!backlogListId) {
      this.logger.warn('Product Backlog list ID not configured');
      throw new Error('Product Backlog list ID not configured');
    }

    const url = `${this.baseUrl}/list/${backlogListId}/task`;

    const payload = {
      name: story.title,
      description: story.description,
      custom_item_id: ClickupService.USER_STORY_CUSTOM_ITEM_ID,
      custom_fields: [
        {
          id: ClickupService.FIELD_CONSTRAINTS,
          value: story.constraints,
        },
        {
          id: ClickupService.FIELD_USER_STORY_STATEMENT,
          value: story.userStoryStatement,
        },
        {
          id: ClickupService.FIELD_OUT_OF_SCOPE,
          value: story.outOfScope,
        },
        {
          id: ClickupService.FIELD_ACCEPTANCE_CRITERIA,
          value: story.acceptanceCriteriaInGherkin,
        },
        {
          id: ClickupService.FIELD_REQUESTED_BY,
          value: story.requestedBy,
        },
        {
          id: ClickupService.FIELD_FUNCTIONAL_DESCRIPTION,
          value: story.functionalDescription,
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(
        `ClickUp create task failed: ${res.status} ${res.statusText} — ${body}`,
      );
      throw new Error(`ClickUp API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { id: string; url: string };
    this.logger.log(`User story created in ClickUp: ${data.url}`);
    return { taskId: data.id, taskUrl: data.url };
  }

  // ─── Read: progress board ─────────────────────────────────────────────────

  /**
   * Build a ProgressBoard by fetching from up to 3 ClickUp lists:
   *   - CLICKUP_LIST_ID              → sprint / current work
   *   - CLICKUP_PRODUCT_BACKLOG_LIST_ID → backlog / planned
   *
   * Status mapping (lowercase ClickUp status → column):
   *   planned    → "to do", "backlog", "planned", "ready"
   *   in_progress → "in progress", "in review", "qa", "testing", "doing"
   *   done        → "done", "complete", "completed", "closed"
   *
   * "done" items are filtered to last 14 days by dateUpdated.
   *
   * SORA links: the task description may contain magic tags:
   *   [sora-idea:ID]      → linkedIdeaId
   *   [sora-decision:ID]  → linkedDecisionId
   *   [built-because:TEXT] → builtBecause
   */
  async getProgressBoard(): Promise<ProgressBoard> {
    const sprintListId = (await this.appConfig.get('clickup', 'listId')) ?? '';
    const backlogListId = (await this.appConfig.get('clickup', 'productBacklogListId')) ?? '';
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    // Load status mapping from config — fall back to sane defaults if not configured
    const parseArr = (v?: string) => { try { return v ? (JSON.parse(v) as string[]) : []; } catch { return []; } };
    const mappedPlanned    = parseArr(await this.appConfig.get('clickup', 'statusPlanned'));
    const mappedInProgress = parseArr(await this.appConfig.get('clickup', 'statusInProgress'));
    const mappedDone       = parseArr(await this.appConfig.get('clickup', 'statusDone'));

    // Custom field to display on cards (optional)
    const cardCustomFieldId = (await this.appConfig.get('clickup', 'cardCustomFieldId')) || null;

    // Priority field + mapping (optional)
    const priorityFieldId = (await this.appConfig.get('clickup', 'priorityFieldId')) || null;
    const parsePriorityMap = (v?: string): Record<ProgressPriority, string[]> => {
      try { return v ? JSON.parse(v) : { high: [], medium: [], low: [] }; }
      catch { return { high: [], medium: [], low: [] }; }
    };
    const priorityMapping = parsePriorityMap(
      await this.appConfig.get('clickup', 'priorityMapping') ?? undefined,
    );

    const PRIORITY_ORDER: Record<ProgressPriority | 'none', number> = {
      high: 0, medium: 1, low: 2, none: 3,
    };

    const statusMapping = {
      planned:     mappedPlanned.length    ? mappedPlanned    : ['to do', 'backlog', 'planned', 'ready', 'open'],
      in_progress: mappedInProgress.length ? mappedInProgress : ['in progress', 'in review', 'qa', 'testing', 'doing', 'review'],
      done:        mappedDone.length        ? mappedDone        : ['done', 'complete', 'completed', 'closed'],
    };

    // Fetch both lists in parallel; missing list ID → empty array (graceful)
    const [sprintRaw, backlogRaw] = await Promise.all([
      sprintListId ? this.fetchRawTasks(sprintListId) : Promise.resolve([]),
      backlogListId ? this.fetchRawTasks(backlogListId) : Promise.resolve([]),
    ]);

    const allRaw = [...sprintRaw, ...backlogRaw];

    // Deduplicate by task ID (task can appear in both lists)
    const seen = new Set<string>();
    const uniqueRaw = allRaw.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    const planned: ProgressCard[] = [];
    const in_progress: ProgressCard[] = [];
    const done: ProgressCard[] = [];

    for (const raw of uniqueRaw) {
      const status = (raw.status?.status ?? '').toLowerCase().trim();
      const column = this.mapStatusToColumn(status, statusMapping);

      if (!column) continue; // unknown status → skip

      const dateUpdated: string | null = raw.date_updated
        ? new Date(Number(raw.date_updated)).toISOString()
        : null;

      // Filter done items older than 2 weeks
      if (column === 'done' && raw.date_updated) {
        if (Number(raw.date_updated) < twoWeeksAgo) continue;
      }

      const description: string = raw.description ?? '';
      const card: ProgressCard = {
        id: raw.id,
        title: raw.name,
        column,
        rawStatus: status,
        dateUpdated,
        description: description || null,
        requestedBy: this.extractCustomField(
          raw.custom_fields,
          ClickupService.FIELD_REQUESTED_BY,
        ),
        customFieldValue: cardCustomFieldId
          ? this.extractCustomField(raw.custom_fields, cardCustomFieldId)
          : null,
        customFieldLabel: cardCustomFieldId
          ? this.extractCustomFieldLabel(raw.custom_fields, cardCustomFieldId)
          : null,
        priority: (() => {
          if (!priorityFieldId) return null;
          const val = (this.extractCustomField(raw.custom_fields, priorityFieldId) ?? '').toLowerCase().trim();
          if (!val) return null;
          if (priorityMapping.high.includes(val)) return 'high';
          if (priorityMapping.medium.includes(val)) return 'medium';
          if (priorityMapping.low.includes(val)) return 'low';
          return null;
        })(),
        builtBecause: this.extractTag(description, 'built-because'),
        linkedIdeaId: this.extractTag(description, 'sora-idea'),
        linkedDecisionId: this.extractTag(description, 'sora-decision'),
      };

      if (column === 'planned') planned.push(card);
      else if (column === 'in_progress') in_progress.push(card);
      else done.push(card);
    }

    const sortByPriority = (cards: ProgressCard[]) =>
      cards.sort((a, b) =>
        PRIORITY_ORDER[a.priority ?? 'none'] - PRIORITY_ORDER[b.priority ?? 'none'],
      );

    return {
      planned:    sortByPriority(planned),
      in_progress: sortByPriority(in_progress),
      done:       sortByPriority(done),
      fetchedAt: new Date().toISOString(),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private mapStatusToColumn(status: string, mapping: { planned: string[]; in_progress: string[]; done: string[] }): ProgressColumn | null {
    const s = status.toLowerCase().trim();
    if (mapping.planned.includes(s)) return 'planned';
    if (mapping.in_progress.includes(s)) return 'in_progress';
    if (mapping.done.includes(s)) return 'done';
    return null;
  }

  private extractTag(text: string, tag: string): string | null {
    const match = text.match(new RegExp(`\\[${tag}:([^\\]]+)\\]`));
    return match ? match[1].trim() : null;
  }

  /** Extract a text custom field value by field ID.
   *  Handles dropdown/labels: value is an orderindex → resolve name from type_config.options.
   */
  private extractCustomField(
    customFields: Array<{
      id: string;
      name: string;
      type?: string;
      value?: unknown;
      type_config?: { options?: Array<{ id: string; name: string; orderindex: number }> };
    }> | undefined,
    fieldId: string,
  ): string | null {
    if (!customFields) return null;
    const field = customFields.find((f) => f.id === fieldId);
    if (!field || field.value == null || field.value === '') return null;

    // Dropdown / labels: value is the orderindex (number) — resolve to option name
    if (
      (field.type === 'drop_down' || field.type === 'labels') &&
      field.type_config?.options
    ) {
      const idx = Number(field.value);
      const option = field.type_config.options.find((o) => o.orderindex === idx);
      return option?.name ?? null;
    }

    return String(field.value);
  }

  /** Extract a custom field name (label) by field ID */
  private extractCustomFieldLabel(
    customFields: Array<{
      id: string;
      name: string;
      type?: string;
      value?: unknown;
      type_config?: { options?: Array<{ id: string; name: string; orderindex: number }> };
    }> | undefined,
    fieldId: string,
  ): string | null {
    if (!customFields) return null;
    const field = customFields.find((f) => f.id === fieldId);
    return field?.name ?? null;
  }

  /**
   * Fetch raw tasks from ClickUp including description, url, date_updated.
   * Includes closed tasks so we can show "done" items.
   */
  private async fetchRawTasks(listId: string): Promise<Array<{
    id: string;
    name: string;
    status: { status: string };
    description?: string;
    url?: string;
    date_updated?: string;
    custom_fields?: Array<{
      id: string;
      name: string;
      type?: string;
      value?: unknown;
      type_config?: { options?: Array<{ id: string; name: string; orderindex: number }> };
    }>;
  }>> {
    const apiKey = await this.appConfig.get('clickup', 'apiKey');
    if (!apiKey) return [];

    try {
      const url =
        `${this.baseUrl}/list/${listId}/task` +
        `?include_closed=true&subtasks=false&page=0`;

      const res = await fetch(url, {
        headers: { Authorization: apiKey },
      });

      if (!res.ok) {
        this.logger.error(`ClickUp API error ${res.status} for list ${listId}`);
        return [];
      }

      const data = (await res.json()) as {
        tasks: Array<{
          id: string;
          name: string;
          status: { status: string };
          description?: string;
          url?: string;
          date_updated?: string;
          custom_fields?: Array<{
            id: string;
            name: string;
            type?: string;
            value?: unknown;
            type_config?: { options?: Array<{ id: string; name: string; orderindex: number }> };
          }>;
        }>;
      };

      return data.tasks ?? [];
    } catch (err) {
      this.logger.error('fetchRawTasks failed', err);
      return [];
    }
  }
}
