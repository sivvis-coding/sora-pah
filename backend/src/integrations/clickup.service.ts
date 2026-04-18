import { Injectable, Logger } from '@nestjs/common';

/**
 * Placeholder for ClickUp integration.
 * Will handle: syncing initiatives, creating tasks, reading statuses.
 */
@Injectable()
export class ClickupService {
  private readonly logger = new Logger(ClickupService.name);

  async createTask(_data: Record<string, unknown>): Promise<string> {
    this.logger.warn('ClickupService.createTask() called — not implemented yet');
    return 'clickup-task-placeholder-id';
  }

  async getTaskStatus(_taskId: string): Promise<string> {
    this.logger.warn('ClickupService.getTaskStatus() called — not implemented yet');
    return 'placeholder';
  }
}
