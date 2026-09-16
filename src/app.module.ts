import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static'; // <-- 1. Importar módulo estático
import { join } from 'path'; // <-- 2. Importar helper de rutas

// Controladores y Servicios base
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos del sistema
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { BranchesModule } from './branches/branches.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';

// Entidades para TypeORM
import { User } from './users/entities/user.entity';
import { Category } from './categories/entities/category.entity';
import { Product } from './products/entities/product.entity';
import { ProductVariant } from './products/entities/product-variant.entity';
import { Order } from './sales/entities/order.entity';
import { OrderItem } from './sales/entities/order-item.entity';
import { PaymentDetail } from './sales/entities/payment-detail.entity';
import { CashShift } from './cash-register/entities/cash-shift.entity';
import { CashTransaction } from './cash-register/entities/cash-transaction.entity';
import { Branch } from './branches/entities/branch.entity';

@Module({
  imports: [
    // 3. Configuración para servir la carpeta public/
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'], // Mantiene libres las rutas de la API REST
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbHost = configService.get<string>('DB_HOST');
        return {
          type: 'postgres',
          host: dbHost,
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [
            User,
            Category,
            Product,
            ProductVariant,
            Order,
            OrderItem,
            PaymentDetail,
            CashShift,
            CashTransaction,
            Branch,
          ],
          synchronize: false,
          ssl: {
            rejectUnauthorized: false,
            servername: dbHost, // SNI para el Pooler de Supabase
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    SalesModule,
    CashRegisterModule,
    BranchesModule,
    AuditModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}