import { Injectable, Inject } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Comment } from '../interfaces/comment.interface';

const CONTAINER = 'comments';

const COMMENT_FIELDS: (keyof Comment)[] = [
  'id', 'ideaId', 'userId', 'content', 'createdAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: Comment): Comment {
  const clean = {} as Comment;
  for (const key of COMMENT_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class CommentRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findByIdea(ideaId: string): Promise<Comment[]> {
    const { resources } = await this.container.items
      .query<Comment>({
        query: 'SELECT * FROM c WHERE c.ideaId = @ideaId AND c.isDeleted = false ORDER BY c.createdAt ASC',
        parameters: [{ name: '@ideaId', value: ideaId }],
      })
      .fetchAll();
    return resources.map(sanitize);
  }

  async countByIdea(ideaId: string): Promise<number> {
    const { resources } = await this.container.items
      .query<number>({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.ideaId = @ideaId AND c.isDeleted = false',
        parameters: [{ name: '@ideaId', value: ideaId }],
      })
      .fetchAll();
    return resources[0] ?? 0;
  }

  async create(ideaId: string, userId: string, content: string): Promise<Comment> {
    const comment: Comment = {
      id: uuid(),
      ideaId,
      userId,
      content,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<Comment>(comment);
    return sanitize(resource!);
  }

  async softDelete(id: string, ideaId: string): Promise<void> {
    const { resource } = await this.container.item(id, ideaId).read<Comment>();
    if (resource) {
      await this.container.item(id, ideaId).replace({
        ...resource,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      });
    }
  }
}
