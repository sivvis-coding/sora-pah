import { Module } from '@nestjs/common';
import { UsersController, MeController } from './users.controller';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { MsGraphModule } from '../../integrations/msgraph.module';

@Module({
  imports: [MsGraphModule],
  controllers: [UsersController, MeController],
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UsersModule {}
