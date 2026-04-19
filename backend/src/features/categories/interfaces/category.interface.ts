/**
 * Category entity — admin-managed master table for idea categorization.
 *
 * Cosmos DB design:
 *   Container: "categories"
 *   Partition key: /id
 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;   // hex color hint for UI chips, e.g. "#4CAF50"
  order: number;          // display order (lower = first)
  isActive: boolean;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
