import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/user-role';
import { RagService } from './rag.service';

@Controller('ai')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * POST /api/ai/index-docs
   *
   * Admin-only endpoint to trigger re-indexing of ClickUp documentation.
   * Fetches all docs from the configured folder, chunks, embeds, and stores in Cosmos.
   */
  @Post('index-docs')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  indexDocs() {
    return this.ragService.indexDocs();
  }

  /**
   * POST /api/ai/index-status
   *
   * Check if any documents have been indexed.
   */
  @Post('index-status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async indexStatus() {
    const hasIndex = await this.ragService.hasIndex();
    return { indexed: hasIndex };
  }
}
