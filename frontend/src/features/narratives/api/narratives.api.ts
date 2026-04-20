import apiClient from '../../../shared/api/client';

export interface ClickupTask {
  id: string;
  name: string;
  status: string;
}

export interface Narrative {
  id: string;
  title: string;
  description: string;
  why: string;
  decisionId?: string;
  originIdeaId?: string;
  clickupTaskIds: string[];
  executionStatus: 'to do' | 'in progress' | 'done' | 'unknown';
  clickupTasks: ClickupTask[];
  createdBy: string;
  createdAt: string;
}

export interface CreateNarrativePayload {
  title: string;
  why: string;
  description?: string;
  decisionId?: string;
  originIdeaId?: string;
  clickupTaskIds?: string[];
}

export const narrativesApi = {
  list: (): Promise<Narrative[]> =>
    apiClient.get('/narratives').then((r) => r.data),

  get: (id: string): Promise<Narrative> =>
    apiClient.get(`/narratives/${id}`).then((r) => r.data),

  getWorkInProgress: (): Promise<ClickupTask[]> =>
    apiClient.get('/narratives/work-in-progress').then((r) => r.data),

  create: (data: CreateNarrativePayload): Promise<Narrative> =>
    apiClient.post('/narratives', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateNarrativePayload>): Promise<Narrative> =>
    apiClient.put(`/narratives/${id}`, data).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/narratives/${id}`).then((r) => r.data),
};
