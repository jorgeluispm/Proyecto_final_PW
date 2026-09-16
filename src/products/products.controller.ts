import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // LECTURA: Disponible para todos los usuarios autenticados (CASHIER, ADMIN, ROOT)
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('category/:categoryId')
  findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.productsService.findByCategory(categoryId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // ESCRITURA: Exclusivo para ROOT y ADMIN
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ROOT)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch('variants/:variantId/stock')
  @Roles(UserRole.ADMIN, UserRole.ROOT)
  updateStock(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(variantId, updateStockDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ROOT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.softDelete(id);
  }
}
