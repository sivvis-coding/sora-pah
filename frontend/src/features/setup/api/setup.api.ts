import apiClient from '../../../shared/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetupStatus {
  bootstrapped: boolean;
  devMode: boolean;
  features: Record<string, boolean>;
  links: {
    freshservice: string;
    help: string;
  };
}

export interface BootstrapPayload {
  email: string;
  password: string;
  name: string;
}

export interface BootstrapResult {
  token: string;
  message: string;
}

export interface LocalLoginPayload {
  email: string;
  password: string;
}

export interface SettingPayload {
  id: string;
  category: string;
  values: Record<string, string>;
  enabled?: boolean;
}

export interface SettingRecord {
  id: string;
  category: string;
  values: Record<string, string>;
  enabled: boolean;
}

export interface FactoryResetResult {
  reset: boolean;
  containers: Record<string, string>;
}

export interface ClickupSpaceList {
  spaceId: string;
  spaceName: string;
  lists: Array<{ id: string; name: string; source: string }>;
}

export interface ClickupStatus {
  name: string;
  color: string;
}

export interface ClickupStatusMapping {
  planned: string[];
  in_progress: string[];
  done: string[];
}

export interface ClickupPriorityMapping {
  high: string[];
  medium: string[];
  low: string[];
}

export interface ClickupPriorityMappingResponse {
  values: string[];
  mapping: ClickupPriorityMapping;
  selectedFieldId: string | null;
}

export interface ClickupCustomField {
  id: string;
  name: string;
  type: string;
}

export interface ClickupCustomFieldsResponse {
  fields: ClickupCustomField[];
  selectedFieldId: string | null;
}

export interface ClickupStatusesResponse {
  statuses: ClickupStatus[];
  mapping: ClickupStatusMapping;
}

export interface ClickupSpace {
  id: string;
  name: string;
}

export interface ClickupDoc {
  id: string;
  name: string;
}

export interface ClickupDocGroup {
  id: string;
  name: string;
  docs: ClickupDoc[];
}

export interface IndexedDoc {
  docId: string;
  docTitle: string;
  chunkCount: number;
}

export interface IndexResult {
  docsProcessed: number;
  pagesProcessed: number;
  chunksStored: number;
  chunksDeleted: number;
  durationMs: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const setupApi = {
  /** Public — check if system is bootstrapped */
  getStatus: (): Promise<SetupStatus> =>
    apiClient.get('/setup/status').then((r) => r.data),

  /** Public — first-time admin creation */
  bootstrap: (payload: BootstrapPayload): Promise<BootstrapResult> =>
    apiClient.post('/setup/bootstrap', payload).then((r) => r.data),

  /** Public — local admin login */
  localLogin: (payload: LocalLoginPayload): Promise<{ token: string }> =>
    apiClient.post('/setup/login', payload).then((r) => r.data),

  /** Admin — save integration settings */
  saveSettings: (payload: SettingPayload): Promise<SettingRecord> =>
    apiClient.post('/setup/settings', payload).then((r) => r.data),

  /** Admin — toggle setting enabled/disabled without touching values */
  toggleSetting: (id: string, enabled: boolean): Promise<SettingRecord> =>
    apiClient.post(`/setup/settings/${id}/toggle`, { enabled }).then((r) => r.data),

  /** Admin — get all settings (masked values) */
  getSettings: (): Promise<SettingRecord[]> =>
    apiClient.get('/setup/settings').then((r) => r.data),

  /** Any auth — feature status */
  getFeatures: (): Promise<Record<string, boolean>> =>
    apiClient.get('/setup/features').then((r) => r.data),

  /** Admin — factory reset */
  factoryReset: (): Promise<FactoryResetResult> =>
    apiClient.post('/setup/factory-reset', { confirm: 'RESET' }).then((r) => r.data),

  /** Admin — browse ClickUp lists. apiKey/teamId optional — uses stored credentials if omitted */
  getClickupLists: (apiKey?: string, teamId?: string): Promise<ClickupSpaceList[]> =>
    apiClient
      .get('/setup/clickup/lists', { params: apiKey && teamId ? { apiKey, teamId } : undefined })
      .then((r) => r.data),

  /** Admin — search ClickUp docs by name. If apiKey/teamId omitted, uses stored credentials. */
  searchClickupDocs: (search?: string, apiKey?: string, teamId?: string): Promise<ClickupDoc[]> =>
    apiClient
      .get('/setup/clickup/docs', { params: { search, apiKey, teamId } })
      .then((r) => r.data),

  /** Admin — save progress board status mapping (patch — never touches credentials) */
  saveStatusMapping: (mapping: ClickupStatusMapping): Promise<{ ok: boolean }> =>
    apiClient.post('/setup/clickup/status-mapping', mapping).then((r) => r.data),

  /** Admin — get statuses from configured lists + current mapping */
  getClickupStatuses: (): Promise<ClickupStatusesResponse> =>
    apiClient.get('/setup/clickup/statuses').then((r) => r.data),

  /** Admin — list ClickUp spaces in the workspace */
  getClickupSpaces: (): Promise<ClickupSpace[]> =>
    apiClient.get('/setup/clickup/spaces').then((r) => r.data),

  /** Admin — browse ClickUp docs grouped by folder, filtered by space */
  getClickupDocTree: (spaceId?: string): Promise<ClickupDocGroup[]> =>
    apiClient
      .get('/setup/clickup/doc-tree', { params: spaceId ? { spaceId } : undefined })
      .then((r) => r.data),

  /** Admin — get priority field options + current mapping */
  getPriorityMapping: (fieldId?: string): Promise<ClickupPriorityMappingResponse> =>
    apiClient.get('/setup/clickup/priority-mapping', { params: fieldId ? { fieldId } : undefined }).then((r) => r.data),

  /** Admin — save priority field + value→level mapping */
  savePriorityMapping: (fieldId: string, mapping: ClickupPriorityMapping): Promise<{ ok: boolean }> =>
    apiClient.post('/setup/clickup/priority-mapping', { fieldId, mapping }).then((r) => r.data),

  /** Admin — get custom fields from configured lists + current card field selection */
  getClickupCustomFields: (): Promise<ClickupCustomFieldsResponse> =>
    apiClient.get('/setup/clickup/custom-fields').then((r) => r.data),

  /** Admin — save which custom field to show on progress board cards */
  saveCardFields: (fieldId: string | null): Promise<{ ok: boolean }> =>
    apiClient.post('/setup/clickup/card-fields', { fieldId }).then((r) => r.data),

  /** Admin — list docs currently in the RAG index */
  getIndexedDocs: (): Promise<IndexedDoc[]> =>
    apiClient.get('/ai/indexed-docs').then((r) => r.data),

  /** Admin — delete a specific doc from the RAG index */
  deleteIndexedDoc: (docId: string): Promise<{ deleted: number }> =>
    apiClient.delete(`/ai/indexed-docs/${encodeURIComponent(docId)}`).then((r) => r.data),

  /** Admin — index selected docs */
  indexDocs: (docIds: string[]): Promise<IndexResult> =>
    apiClient.post('/ai/index-docs', { docIds }).then((r) => r.data),
};
