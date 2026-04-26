import apiClient from '../../../shared/api/client';

export type ProgressColumn = 'planned' | 'in_progress' | 'done';

export interface ProgressCard {
  id: string;
  title: string;
  column: ProgressColumn;
  clickupUrl: string;
  rawStatus: string;
  dateUpdated: string | null;
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
