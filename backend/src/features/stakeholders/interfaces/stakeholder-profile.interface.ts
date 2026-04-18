/**
 * StakeholderProfile — links a User to a Product with a weight.
 *
 * Cosmos DB design:
 *   Container: "stakeholders"
 *   Partition key: /productId
 *
 * Example document:
 * {
 *   "id": "uuid-v4",
 *   "userId": "user-uuid",
 *   "productId": "product-uuid",
 *   "weight": 3,
 *   "isVIP": false
 * }
 */
export interface StakeholderProfile {
  id: string;
  userId: string;
  productId: string;
  weight: number;
  isVIP: boolean;
}
