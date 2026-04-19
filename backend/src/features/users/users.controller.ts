import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { User } from './interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';

@Controller('me')
export class MeController {
  constructor(private usersService: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: User) {
    return user;
  }

  /** Current user's cached avatar from MS Graph */
  @Get('avatar')
  async getMyAvatar(@CurrentUser() user: User, @Res() res: Response) {
    const photo = await this.usersService.getAvatar(user.id);
    if (!photo) throw new NotFoundException('No avatar available');

    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** Admin: list all users */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  /** Admin: update user role or vipLevel */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * Admin: invite a user from Azure AD by email.
   * Resolves via MS Graph, creates/updates in Cosmos with photo cached.
   */
  @Post('invite')
  @Roles(UserRole.ADMIN)
  invite(@Body() dto: InviteUserDto) {
    return this.usersService.invite(dto);
  }

  /** Get a user's avatar image (served as image/jpeg) */
  @Get(':id/avatar')
  async getAvatar(@Param('id') id: string, @Res() res: Response) {
    const photo = await this.usersService.getAvatar(id);
    if (!photo) throw new NotFoundException('No avatar available');

    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}
