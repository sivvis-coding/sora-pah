import { Module } from '@nestjs/common';
import { ClickupService } from './clickup.service';

@Module({
  providers: [ClickupService],
  exports: [ClickupService],
})
export class ClickupModule {}
