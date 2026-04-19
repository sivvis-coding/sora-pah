import apiClient from '../../../shared/api/client';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export const categoriesApi = {
  /** Active categories only — for end users picking a category */
  listActive: (): Promise<Category[]> =>
    apiClient.get('/categories').then((r) => r.data),

  /** All categories (including inactive) — for admin management */
  listAll: (): Promise<Category[]> =>
    apiClient.get('/categories?all=true').then((r) => r.data),

  get: (id: string): Promise<Category> =>
    apiClient.get(`/categories/${id}`).then((r) => r.data),

  create: (data: Pick<Category, 'name'> & { description?: string; color?: string; order?: number }): Promise<Category> =>
    apiClient.post('/categories', data).then((r) => r.data),

  update: (id: string, data: Partial<Pick<Category, 'name' | 'description' | 'color' | 'order' | 'isActive'>>): Promise<Category> =>
    apiClient.put(`/categories/${id}`, data).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/categories/${id}`).then((r) => r.data),
};
