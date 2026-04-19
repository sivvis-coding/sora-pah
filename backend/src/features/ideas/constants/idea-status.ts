export const IdeaStatus = {
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  CONVERTED: 'converted',
} as const;

export type IdeaStatus = (typeof IdeaStatus)[keyof typeof IdeaStatus];
