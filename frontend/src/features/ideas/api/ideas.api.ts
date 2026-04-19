import apiClient from '../../../shared/api/client';

export interface IdeaAuthor {
  name: string;
  department: string | null;
  jobTitle: string | null;
  photoBase64: string | null;
}

export interface IdeaCategory {
  id: string;
  name: string;
  color: string | null;
}

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
  status: 'open' | 'in_review' | 'converted';
  voteCount: number;
  commentCount: number;
  createdAt: string;
  author: IdeaAuthor | null;
  category: IdeaCategory | null;
}

export interface Vote {
  id: string;
  ideaId: string;
  userId: string;
  value: number;
  comment: string | null;
  createdAt: string;
}

export interface IdeaComment {
  id: string;
  ideaId: string;
  userId: string;
  content: string;
  createdAt: string;
  author: IdeaAuthor | null;
}

export interface IdeaDetail extends Idea {
  votes: Vote[];
}

export interface IdeasListResponse {
  ideas: Idea[];
  votedIdeaIds: string[];
}

export const ideasApi = {
  list: (): Promise<IdeasListResponse> =>
    apiClient.get('/ideas').then((r) => r.data),

  get: (id: string): Promise<IdeaDetail> =>
    apiClient.get(`/ideas/${id}`).then((r) => r.data),

  create: (data: {
    title: string;
    description: string;
    problem: string;
    value: string;
    solutionIdea?: string;
    productId?: string;
    categoryId?: string;
  }): Promise<Idea> =>
    apiClient.post('/ideas', data).then((r) => r.data),

  updateStatus: (id: string, status: Idea['status']): Promise<Idea> =>
    apiClient.patch(`/ideas/${id}/status`, { status }).then((r) => r.data),

  vote: (id: string, comment?: string): Promise<Vote> =>
    apiClient.post(`/ideas/${id}/vote`, { comment }).then((r) => r.data),

  removeVote: (id: string): Promise<void> =>
    apiClient.delete(`/ideas/${id}/vote`).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/ideas/${id}`).then((r) => r.data),

  // Comments
  getComments: (ideaId: string): Promise<IdeaComment[]> =>
    apiClient.get(`/ideas/${ideaId}/comments`).then((r) => r.data),

  addComment: (ideaId: string, content: string): Promise<IdeaComment> =>
    apiClient.post(`/ideas/${ideaId}/comments`, { content }).then((r) => r.data),

  deleteComment: (ideaId: string, commentId: string): Promise<void> =>
    apiClient.delete(`/ideas/${ideaId}/comments/${commentId}`).then((r) => r.data),
};
