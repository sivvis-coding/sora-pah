export interface Decision {
  id: string;
  title: string;
  rationale: string;
  linkedIdeaIds: string[];
  createdBy: string;
  createdAt: string;
}
