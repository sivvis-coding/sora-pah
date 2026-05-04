import { Global, Module } from '@nestjs/common';
import { cosmosDatabaseProvider } from './cosmos.provider';
import { SettingsService } from './settings.service';
import { AppConfigService } from './app-config.service';

/**
 * Global module — imports once in AppModule and the COSMOS_DATABASE
 * token, SettingsService, and AppConfigService are available everywhere.
 */
@Global()
@Module({
  providers: [cosmosDatabaseProvider, SettingsService, AppConfigService],
  exports: [cosmosDatabaseProvider, SettingsService, AppConfigService],
})
export class DatabaseModule {}
