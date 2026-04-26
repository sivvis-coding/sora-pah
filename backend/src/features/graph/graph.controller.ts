import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { MsGraphService } from '../../integrations/msgraph.service';
import { UserRole } from '../../common/constants/user-role';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: MsGraphService) {}

  /**
   * Any authenticated user: search Azure AD users by email/name.
   * Used by the share dialog people picker.
   *
   * GET /api/graph/people?search=john
   */
  @Get('people')
  searchPeople(@Query('search') search: string) {
    if (!search || search.length < 2) return [];
    return this.graphService.searchUsers(search);
  }

  /**
   * Admin only: search Azure AD users by email/name.
   * Used by the invite dialog to find users to add to SORA.
   *
   * GET /api/graph/users?search=john@company.com
   */
  @Get('users')
  @Roles(UserRole.ADMIN)
  searchUsers(@Query('search') search: string) {
    if (!search || search.length < 2) return [];
    return this.graphService.searchUsers(search);
  }

  /**
   * Admin only: test Teams DM — verifies Chat.Create + ChatMessage.Send permissions.
   * POST /api/graph/test-dm  { "email": "you@company.com" }
   * REMOVE after testing.
   */
  @Post('test-dm')
  @Roles(UserRole.ADMIN)
  async testDm(@Body() body: { email: string }) {
    const user = await this.graphService.resolveByEmail(body.email);
    if (!user) return { ok: false, reason: 'user not found in Azure AD' };

    const sent = await this.graphService.sendTeamsDirectMessage(
      user.oid,
      '<b>Test SORA</b> — Teams DM permissions working ✅',
    );
    return { ok: sent, oid: user.oid, displayName: user.displayName };
  }
}
