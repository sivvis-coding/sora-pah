import apiClient from '../../../shared/api/client';

export interface Tag {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  createdBy: string;
  createdAt: string;
}

export interface SuggestTagsPayload {
  title: string;
  description: string;
  existingTagNames: string[];
}

export const tagsApi = {
  /** GET /api/tags — all tags ordered by usage */
  getAll: (): Promise<Tag[]> =>
    apiClient.get('/tags').then((r) => r.data),

  /** POST /api/tags — create a new tag */
  create: (name: string, color?: string): Promise<Tag> =>
    apiClient.post('/tags', { name, color }).then((r) => r.data),

  /** POST /api/tags/suggest — AI suggests tags for an idea */
  suggest: (payload: SuggestTagsPayload): Promise<{ tags: Tag[] }> =>
    apiClient.post('/tags/suggest', payload).then((r) => r.data),

  /** PATCH /api/tags/:id — admin: rename or recolor */
  update: (id: string, data: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> =>
    apiClient.patch(`/tags/${id}`, data).then((r) => r.data),

  /** DELETE /api/tags/:id — admin only */
  remove: (id: string): Promise<void> =>
    apiClient.delete(`/tags/${id}`).then(() => undefined),
};
