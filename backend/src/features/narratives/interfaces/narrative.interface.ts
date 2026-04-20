/**
 * Narrative entity — "What's Being Built"
 *
 * Each narrative tells the story of a piece of work:
 * what is being built, why, where the idea came from,
 * and links to ClickUp tasks for live execution status.
 *
 * Cosmos DB container: "narratives", partition key: /id
 */
export interface Narrative {
  id: string;
  title: string;
  description: string;
  why: string;
  decisionId?: string;
  originIdeaId?: string;
  clickupTaskIds: string[];
  createdBy: string;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
