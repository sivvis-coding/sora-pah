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

export interface KnowledgeSource {
  title: string;
  url: string;
}

export interface KnowledgeAnswer {
  answer: string;
  sources: KnowledgeSource[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClickUpResult {
  taskId: string;
  taskUrl: string;
}

export interface SimilarIdea {
  id: string;
  title: string;
  similarity: number;
  reason: string;
}

export interface IdeaDraft {
  need: string;
  why: string;
  how: string;
  module: string;
}

export interface DocSuggestion {
  title: string;
  url: string;
}

export interface Guardrail {
  type: 'bug' | 'documented';
  docSuggestions: DocSuggestion[];
}

export interface ConverseResult {
  reply: string;
  ready: boolean;
  draft: IdeaDraft | null;
  responseId: string | null;
  guardrail: Guardrail | null;
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
  sendToClickUp: async (ideaId: string, story: UserStory): Promise<ClickUpResult> => {
    const res = await apiClient.post<ClickUpResult>('/ai/send-to-clickup', { ideaId, ...story });
    return res.data;
  },

  /**
   * Detect semantically similar existing ideas before submission.
   * Pass the current ideas list from the client cache to avoid extra DB calls.
   */
  findSimilarIdeas: async (
    text: string,
    ideas: Array<{ id: string; title: string; description: string }>,
  ): Promise<SimilarIdea[]> => {
    const res = await apiClient.post<SimilarIdea[]>('/ai/find-similar-ideas', { text, ideas });
    return res.data;
  },
  /**
   * Multi-turn conversational idea discovery.
   * Uses Responses API with previous_response_id — OpenAI manages state.
   * Only send the latest user message + the ID from the previous turn.
   */
  converseIdea: async (
    message: string,
    previousResponseId: string | null,
    images?: string[],
  ): Promise<ConverseResult> => {
    const res = await apiClient.post<ConverseResult>('/ai/converse', {
      message,
      previousResponseId,
      ...(images && images.length > 0 ? { images } : {}),
    });
    return res.data;
  },
};
