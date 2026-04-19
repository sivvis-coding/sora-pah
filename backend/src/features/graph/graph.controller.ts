import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { MsGraphService } from '../../integrations/msgraph.service';
import { UserRole } from '../../common/constants/user-role';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: MsGraphService) {}

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
}
