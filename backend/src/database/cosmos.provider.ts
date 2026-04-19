import { CosmosClient, Database } from '@azure/cosmos';
import { ConfigService } from '@nestjs/config';

export const COSMOS_DATABASE = 'COSMOS_DATABASE';

/**
 * Factory provider that creates and exports the Cosmos DB Database instance.
 * Reads COSMOS_ENDPOINT and COSMOS_KEY from environment variables.
 */
export const cosmosDatabaseProvider = {
  provide: COSMOS_DATABASE,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<Database> => {
    const endpoint = config.get<string>('COSMOS_ENDPOINT');
    const key = config.get<string>('COSMOS_KEY');

    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set');
    }

    const dbName = config.get<string>('COSMOS_DATABASE_NAME') ?? 'sora';

    const client = new CosmosClient({ endpoint, key });

    // Ensure DB exists (creates if absent)
    const { database } = await client.databases.createIfNotExists({ id: dbName });

    // Ensure containers exist with correct partition keys
    await Promise.all([
      database.containers.createIfNotExists({
        id: 'users',
        partitionKey: { paths: ['/id'] },
      }),
      database.containers.createIfNotExists({
        id: 'products',
        partitionKey: { paths: ['/id'] },
      }),
      database.containers.createIfNotExists({
        id: 'stakeholders',
        partitionKey: { paths: ['/productId'] },
      }),
      database.containers.createIfNotExists({
        id: 'ideas',
        partitionKey: { paths: ['/id'] },
      }),
      database.containers.createIfNotExists({
        id: 'votes',
        partitionKey: { paths: ['/ideaId'] },
      }),
      database.containers.createIfNotExists({
        id: 'categories',
        partitionKey: { paths: ['/id'] },
      }),
      database.containers.createIfNotExists({
        id: 'comments',
        partitionKey: { paths: ['/ideaId'] },
      }),
    ]);

    return database;
  },
};
