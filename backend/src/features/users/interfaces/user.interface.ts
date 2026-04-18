/**
 * User entity.
 *
 * Cosmos DB design:
 *   Container: "users"
 *   Partition key: /id
 *
 * Example document:
 * {
 *   "id": "uuid-v4",
 *   "oid": "azure-ad-object-id",
 *   "email": "user@company.com",
 *   "name": "Jane Doe",
 *   "role": "standard",
 *   "vipLevel": 0,
 *   "createdAt": "2025-01-01T00:00:00.000Z"
 * }
 */
export interface User {
  id: string;
  oid: string;
  email: string;
  name: string;
  role: 'admin' | 'standard';
  vipLevel: number;
  createdAt: string;
}
