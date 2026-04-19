import { IdeaStatus } from '../constants/idea-status';

/**
 * Idea entity.
 *
 * Cosmos DB design:
 *   Container: "ideas"
 *   Partition key: /id
 */
export interface Idea {
  id: string;
  title: string;
  description: string;
  problem: string;
  value: string;
  solutionIdea: string | null;
  productId: string | null;
  categoryId: string | null;
  createdBy: string;
  status: IdeaStatus;
  voteCount: number;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
