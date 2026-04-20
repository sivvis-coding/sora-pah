import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';
import { NarrativesService } from './narratives.service';
import { CreateNarrativeDto } from './dto/create-narrative.dto';
import { UpdateNarrativeDto } from './dto/update-narrative.dto';

@Controller('narratives')
export class NarrativesController {
  constructor(private readonly narrativesService: NarrativesService) {}

  /** GET /api/narratives — list all narratives with ClickUp status */
  @Get()
  findAll() {
    return this.narrativesService.findAll();
  }

  /** GET /api/narratives/work-in-progress — active ClickUp tasks for the feed */
  @Get('work-in-progress')
  getWorkInProgress() {
    return this.narrativesService.getWorkInProgress();
  }

  /** GET /api/narratives/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.narrativesService.findById(id);
  }

  /** POST /api/narratives — admin only */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateNarrativeDto, @CurrentUser() user: User) {
    return this.narrativesService.create(dto, user.id);
  }

  /** PUT /api/narratives/:id — admin only */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateNarrativeDto) {
    return this.narrativesService.update(id, dto);
  }

  /** DELETE /api/narratives/:id — admin only */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.narrativesService.remove(id);
  }
}
