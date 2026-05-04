import { Module } from '@nestjs/common';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';
import { QuestionRepository } from './repositories/question.repository';
import { TrainingSessionRepository } from './repositories/training-session.repository';
import { DocRequestRepository } from './repositories/doc-request.repository';
import { RagModule } from '../../integrations/rag/rag.module';
import { AIModule } from '../../integrations/ai.module';

@Module({
  imports: [RagModule, AIModule],
  controllers: [LearnController],
  providers: [
    LearnService,
    QuestionRepository,
    TrainingSessionRepository,
    DocRequestRepository,
  ],
  exports: [LearnService],
})
export class LearnModule {}
