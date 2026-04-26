import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/user-role';
import { RagService } from './rag.service';
import { IndexDocsDto } from '../ai.dto';

@Controller('ai')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * POST /api/ai/index-docs
   *
   * Admin-only. Indexes specific ClickUp docs by ID (and all their subpages).
   * Body: { docIds: string[] }
   */
  @Post('index-docs')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  indexDocs(@Body() dto: IndexDocsDto) {
    return this.ragService.indexDocs(dto.docIds);
  }

  /**
   * POST /api/ai/index-status
   *
   * Returns whether the index has any data and the total chunk count.
   */
  @Post('index-status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  indexStatus() {
    return this.ragService.hasIndex();
  }
}
