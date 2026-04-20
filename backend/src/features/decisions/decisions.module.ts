import { Module } from '@nestjs/common';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { DecisionRepository } from './repositories/decision.repository';

@Module({
  controllers: [DecisionsController],
  providers: [DecisionsService, DecisionRepository],
  exports: [DecisionsService],
})
export class DecisionsModule {}
