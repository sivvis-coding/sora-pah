import { Controller, Get } from '@nestjs/common';
import { ClickupService } from '../../integrations/clickup.service';

@Controller('progress-board')
export class ProgressBoardController {
  constructor(private readonly clickup: ClickupService) {}

  /** GET /api/progress-board */
  @Get()
  getBoard() {
    return this.clickup.getProgressBoard();
  }
}
