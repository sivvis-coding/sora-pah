/**
 * Documentation request entity.
 *
 * Cosmos DB design:
 *   Container: "doc-requests"
 *   Partition key: /id
 */

export type DocRequestStatus = 'open' | 'documented';

export interface DocRequestComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface DocRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  status: DocRequestStatus;
  linkedDocUrl: string | null;
  linkedDocTitle: string | null;
  likeIds: string[];
  comments: DocRequestComment[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}
