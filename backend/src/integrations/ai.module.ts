import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { ClickupService } from './clickup.service';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [AIController],
  providers: [AIService, ClickupService],
  exports: [AIService],
})
export class AIModule {}
