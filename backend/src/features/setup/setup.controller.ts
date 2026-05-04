import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Database } from '@azure/cosmos';
import * as jwt from 'jsonwebtoken';
import bcrypt = require('bcryptjs');
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/user-role';
import { SettingsService } from '../../database/settings.service';
import { AppConfigService } from '../../database/app-config.service';
import { COSMOS_DATABASE } from '../../database/cosmos.provider';

// ─── DTOs ────────────────────────────────────────────────────────────────────

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

class BootstrapDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

class LocalLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// ─── Containers to wipe on factory reset ─────────────────────────────────────

const ALL_CONTAINERS = [
  'users',
  'narratives',
  'decisions',
  'stakeholders',
  'ideas',
  'votes',
  'tags',
  'comments',
  'settings',
  'embeddings',
];

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('setup')
export class SetupController {
  constructor(
    private readonly settings: SettingsService,
    private readonly appConfig: AppConfigService,
    private readonly envConfig: ConfigService,
    @Inject(COSMOS_DATABASE) private readonly db: Database,
  ) {}

  /**
   * GET /api/setup/status
   * Public — called before auth to determine if setup wizard is needed.
   */
  @Get('status')
  @Public()
  async getStatus() {
    const bootstrapped = await this.settings.get('bootstrap');
    const features = await this.appConfig.getFeatureStatus();
    const appSetting = await this.settings.get('app');

    return {
      bootstrapped: !!bootstrapped?.enabled,
      features,
      devMode: this.envConfig.get('AUTH_DEV_MODE') === 'true',
      links: {
        freshservice: appSetting?.values?.freshserviceUrl || '',
        help: appSetting?.values?.helpUrl || '',
      },
    };
  }

  /**
   * POST /api/setup/bootstrap
   * Public — first-time setup. Creates local admin account.
   * Only works if no bootstrap has been done yet.
   */
  @Post('bootstrap')
  @Public()
  async bootstrap(@Body() dto: BootstrapDto) {
    const existing = await this.settings.get('bootstrap');
    if (existing?.enabled) {
      throw new ForbiddenException('System already bootstrapped');
    }

    if (!dto.email || !dto.password || !dto.name) {
      throw new BadRequestException('email, password, and name are required');
    }

    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Store bootstrap record
    await this.settings.upsert('bootstrap', 'system', {
      adminEmail: dto.email,
      adminName: dto.name,
      passwordHash,
    }, true);

    // Generate local admin token
    const secret = this.envConfig.get('AUTH_DEV_SECRET') || 'sora-dev-secret';
    const token = jwt.sign(
      {
        oid: 'local-admin-001',
        email: dto.email,
        name: dto.name,
        role: UserRole.ADMIN,
      },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' },
    );

    return { token, message: 'Bootstrap complete. Configure integrations next.' };
  }

  /**
   * POST /api/setup/login
   * Public — local admin login (before Azure AD is configured).
   */
  @Post('login')
  @Public()
  async localLogin(@Body() dto: LocalLoginDto) {
    const bootstrap = await this.settings.get('bootstrap');
    if (!bootstrap?.enabled) {
      throw new ForbiddenException('System not bootstrapped yet');
    }

    const { adminEmail, adminName, passwordHash } = bootstrap.values;

    if (dto.email !== adminEmail) {
      throw new ForbiddenException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, passwordHash);
    if (!valid) {
      throw new ForbiddenException('Invalid credentials');
    }

    const secret = this.envConfig.get('AUTH_DEV_SECRET') || 'sora-dev-secret';
    const token = jwt.sign(
      {
        oid: 'local-admin-001',
        email: adminEmail,
        name: adminName,
        role: UserRole.ADMIN,
      },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' },
    );

    return { token };
  }

  /**
   * POST /api/setup/settings
   * Admin only — save integration settings.
   */
  @Post('settings')
  @Roles(UserRole.ADMIN)
  async saveSettings(@Body() body: { id: string; category: string; values: Record<string, string>; enabled?: boolean }) {
    if (!body.id || !body.category || !body.values) {
      throw new BadRequestException('id, category, and values are required');
    }

    // Merge strategy: only overwrite keys that have a non-empty value.
    // Empty strings are treated as "unchanged" — the existing value is preserved.
    // This prevents masked-value overwrites when the frontend sends empty fields.
    const existing = await this.settings.get(body.id);
    const merged = { ...(existing?.values ?? {}) };
    for (const [k, v] of Object.entries(body.values)) {
      if (v !== '') merged[k] = v;
    }

    return this.settings.upsert(body.id, body.category, merged, body.enabled ?? true);
  }

