/**
 * Vote entity.
 *
 * Cosmos DB design:
 *   Container: "votes"
 *   Partition key: /ideaId
 */
export interface Vote {
  id: string;
  ideaId: string;
  userId: string;
  value: number;
  comment: string | null;
  createdAt: string;
}
