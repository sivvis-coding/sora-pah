import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { ProductsModule } from './features/products/products.module';
import { StakeholdersModule } from './features/stakeholders/stakeholders.module';
import { GraphModule } from './features/graph/graph.module';
import { HealthModule } from './features/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    StakeholdersModule,
    GraphModule,
    HealthModule,
  ],
  providers: [
    // Order matters: JwtAuthGuard runs first (populates request.user),
    // then RolesGuard checks the role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
