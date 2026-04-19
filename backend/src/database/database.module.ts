import { Global, Module } from '@nestjs/common';
import { cosmosDatabaseProvider } from './cosmos.provider';

/**
 * Global module — imports once in AppModule and the COSMOS_DATABASE
 * token is available everywhere.
 */
@Global()
@Module({
  providers: [cosmosDatabaseProvider],
  exports: [cosmosDatabaseProvider],
})
export class DatabaseModule {}
