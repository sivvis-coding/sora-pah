import { Module } from '@nestjs/common';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';
import { IdeaRepository } from './repositories/idea.repository';
import { VoteRepository } from './repositories/vote.repository';
import { CommentRepository } from './repositories/comment.repository';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [UsersModule, CategoriesModule],
  controllers: [IdeasController],
  providers: [IdeasService, IdeaRepository, VoteRepository, CommentRepository],
  exports: [IdeasService],
})
export class IdeasModule {}
