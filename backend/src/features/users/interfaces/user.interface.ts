import { UserRole } from '../../../common/constants/user-role';

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
  role: UserRole;
  vipLevel: number;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  /** Base64-encoded profile photo from MS Graph (cached) */
  photoBase64?: string;
  department?: string;
  jobTitle?: string;
  /** Whether the user has dismissed the onboarding landing page */
  hasSeenLanding: boolean;
}
