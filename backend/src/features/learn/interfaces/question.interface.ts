/**
 * Question entity — community Q&A.
 *
 * Cosmos DB design:
 *   Container: "questions"
 *   Partition key: /id
 */

export interface Answer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  isAccepted: boolean;
  isBot: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  answers: Answer[];
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
