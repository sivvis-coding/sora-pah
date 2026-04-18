import apiClient from '../../../shared/api/client';

export interface Product {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
}

export const productsApi = {
  list: (): Promise<Product[]> =>
    apiClient.get('/products').then((r) => r.data),

  get: (id: string): Promise<Product> =>
    apiClient.get(`/products/${id}`).then((r) => r.data),

  create: (data: Pick<Product, 'name' | 'description'>): Promise<Product> =>
    apiClient.post('/products', data).then((r) => r.data),

  update: (id: string, data: Partial<Pick<Product, 'name' | 'description'>>): Promise<Product> =>
    apiClient.put(`/products/${id}`, data).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/products/${id}`).then((r) => r.data),
};