  /**
   * PATCH /api/setup/settings/:id/toggle
   * Admin only — toggle enabled/disabled without touching values.
   */
  @Post('settings/:id/toggle')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleSetting(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    const existing = await this.settings.get(id);
    if (!existing) throw new BadRequestException(`Setting ${id} not found`);
    return this.settings.upsert(id, existing.category, existing.values, body.enabled);
  }

  /**
   * GET /api/setup/settings
   * Admin only — get all settings (values masked for security).
   */
  @Get('settings')
  @Roles(UserRole.ADMIN)
  async getSettings() {
    const all = await this.settings.getAll();
    // Mask sensitive values — show only last 4 chars
    return all.map((s) => ({
      ...s,
      values: Object.fromEntries(
        Object.entries(s.values).map(([k, v]) => {
          if (k === 'passwordHash') return [k, '***'];
          if (!v || v.length <= 4) return [k, v ? '****' : ''];
          return [k, `${'•'.repeat(v.length - 4)}${v.slice(-4)}`];
        }),
      ),
    }));
  }

  /**
   * GET /api/setup/features
   * Any authenticated user — which features are active.
   */
  @Get('features')
  async getFeatures() {
    return this.appConfig.getFeatureStatus();
  }

  /**
   * GET /api/setup/clickup/lists?apiKey=...&teamId=...
   * Admin only — proxy to ClickUp API to browse spaces → folders → lists.
   * apiKey/teamId optional — falls back to stored Cosmos credentials if omitted.
   */
  @Get('clickup/lists')
  @Roles(UserRole.ADMIN)
  async getClickupLists(
    @Query('apiKey') queryApiKey?: string,
    @Query('teamId') queryTeamId?: string,
  ) {
    let apiKey = queryApiKey;
    let teamId = queryTeamId;
    if (!apiKey || !teamId) {
      const cfg = await this.settings.get('clickup');
      apiKey = apiKey || cfg?.values.apiKey;
      teamId = teamId || cfg?.values.teamId;
    }
    if (!apiKey || !teamId) {
      throw new BadRequestException('ClickUp is not configured');
    }

    const baseUrl = 'https://api.clickup.com/api/v2';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };

