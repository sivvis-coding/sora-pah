import { Module } from '@nestjs/common';
import { StakeholdersController } from './stakeholders.controller';
import { StakeholdersService } from './stakeholders.service';
import { StakeholderRepository } from './repositories/stakeholder.repository';

@Module({
  controllers: [StakeholdersController],
  providers: [StakeholdersService, StakeholderRepository],
  exports: [StakeholdersService],
})
export class StakeholdersModule {}
