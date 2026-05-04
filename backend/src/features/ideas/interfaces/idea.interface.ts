import { IdeaStatus } from '../constants/idea-status';

export interface IdeaUserStory {
  title: string;
  description: string;
  userStoryStatement: string;
  functionalDescription: string;
  acceptanceCriteriaInGherkin: string;
  constraints: string;
  outOfScope: string;
  requestedBy: string;
}

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
  tagIds: string[];
  createdBy: string;
  status: IdeaStatus;
  discardReason: string | null;
  decisionId: string | null;
  userStory: IdeaUserStory | null;
  voteCount: number;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
