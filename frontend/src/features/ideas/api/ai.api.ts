import apiClient from '../../../shared/api/client';

export interface IdeaImprovement {
  suggestedTitle: string;
  suggestedSummary: string;
}

/**
 * Full User Story — matches the Python agent model and ClickUp custom fields.
 */
export interface UserStory {
  title: string;
  description: string;
  userStoryStatement: string;
  functionalDescription: string;
  acceptanceCriteriaInGherkin: string;
  constraints: string;
  outOfScope: string;
  requestedBy: string;
}

export interface KnowledgeAnswer {
  answer: string;
  sources: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClickUpResult {
  taskId: string;
  taskUrl: string;
}

export const aiApi = {
  improveIdea: async (data: {
    description: string;
    problem?: string;
    solutionIdea?: string;
  }): Promise<IdeaImprovement> => {
    const res = await apiClient.post<IdeaImprovement>('/ai/improve-idea', data);
    return res.data;
  },

  classifyIntent: async (
    text: string,
  ): Promise<{ intent: 'bug' | 'help' | 'idea'; confidence: number }> => {
    const res = await apiClient.post<{
      intent: 'bug' | 'help' | 'idea';
      confidence: number;
    }>('/ai/classify-intent', { text });
    return res.data;
  },

  generateUserStory: async (data: {
    title: string;
    description: string;
    problem?: string;
    value?: string;
    solutionIdea?: string;
  }): Promise<UserStory> => {
    const res = await apiClient.post<UserStory>('/ai/generate-user-story', data);
    return res.data;
  },

  /**
   * Knowledge assistant Q&A.
   * Pass the full conversation history so the backend can inject prior turns
   * into the OpenAI context — mirrors the Python agent's InMemorySaver.
   */
  askQuestion: async (
    question: string,
    history: ChatMessage[] = [],
  ): Promise<KnowledgeAnswer> => {
    const res = await apiClient.post<KnowledgeAnswer>('/ai/ask', {
      question,
      history,
    });
    return res.data;
  },

  /**
   * Send an approved user story to the ClickUp Product Backlog.
   * This is the human-in-the-loop gate — only called after the user
   * reviews and explicitly confirms the generated story.
   */
  sendToClickUp: async (story: UserStory): Promise<ClickUpResult> => {
    const res = await apiClient.post<ClickUpResult>('/ai/send-to-clickup', story);
    return res.data;
  },
};
