import apiClient from '../../../shared/api/client';

export interface IndexedDoc {
  docId: string;
  docTitle: string;
  chunkCount: number;
}

export interface IndexedPage {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
}

export interface PageNode {
  id: string;
  name: string;
  url: string;
  children: PageNode[];
}

export interface DocPage {
  id: string;
  name: string;
  content: string; // markdown
  url: string;     // public ClickUp URL (for reference)
}

export const docsApi = {
  listDocs(): Promise<IndexedDoc[]> {
    return apiClient.get<IndexedDoc[]>('/ai/docs').then((r) => r.data);
  },

  listPages(docId: string): Promise<IndexedPage[]> {
    return apiClient.get<IndexedPage[]>(`/ai/docs/${docId}/pages`).then((r) => r.data);
  },

  getDocTree(docId: string): Promise<PageNode[]> {
    return apiClient.get<PageNode[]>(`/ai/docs/${docId}/tree`).then((r) => r.data);
  },

  getPage(docId: string, pageId: string): Promise<DocPage> {
    return apiClient
      .get<DocPage>(`/ai/docs/${docId}/pages/${pageId}`)
      .then((r) => r.data);
  },
};
