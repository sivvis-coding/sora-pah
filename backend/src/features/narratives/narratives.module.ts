import { Module } from '@nestjs/common';
import { NarrativesController } from './narratives.controller';
import { NarrativesService } from './narratives.service';
import { NarrativeRepository } from './repositories/narrative.repository';
import { ClickupModule } from '../../integrations/clickup.module';

@Module({
  imports: [ClickupModule],
  controllers: [NarrativesController],
  providers: [NarrativesService, NarrativeRepository],
  exports: [NarrativesService],
})
export class NarrativesModule {}
