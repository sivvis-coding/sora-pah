export const IdeaStatus = {
  OPEN: 'open',
  BACKLOG: 'backlog',
  IMPLEMENTED: 'implemented',
  DISCARDED: 'discarded',
} as const;

export type IdeaStatus = (typeof IdeaStatus)[keyof typeof IdeaStatus];
