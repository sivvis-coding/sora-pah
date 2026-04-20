import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ClickupTask {
  id: string;
  name: string;
  status: string;
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
  private readonly apiKey: string;
  private readonly backlogListId: string;
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

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('CLICKUP_API_KEY', '');
    this.backlogListId = this.config.get<string>(
      'CLICKUP_PRODUCT_BACKLOG_LIST_ID',
      '',
    );
  }

  // ─── Read: fetch tasks ───────────────────────────────────────────────────────

  /**
   * Fetch active (non-closed) tasks from a ClickUp list.
   * Returns minimal data: id, name, status.
   */
  async getTasks(listId: string): Promise<ClickupTask[]> {
    if (!this.apiKey) {
      this.logger.warn('CLICKUP_API_KEY not configured — returning empty tasks');
      return [];
    }

    try {
      const url = `${this.baseUrl}/list/${listId}/task?include_closed=false&subtasks=false&page=0`;
      const res = await fetch(url, {
        headers: { Authorization: this.apiKey },
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
    if (!this.apiKey) {
      this.logger.warn('CLICKUP_API_KEY not configured');
      throw new Error('ClickUp integration not configured');
    }
    if (!this.backlogListId) {
      this.logger.warn('CLICKUP_PRODUCT_BACKLOG_LIST_ID not configured');
      throw new Error('Product Backlog list ID not configured');
    }

    const url = `${this.baseUrl}/list/${this.backlogListId}/task`;

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
        Authorization: this.apiKey,
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
}
