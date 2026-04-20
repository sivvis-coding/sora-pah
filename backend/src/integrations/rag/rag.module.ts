import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { EmbeddingsService } from './embeddings.service';
import { ClickUpDocsService } from './clickup-docs.service';

@Module({
  controllers: [RagController],
  providers: [RagService, EmbeddingsService, ClickUpDocsService],
  exports: [RagService],
})
export class RagModule {}
