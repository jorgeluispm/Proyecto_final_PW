import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { variants, ...productData } = createProductDto;

    const newProduct = this.productRepository.create({
      ...productData,
      variants: variants.map((v) => this.variantRepository.create(v)),
    });

    return await this.productRepository.save(newProduct);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isActive: true },
      relations: {
        category: true,
        variants: true,
      },
      order: { name: 'ASC' },
    });
  }

  async findByCategory(categoryId: number): Promise<Product[]> {
    return await this.productRepository.find({
      where: { categoryId, isActive: true },
      relations: {
        variants: true,
      },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
      relations: {
        category: true,
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async updateStock(
    variantId: number,
    updateStockDto: UpdateStockDto,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepository.findOne({
      where: { id: variantId },
    });
    if (!variant)
      throw new NotFoundException('Variante de producto no encontrada');

    variant.stockQuantity = updateStockDto.stockQuantity;
    return await this.variantRepository.save(variant);
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);
    product.isActive = false;
    await this.productRepository.save(product);
    return { message: `Producto ${id} desactivado correctamente` };
  }
}
