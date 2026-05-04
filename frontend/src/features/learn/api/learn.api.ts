import apiClient from '../../../shared/api/client';

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
export type TimeSlot = 'morning' | 'afternoon' | 'all-day';
export type TrainingFormat = 'online' | 'in-person' | 'either';
export type TrainingStatus = 'proposed' | 'scheduled' | 'completed' | 'cancelled';

export interface DayTimeSlot {
  day: WeekDay;
  time: TimeSlot;
}

export interface TrainingAvailability {
  userId: string;
  userName: string;
  slots: DayTimeSlot[];
}

export interface TrainingSession {
  id: string;
  title: string;
  description: string;
  format: TrainingFormat;
  status: TrainingStatus;
  proposedBy: string;
  proposedByName: string;
  attendees: TrainingAvailability[];
  scheduledAt: string | null;
  durationMinutes: number | null;
  link: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

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
}

export interface SuggestedQuestion {
  id: string;
  content: string;
  authorName: string;
  answerCount: number;
  resolved: boolean;
}

export interface SuggestResult {
  questions: SuggestedQuestion[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const learnApi = {
  // Suggestions
  suggest: (text: string) =>
    apiClient.post<SuggestResult>('/learn/suggest', { text }).then((r) => r.data),

  // Questions
  getQuestions: () =>
    apiClient.get<Question[]>('/learn/questions').then((r) => r.data),

  getQuestion: (id: string) =>
    apiClient.get<Question>(`/learn/questions/${id}`).then((r) => r.data),

  createQuestion: (content: string) =>
    apiClient.post<Question>('/learn/questions', { content }).then((r) => r.data),

  addAnswer: (questionId: string, content: string) =>
    apiClient.post<Question>(`/learn/questions/${questionId}/answers`, { content }).then((r) => r.data),

  acceptAnswer: (questionId: string, answerId: string) =>
    apiClient.patch<Question>(`/learn/questions/${questionId}/accept/${answerId}`).then((r) => r.data),

  resolveQuestion: (questionId: string) =>
    apiClient.patch<Question>(`/learn/questions/${questionId}/resolve`).then((r) => r.data),

  deleteQuestion: (id: string) =>
    apiClient.delete(`/learn/questions/${id}`).then((r) => r.data),

  // Training
  getTrainingSessions: () =>
    apiClient.get<TrainingSession[]>('/learn/training').then((r) => r.data),

  getTrainingSession: (id: string) =>
    apiClient.get<TrainingSession>(`/learn/training/${id}`).then((r) => r.data),

  createTrainingSession: (data: { title: string; description: string; format?: TrainingFormat }) =>
    apiClient.post<TrainingSession>('/learn/training', data).then((r) => r.data),

  updateTrainingSession: (id: string, data: {
    status?: TrainingStatus;
    scheduledAt?: string;
    durationMinutes?: number;
    link?: string;
    location?: string;
  }) => apiClient.patch<TrainingSession>(`/learn/training/${id}`, data).then((r) => r.data),

  joinTraining: (id: string, data: { slots: DayTimeSlot[] }) =>
    apiClient.post<TrainingSession>(`/learn/training/${id}/join`, data).then((r) => r.data),

  leaveTraining: (id: string) =>
    apiClient.post<TrainingSession>(`/learn/training/${id}/leave`).then((r) => r.data),

  deleteTrainingSession: (id: string) =>
    apiClient.delete(`/learn/training/${id}`).then((r) => r.data),

  // Doc Requests
  getDocRequests: () =>
    apiClient.get<DocRequest[]>('/learn/doc-requests').then((r) => r.data),

  getDocRequest: (id: string) =>
    apiClient.get<DocRequest>(`/learn/doc-requests/${id}`).then((r) => r.data),

  createDocRequest: (data: { title: string; description: string }) =>
    apiClient.post<DocRequest>('/learn/doc-requests', data).then((r) => r.data),

  updateDocRequest: (id: string, data: {
    status?: DocRequestStatus;
    linkedDocUrl?: string;
    linkedDocTitle?: string;
  }) => apiClient.patch<DocRequest>(`/learn/doc-requests/${id}`, data).then((r) => r.data),

  toggleDocRequestLike: (id: string) =>
    apiClient.post<DocRequest>(`/learn/doc-requests/${id}/like`).then((r) => r.data),

  addDocRequestComment: (id: string, content: string) =>
    apiClient.post<DocRequest>(`/learn/doc-requests/${id}/comments`, { content }).then((r) => r.data),

  deleteDocRequest: (id: string) =>
    apiClient.delete(`/learn/doc-requests/${id}`).then((r) => r.data),
};
