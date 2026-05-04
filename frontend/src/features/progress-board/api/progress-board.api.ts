import apiClient from '../../../shared/api/client';

export type ProgressColumn = 'planned' | 'in_progress' | 'done';
export type ProgressPriority = 'high' | 'medium' | 'low';

export interface ProgressCard {
  id: string;
  title: string;
  column: ProgressColumn;
  rawStatus: string;
  dateUpdated: string | null;
  description: string | null;
  requestedBy: string | null;
  customFieldValue: string | null;
  customFieldLabel: string | null;
  priority: ProgressPriority | null;
  builtBecause: string | null;
  linkedIdeaId: string | null;
  linkedDecisionId: string | null;
}

export interface ProgressBoard {
  planned: ProgressCard[];
  in_progress: ProgressCard[];
  done: ProgressCard[];
  fetchedAt: string;
}

export const progressBoardApi = {
  getBoard: (): Promise<ProgressBoard> =>
    apiClient.get('/progress-board').then((r) => r.data),
};
