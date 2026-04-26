import { Module } from '@nestjs/common';
import { ProgressBoardController } from './progress-board.controller';
import { ClickupModule } from '../../integrations/clickup.module';

@Module({
  imports: [ClickupModule],
  controllers: [ProgressBoardController],
})
export class ProgressBoardModule {}
