import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StakeholdersService } from './stakeholders.service';
import { AssignStakeholderDto } from './dto/assign-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';

@Controller('stakeholders')
@UseGuards(AuthGuard('jwt'))
export class StakeholdersController {
  constructor(private stakeholdersService: StakeholdersService) {}

  @Get()
  findByProduct(@Query('productId') productId: string) {
    return this.stakeholdersService.findByProduct(productId);
  }

  @Post()
  assign(@Body() dto: AssignStakeholderDto) {
    return this.stakeholdersService.assign(dto);
  }

  @Put(':id')
  updateWeight(@Param('id') id: string, @Body() dto: UpdateStakeholderDto) {
    return this.stakeholdersService.updateWeight(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.stakeholdersService.remove(id);
    return { deleted: true };
  }
}
