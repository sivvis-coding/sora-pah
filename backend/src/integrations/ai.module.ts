import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { ClickupService } from './clickup.service';
import { RagModule } from './rag/rag.module';
import { IdeasModule } from '../features/ideas/ideas.module';

@Module({
  imports: [RagModule, IdeasModule],
  controllers: [AIController],
  providers: [AIService, ClickupService],
  exports: [AIService],
})
export class AIModule {}
