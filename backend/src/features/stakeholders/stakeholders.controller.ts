import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { StakeholdersService } from './stakeholders.service';
import { AssignStakeholderDto } from './dto/assign-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';
import { UserRole } from '../../common/constants/user-role';

@Controller('stakeholders')
export class StakeholdersController {
  constructor(private stakeholdersService: StakeholdersService) {}

  /** All authenticated users can view stakeholders for a product */
  @Get()
  findByProduct(@Query('productId') productId: string) {
    return this.stakeholdersService.findByProduct(productId);
  }

  /** Admin only: assign stakeholder */
  @Post()
  @Roles(UserRole.ADMIN)
  assign(@Body() dto: AssignStakeholderDto) {
    return this.stakeholdersService.assign(dto);
  }

  /**
   * Admin only: update weight.
   * productId is required as query param because it is the partition key.
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  updateWeight(
    @Param('id') id: string,
    @Query('productId') productId: string,
    @Body() dto: UpdateStakeholderDto,
  ) {
    return this.stakeholdersService.updateWeight(id, productId, dto);
  }

  /** Admin only: soft-delete stakeholder assignment */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @Query('productId') productId: string,
  ) {
    await this.stakeholdersService.remove(id, productId);
    return { deleted: true };
  }
}
