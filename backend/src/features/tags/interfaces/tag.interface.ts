/**
 * Tag entity.
 *
 * Cosmos DB design:
 *   Container : "tags"
 *   Partition key: /id
 */
export interface Tag {
  id: string;
  name: string;          // lowercase, trimmed — canonical form
  color: string;         // hex e.g. "#6366f1"
  usageCount: number;    // denormalised counter — incremented when tag is applied
  createdBy: string;     // userId
  createdAt: string;     // ISO-8601
}
