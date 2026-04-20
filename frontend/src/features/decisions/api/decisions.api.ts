import apiClient from '../../../shared/api/client';

export interface Decision {
  id: string;
  title: string;
  rationale: string;
  linkedIdeaIds: string[];
  createdBy: string;
  createdAt: string;
}

export const decisionsApi = {
  list: (): Promise<Decision[]> =>
    apiClient.get('/decisions').then((r) => r.data),

  create: (data: { title: string; rationale: string; linkedIdeaIds?: string[] }): Promise<Decision> =>
    apiClient.post('/decisions', data).then((r) => r.data),
};
