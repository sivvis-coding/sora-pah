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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  /** All authenticated users can list products */
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  /** All authenticated users can view a product */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  /** Admin only: create */
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: User) {
    return this.productsService.create(dto, user.id);
  }

  /** Admin only: update */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  /** Admin only: soft delete */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { deleted: true };
  }
}
