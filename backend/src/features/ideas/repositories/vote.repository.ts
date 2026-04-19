import { Injectable, Inject } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Vote } from '../interfaces/vote.interface';

const CONTAINER = 'votes';

const VOTE_FIELDS: (keyof Vote)[] = [
  'id', 'ideaId', 'userId', 'value', 'comment', 'createdAt',
];

function sanitize(raw: Vote): Vote {
  const clean = {} as Vote;
  for (const key of VOTE_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class VoteRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findByIdea(ideaId: string): Promise<Vote[]> {
    const { resources } = await this.container.items
      .query<Vote>({
        query: 'SELECT * FROM c WHERE c.ideaId = @ideaId',
        parameters: [{ name: '@ideaId', value: ideaId }],
      })
      .fetchAll();
    return resources.map(sanitize);
  }

  async findByUserAndIdea(userId: string, ideaId: string): Promise<Vote | undefined> {
    const { resources } = await this.container.items
      .query<Vote>({
        query: 'SELECT * FROM c WHERE c.ideaId = @ideaId AND c.userId = @userId',
        parameters: [
          { name: '@ideaId', value: ideaId },
          { name: '@userId', value: userId },
        ],
      })
      .fetchAll();
    return resources.length > 0 ? sanitize(resources[0]) : undefined;
  }

  async create(ideaId: string, userId: string, comment?: string): Promise<Vote> {
    const vote: Vote = {
      id: uuid(),
      ideaId,
      userId,
      value: 1,
      comment: comment ?? null,
      createdAt: new Date().toISOString(),
    };
    const { resource } = await this.container.items.create<Vote>(vote);
    return sanitize(resource!);
  }

  async delete(id: string, ideaId: string): Promise<void> {
    await this.container.item(id, ideaId).delete();
  }
}
