/**
 * Comment entity.
 *
 * Cosmos DB design:
 *   Container: "comments"
 *   Partition key: /ideaId
 */
export interface Comment {
  id: string;
  ideaId: string;
  userId: string;
  content: string;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