    try {
      // Fetch all spaces in the team
      const spacesRes = await fetch(`${baseUrl}/team/${teamId}/space?archived=false`, { headers });
      if (!spacesRes.ok) {
        const body = await spacesRes.text();
        throw new BadRequestException(`ClickUp error ${spacesRes.status}: ${body}`);
      }
      const spacesData = (await spacesRes.json()) as { spaces: Array<{ id: string; name: string }> };

      const result: Array<{
        spaceId: string;
        spaceName: string;
        lists: Array<{ id: string; name: string; source: string }>;
      }> = [];

      for (const space of spacesData.spaces ?? []) {
        const lists: Array<{ id: string; name: string; source: string }> = [];

        // Direct lists in space (folderless)
        const folderlessRes = await fetch(`${baseUrl}/space/${space.id}/list?archived=false`, { headers });
        if (folderlessRes.ok) {
          const d = (await folderlessRes.json()) as { lists: Array<{ id: string; name: string }> };
          for (const l of d.lists ?? []) {
            lists.push({ id: l.id, name: l.name, source: space.name });
          }
        }

        // Folders → lists
        const foldersRes = await fetch(`${baseUrl}/space/${space.id}/folder?archived=false`, { headers });
        if (foldersRes.ok) {
          const fd = (await foldersRes.json()) as { folders: Array<{ id: string; name: string; lists: Array<{ id: string; name: string }> }> };
          for (const folder of fd.folders ?? []) {
            for (const l of folder.lists ?? []) {
              lists.push({ id: l.id, name: l.name, source: `${space.name} › ${folder.name}` });
            }
          }
        }

        if (lists.length > 0) {
          result.push({ spaceId: space.id, spaceName: space.name, lists });
        }
      }

      return result;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Failed to fetch ClickUp lists: ${err.message}`);
    }
  }

  /**
   * GET /api/setup/clickup/spaces
   * Admin only — returns all spaces in the ClickUp workspace.
   */
  @Get('clickup/spaces')
  @Roles(UserRole.ADMIN)
  async getClickupSpaces() {
    const cfg = await this.settings.get('clickup');
    const apiKey = cfg?.values.apiKey;
    const teamId = cfg?.values.teamId;
    if (!apiKey || !teamId) {
      throw new BadRequestException('ClickUp is not configured');
    }

    const v2Url = 'https://api.clickup.com/api/v2';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };

    try {
      const res = await fetch(`${v2Url}/team/${teamId}/space?archived=false`, { headers });
      if (!res.ok) {
        const body = await res.text();
        throw new BadRequestException(`ClickUp error ${res.status}: ${body}`);
      }
      const data = (await res.json()) as { spaces: Array<{ id: string; name: string }> };
      return (data.spaces ?? []).map((s) => ({ id: s.id, name: s.name }));
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Failed to fetch ClickUp spaces: ${err.message}`);
    }
  }

  /**
   * GET /api/setup/clickup/doc-tree?spaceId=...
   * Admin only — returns docs grouped by folder within a space.
   * Uses stored ClickUp credentials from Cosmos.
   */
  @Get('clickup/doc-tree')
  @Roles(UserRole.ADMIN)
  async getClickupDocTree(@Query('spaceId') spaceId?: string) {
    const cfg = await this.settings.get('clickup');
    const apiKey = cfg?.values.apiKey;
    const teamId = cfg?.values.teamId;
    if (!apiKey || !teamId) {
      throw new BadRequestException('ClickUp is not configured');
    }

    const baseUrl = 'https://api.clickup.com/api/v3';
    const v2Url = 'https://api.clickup.com/api/v2';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };

    try {
      // If spaceId provided, get folder IDs for this space first
      const spaceFolderIds = new Set<string>();
      if (spaceId) {
        spaceFolderIds.add(spaceId); // docs directly under space
        const fRes = await fetch(`${v2Url}/space/${spaceId}/folder?archived=false`, { headers });
        if (fRes.ok) {
          const fData = (await fRes.json()) as { folders: Array<{ id: string; name: string }> };
          for (const f of fData.folders ?? []) {
            spaceFolderIds.add(f.id);
          }
        }
      }

      // Fetch ALL docs in workspace — paginate via next_cursor
      type RawDoc = { id: string; name: string; parent?: { id: string; type: number; title?: string } };
      const docs: RawDoc[] = [];
      let cursor: string | undefined;
      do {
        const url = `${baseUrl}/workspaces/${teamId}/docs?limit=100${cursor ? `&next_cursor=${cursor}` : ''}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const body = await res.text();
          throw new BadRequestException(`ClickUp error ${res.status}: ${body}`);
        }
        const data = (await res.json()) as { docs: RawDoc[]; next_cursor?: string };
        docs.push(...(data.docs ?? []));
        cursor = data.next_cursor;
      } while (cursor);

      // Build lookup: docId → parent info (so we can walk up the chain)
      const parentOf = new Map<string, { id: string; type: number; title?: string }>();
      for (const doc of docs) {
        if (doc.parent) {
          parentOf.set(doc.id, doc.parent);
        }
      }

      // Resolve nearest non-doc ancestor (walk up parent.type=12 chain)
      function resolveFolder(docId: string): { id: string; type: number; title?: string } | undefined {
        const visited = new Set<string>();
        let current = parentOf.get(docId);
        while (current && current.type === 12 && !visited.has(current.id)) {
          visited.add(current.id);
          current = parentOf.get(current.id);
        }
        return current;
      }

      // Filter docs to selected space
      const filteredDocs = spaceId
        ? docs.filter((doc) => {
            const folder = resolveFolder(doc.id);
            return folder && spaceFolderIds.has(folder.id);
          })
        : docs;

      // Collect unique folder/space IDs that need name resolution
      const unresolvedParents = new Map<string, number>(); // id → type
      for (const doc of filteredDocs) {
        const folder = resolveFolder(doc.id);
        if (folder && !folder.title) {
          unresolvedParents.set(folder.id, folder.type);
        }
      }

      // Resolve parent names via ClickUp v2 API (parallel, best-effort)
      const nameMap = new Map<string, string>();
      if (unresolvedParents.size > 0) {
        const lookups = Array.from(unresolvedParents.entries()).map(
          async ([id, type]) => {
            try {
              const endpoint =
                type === 4 ? `${v2Url}/space/${id}` : `${v2Url}/folder/${id}`;
              const r = await fetch(endpoint, { headers });
              if (r.ok) {
                const body = await r.json();
                nameMap.set(id, body.name ?? id);
              }
            } catch {
              // best-effort — keep ID as fallback
            }
          },
        );
        await Promise.all(lookups);
      }

      // Group docs by resolved folder (not direct parent)
      const groups: Record<string, { id: string; name: string; docs: { id: string; name: string }[] }> = {};
      const ROOT = '__root__';

      for (const doc of filteredDocs) {
        const folder = resolveFolder(doc.id);
        const folderId = folder?.id ?? ROOT;
        const folderName =
          folder?.title
          ?? nameMap.get(folderId)
          ?? (folderId === ROOT ? 'Workspace' : folderId);

        if (!groups[folderId]) {
          groups[folderId] = { id: folderId, name: folderName, docs: [] };
        }
        groups[folderId].docs.push({ id: doc.id, name: doc.name });
      }

      return Object.values(groups).sort((a, b) =>
        a.name === 'Workspace' ? -1 : b.name === 'Workspace' ? 1 : a.name.localeCompare(b.name),
      );
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Failed to fetch ClickUp doc tree: ${err.message}`);
    }
  }

  /**
   * GET /api/setup/clickup/docs?search=...&apiKey=...&teamId=...
   * Admin only — search ClickUp docs by name.
   * apiKey/teamId optional — falls back to stored Cosmos credentials if omitted.
   */
  @Get('clickup/docs')
  @Roles(UserRole.ADMIN)
  async searchClickupDocs(
    @Query('search') search: string,
    @Query('apiKey') queryApiKey?: string,
    @Query('teamId') queryTeamId?: string,
  ) {
    let apiKey = queryApiKey;
    let teamId = queryTeamId;
    if (!apiKey || !teamId) {
      const cfg = await this.settings.get('clickup');
      apiKey = apiKey || cfg?.values.apiKey;
      teamId = teamId || cfg?.values.teamId;
    }
    if (!apiKey || !teamId) {
      throw new BadRequestException('ClickUp is not configured');
    }

    const baseUrl = 'https://api.clickup.com/api/v3';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };

    try {
      const res = await fetch(`${baseUrl}/workspaces/${teamId}/docs?limit=50`, { headers });
      if (!res.ok) {
        const body = await res.text();
        throw new BadRequestException(`ClickUp error ${res.status}: ${body}`);
      }

      const data = (await res.json()) as { docs: Array<{ id: string; name: string; parent?: { id: string; type: number } }> };
      const docs = data.docs ?? [];

      // Filter by search term if provided
      const filtered = search
        ? docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
        : docs;

      return filtered.slice(0, 20).map((d) => ({ id: d.id, name: d.name }));
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Failed to fetch ClickUp docs: ${err.message}`);
    }
  }

  /**
   * GET /api/setup/clickup/statuses
   * Admin only — returns all unique statuses from the configured sprint + backlog lists.
   * Used to configure the Progress Board column mapping.
   */
  @Get('clickup/statuses')
  @Roles(UserRole.ADMIN)
  async getClickupStatuses() {
    const cfg = await this.settings.get('clickup');
    const apiKey = cfg?.values.apiKey;
    const listId = cfg?.values.listId;
    const backlogListId = cfg?.values.productBacklogListId;

    if (!apiKey) throw new BadRequestException('ClickUp is not configured');
    if (!listId && !backlogListId) throw new BadRequestException('No lists configured — set listId or productBacklogListId first');

    const v2Url = 'https://api.clickup.com/api/v2';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };

    const listIds = [listId, backlogListId].filter(Boolean) as string[];

    // Fetch statuses from all configured lists in parallel
    const statusSets = await Promise.all(
      listIds.map(async (id) => {
        try {
          const res = await fetch(`${v2Url}/list/${id}`, { headers });
          if (!res.ok) return [];
          const data = (await res.json()) as {
            statuses?: Array<{ status: string; color: string; orderindex: number }>;
          };
          return (data.statuses ?? [])
            .sort((a, b) => a.orderindex - b.orderindex)
            .map((s) => ({ name: s.status, color: s.color }));
        } catch {
          return [];
        }
      }),
    );

    // Merge deduplicating by lowercase name, preserve color + order
    const seen = new Map<string, { name: string; color: string }>();
    for (const statuses of statusSets) {
      for (const s of statuses) {
        const key = s.name.toLowerCase();
        if (!seen.has(key)) seen.set(key, s);
      }
    }

    // Also return current saved mapping so frontend can pre-populate
    const savedMapping = {
      planned: this.parseJsonArray(cfg?.values.statusPlanned),
      in_progress: this.parseJsonArray(cfg?.values.statusInProgress),
      done: this.parseJsonArray(cfg?.values.statusDone),
    };

    return { statuses: Array.from(seen.values()), mapping: savedMapping };
  }

  private parseJsonArray(value: string | undefined): string[] {
    if (!value) return [];
    try { return JSON.parse(value); } catch { return []; }
  }

  /**
   * GET /api/setup/clickup/custom-fields
   * Admin only — returns all unique custom fields from the configured lists,
   * plus the currently saved card field selection.
   */
  @Get('clickup/custom-fields')
  @Roles(UserRole.ADMIN)
  async getClickupCustomFields() {
    const cfg = await this.settings.get('clickup');
    const apiKey = cfg?.values.apiKey;
    const listId = cfg?.values.listId;
    const backlogListId = cfg?.values.productBacklogListId;

    if (!apiKey) throw new BadRequestException('ClickUp is not configured');
    if (!listId && !backlogListId) throw new BadRequestException('No lists configured');

    const v2Url = 'https://api.clickup.com/api/v2';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };
    const listIds = [listId, backlogListId].filter(Boolean) as string[];

    const fieldSets = await Promise.all(
      listIds.map(async (id) => {
        try {
          const res = await fetch(`${v2Url}/list/${id}/field`, { headers });
          if (!res.ok) return [];
          const data = (await res.json()) as {
            fields: Array<{ id: string; name: string; type: string }>;
          };
          return (data.fields ?? []).map((f) => ({ id: f.id, name: f.name, type: f.type }));
        } catch {
          return [];
        }
      }),
    );

    // Deduplicate by field id
    const seen = new Map<string, { id: string; name: string; type: string }>();
    for (const fields of fieldSets) {
      for (const f of fields) {
        if (!seen.has(f.id)) seen.set(f.id, f);
      }
    }

    return {
      fields: Array.from(seen.values()),
      selectedFieldId: cfg?.values.cardCustomFieldId ?? null,
    };
  }

  /**
   * POST /api/setup/clickup/card-fields
   * Admin only — saves which custom field to display on progress board cards.
   * Patch-only: never touches credentials.
   */
  @Post('clickup/card-fields')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async saveCardFields(@Body() body: { fieldId: string | null }) {
    await this.settings.patch('clickup', {
      cardCustomFieldId: body.fieldId ?? '',
    });
    return { ok: true };
  }

  /**
   * GET /api/setup/clickup/priority-mapping
   * Admin only — given a priorityFieldId, returns the unique values of that
   * custom field (from type_config.options) plus the current saved mapping.
   * If no fieldId is saved/provided, returns empty values list.
   */
  @Get('clickup/priority-mapping')
  @Roles(UserRole.ADMIN)
  async getPriorityMapping(@Query('fieldId') fieldId?: string) {
    const cfg = await this.settings.get('clickup');
    const apiKey = cfg?.values.apiKey;
    const listId = cfg?.values.listId;
    const backlogListId = cfg?.values.productBacklogListId;

    if (!apiKey) throw new BadRequestException('ClickUp is not configured');

    const resolvedFieldId = fieldId || cfg?.values.priorityFieldId || null;

    const savedMapping = (() => {
      try { return cfg?.values.priorityMapping ? JSON.parse(cfg.values.priorityMapping) : { high: [], medium: [], low: [] }; }
      catch { return { high: [], medium: [], low: [] }; }
    })();

    if (!resolvedFieldId) {
      return { values: [], mapping: savedMapping, selectedFieldId: null };
    }

    // Fetch field options from ClickUp custom field definition
    const v2Url = 'https://api.clickup.com/api/v2';
    const headers = { Authorization: apiKey, 'Content-Type': 'application/json' };
    const listIds = [listId, backlogListId].filter(Boolean) as string[];

    const optionSets = await Promise.all(
      listIds.map(async (id) => {
        try {
          const res = await fetch(`${v2Url}/list/${id}/field`, { headers });
          if (!res.ok) return [];
          const data = (await res.json()) as {
            fields: Array<{
              id: string;
              name: string;
              type: string;
              type_config?: { options?: Array<{ name: string; orderindex?: number }> };
            }>;
          };
          const field = data.fields?.find((f) => f.id === resolvedFieldId);
          return (field?.type_config?.options ?? []).map((o) => ({
            name: o.name,
            orderindex: o.orderindex ?? 0,
          }));
        } catch {
          return [];
        }
      }),
    );

    // Deduplicate options by lowercase name, sort by orderindex
    const seen = new Map<string, { name: string; orderindex: number }>();
    for (const opts of optionSets) {
      for (const o of opts) {
        const key = o.name.toLowerCase();
        if (!seen.has(key)) seen.set(key, o);
      }
    }
    const values = Array.from(seen.values())
      .sort((a, b) => a.orderindex - b.orderindex)
      .map((o) => o.name);

    return { values, mapping: savedMapping, selectedFieldId: resolvedFieldId };
  }

  /**
   * POST /api/setup/clickup/priority-mapping
   * Admin only — saves priorityFieldId + the value→level mapping.
   * Patch-only: never touches credentials.
   */
  @Post('clickup/priority-mapping')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async savePriorityMapping(
    @Body() body: { fieldId: string; mapping: { high: string[]; medium: string[]; low: string[] } },
  ) {
    await this.settings.patch('clickup', {
      priorityFieldId: body.fieldId,
      priorityMapping: JSON.stringify(body.mapping),
    });
    return { ok: true };
  }

  /**
   * POST /api/setup/clickup/status-mapping
   * Admin only — saves the progress board status mapping by patching only
   * the three mapping keys into the existing clickup setting.
   * Never touches apiKey, teamId, listId or other credentials.
   */
  @Post('clickup/status-mapping')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async saveStatusMapping(
    @Body() body: { planned: string[]; in_progress: string[]; done: string[] },
  ) {
    await this.settings.patch('clickup', {
      statusPlanned:    JSON.stringify(body.planned    ?? []),
      statusInProgress: JSON.stringify(body.in_progress ?? []),
      statusDone:       JSON.stringify(body.done       ?? []),
    });
    return { ok: true };
  }

  /**
   * POST /api/setup/factory-reset
   * Admin only — wipes ALL data. Deletes all containers and recreates them empty.
   * Requires confirmation body: { confirm: "RESET" }
   */
  @Post('factory-reset')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async factoryReset(@Body() body: { confirm: string }) {
    if (body.confirm !== 'RESET') {
      throw new BadRequestException('Send { "confirm": "RESET" } to confirm factory reset');
    }

    const results: Record<string, string> = {};

    for (const name of ALL_CONTAINERS) {
      try {
        const container = this.db.container(name);
        // Read all items and delete them individually (Cosmos has no TRUNCATE)
        const { resources } = await container.items
          .query('SELECT c.id, c._partitionKey FROM c')
          .fetchAll();

        if (resources.length > 0) {
          // For containers partitioned by /id, the partition key IS the id
          // For others (votes → /ideaId, stakeholders → /productId, comments → /ideaId),
          // we need to read the full doc to get the partition key value
          const fullDocs = await container.items
            .query('SELECT * FROM c')
            .fetchAll();

          const partitionKeyMap: Record<string, string> = {
            votes: 'ideaId',
            stakeholders: 'productId',
            comments: 'ideaId',
            embeddings: 'docId',
          };

          const pkField = partitionKeyMap[name] || 'id';

          await Promise.all(
            fullDocs.resources.map((doc) =>
              container.item(doc.id, doc[pkField]).delete().catch(() => {}),
            ),
          );
          results[name] = `deleted ${fullDocs.resources.length} items`;
        } else {
          results[name] = 'already empty';
        }
      } catch (err: any) {
        if (err.code === 404) {
          results[name] = 'container not found (skipped)';
        } else {
          results[name] = `error: ${err.message}`;
        }
      }
    }

    // Clear settings cache
    this.settings['cache']?.clear?.();
    this.settings['cacheLoaded'] = false;

    return { reset: true, containers: results };
  }
}
