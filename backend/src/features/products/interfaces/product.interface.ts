/**
 * Product entity.
 *
 * Cosmos DB design:
 *   Container: "products"
 *   Partition key: /id
 *
 * Example document:
 * {
 *   "id": "uuid-v4",
 *   "name": "SORA Platform",
 *   "description": "Product alignment hub",
 *   "ownerId": "user-uuid",
 *   "createdAt": "2025-01-01T00:00:00.000Z"
 * }
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
