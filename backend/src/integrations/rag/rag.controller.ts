import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/user-role';
import { RagService } from './rag.service';
import { ClickUpDocsService } from './clickup-docs.service';
import { IndexDocsDto } from '../ai.dto';

@Controller('ai')
export class RagController {
  constructor(
    private readonly ragService: RagService,
    private readonly clickupDocs: ClickUpDocsService,
  ) {}

  /**
   * POST /api/ai/index-docs
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
   * GET /api/ai/indexed-docs
   * Admin-only. Returns list of docs currently in the index.
   */
  @Get('indexed-docs')
  @Roles(UserRole.ADMIN)
  getIndexedDocs() {
    return this.ragService.getIndexedDocs();
  }

  /**
   * DELETE /api/ai/indexed-docs/:docId
   * Admin-only. Removes all chunks for a specific doc from the index.
   */
  @Delete('indexed-docs/:docId')
  @Roles(UserRole.ADMIN)
  deleteIndexedDoc(@Param('docId') docId: string) {
    return this.ragService.deleteDoc(docId);
  }

  /**
   * POST /api/ai/index-status
   * Returns whether the index has any data and the total chunk count.
   */
  @Post('index-status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  indexStatus() {
    return this.ragService.hasIndex();
  }

  /**
   * GET /api/ai/docs
   * Returns list of indexed docs (docId + docTitle). Accessible to all authenticated users.
   */
  @Get('docs')
  getDocs() {
    return this.ragService.getIndexedDocs();
  }

  /**
   * GET /api/ai/docs/:docId/pages
   * Returns the list of indexed pages for a doc (pageId + pageTitle + pageUrl).
   * Accessible to all authenticated users.
   */
  @Get('docs/:docId/pages')
  getDocPages(@Param('docId') docId: string) {
    return this.ragService.getIndexedPages(docId);
  }

  /**
   * GET /api/ai/docs/:docId/tree
   * Returns the full page hierarchy (tree) for a doc. Fetched live from ClickUp.
   * Accessible to all authenticated users.
   */
  @Get('docs/:docId/tree')
  async getDocTree(@Param('docId') docId: string) {
    try {
      return await this.clickupDocs.getDocTree(docId);
    } catch {
      throw new NotFoundException(`Doc ${docId} not found`);
    }
  }

  /**
   * GET /api/ai/docs/:docId/pages/:pageId
   * Returns the full markdown content of a specific page. Accessible to all authenticated users.
   */
  @Get('docs/:docId/pages/:pageId')
  async getDocPage(
    @Param('docId') docId: string,
    @Param('pageId') pageId: string,
  ) {
    try {
      return await this.clickupDocs.getPage(docId, pageId);
    } catch {
      throw new NotFoundException(`Page ${pageId} not found in doc ${docId}`);
    }
  }
}
