# Plan: gym-zone-api — Cierre de Fase 1 MVP

**Date**: 2026-03-28
**Complexity**: medium
**Estimated time**: 55 min

## Acceptance Criteria

- [ ] `company_owner` puede crear, listar, actualizar y desactivar admins dentro de su company
- [ ] `company_owner` puede asignar sedes a sus admins via `PUT /v1/platform/users/:id/locations`
- [ ] `admin` solo ve las sedes que tiene asignadas (filtrado por `location_ids` del JWT)
- [ ] `POST /v1/accounting/sales` registra una venta y retorna el registro creado
- [ ] `GET /v1/accounting/sales` lista ventas filtradas por company (+ opcional por `location_id`)
- [ ] Swagger disponible en `/api/docs`

## Edge Cases

1. Admin sin `location_ids` asignados → `findAll(locations)` retorna arreglo vacío (no error)
2. Crear admin con email duplicado → 409 Conflict
3. Crear venta con `client_id` que no pertenece a la company → 404 Not Found
4. Crear venta con `location_id` que no pertenece a la company → 404 Not Found
5. `company_owner` intenta acceder a usuarios de otra company → filtrado por `tenantId` previene acceso

---

## Tasks

### Task 1 — DTOs del UsersModule

**Agent**: backend-db-expert
**Files**:

- `src/modules/users/dto/create-user.dto.ts`
- `src/modules/users/dto/update-user.dto.ts`
- `src/modules/users/dto/assign-locations.dto.ts`
  **Time**: 3 min

Steps:

1. Crear `src/modules/users/dto/create-user.dto.ts`:

```typescript
import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum([UserRole.ADMIN])
  role: UserRole.ADMIN = UserRole.ADMIN;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  location_ids?: string[];
}
```

2. Crear `src/modules/users/dto/update-user.dto.ts`:

```typescript
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}
```

3. Crear `src/modules/users/dto/assign-locations.dto.ts`:

```typescript
import { IsArray, IsUUID } from 'class-validator';

export class AssignLocationsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  location_ids: string[];
}
```

Verification: `pnpm build` sin errores

---

### Task 2 — UsersService

**Agent**: backend-db-expert
**Files**:

- `src/modules/users/users.service.ts`
  **Time**: 5 min

Steps:

1. Crear `src/modules/users/users.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../auth/entities/user.entity';
import { Location } from '../gym/locations/entities/location.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignLocationsDto } from './dto/assign-locations.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  findAll(companyId: string) {
    return this.userRepository.find({
      where: { company_id: companyId, role: UserRole.ADMIN },
      select: [
        'id',
        'email',
        'role',
        'location_ids',
        'is_active',
        'created_at',
      ],
    });
  }

  async findOne(id: string, companyId: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      select: [
        'id',
        'email',
        'role',
        'location_ids',
        'is_active',
        'created_at',
      ],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, companyId: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password_hash,
      role: UserRole.ADMIN,
      company_id: companyId,
      location_ids: dto.location_ids ?? [],
      is_active: true,
    });
    const saved = await this.userRepository.save(user);
    const { password_hash: _, ...result } = saved;
    return result;
  }

  async update(id: string, dto: UpdateUserDto, companyId: string) {
    await this.findOne(id, companyId);
    await this.userRepository.update({ id, company_id: companyId }, dto);
    return this.findOne(id, companyId);
  }

  async assignLocations(
    id: string,
    dto: AssignLocationsDto,
    companyId: string,
  ) {
    await this.findOne(id, companyId);
    // Validar que todas las sedes pertenecen a la company
    const locations = await this.locationRepository.find({
      where: dto.location_ids.map((lid) => ({
        id: lid,
        company_id: companyId,
      })),
    });
    if (locations.length !== dto.location_ids.length) {
      throw new NotFoundException(
        'One or more locations not found in this company',
      );
    }
    await this.userRepository.update(
      { id, company_id: companyId },
      {
        location_ids: dto.location_ids,
      },
    );
    return this.findOne(id, companyId);
  }

  async deactivate(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.userRepository.update(
      { id, company_id: companyId },
      { is_active: false },
    );
    return { message: 'User deactivated successfully' };
  }
}
```

Verification: `pnpm build` sin errores

---

### Task 3 — UsersController

**Agent**: backend-db-expert
**Files**:

- `src/modules/users/users.controller.ts`
  **Time**: 3 min

Steps:

1. Crear `src/modules/users/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignLocationsDto } from './dto/assign-locations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('v1/platform/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@TenantId() companyId: string) {
    return this.usersService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() companyId: string) {
    return this.usersService.findOne(id, companyId);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @TenantId() companyId: string) {
    return this.usersService.create(dto, companyId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @TenantId() companyId: string,
  ) {
    return this.usersService.update(id, dto, companyId);
  }

  @Put(':id/locations')
  assignLocations(
    @Param('id') id: string,
    @Body() dto: AssignLocationsDto,
    @TenantId() companyId: string,
  ) {
    return this.usersService.assignLocations(id, dto, companyId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @TenantId() companyId: string) {
    return this.usersService.deactivate(id, companyId);
  }
}
```

Verification: `pnpm build` sin errores

---

### Task 4 — UsersModule + registro en AppModule

**Agent**: backend-db-expert
**Files**:

- `src/modules/users/users.module.ts`
- `src/app.module.ts`
  **Time**: 3 min

Steps:

1. Crear `src/modules/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../auth/entities/user.entity';
import { Location } from '../gym/locations/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Location])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

2. Actualizar `src/app.module.ts` — agregar import de UsersModule:

```typescript
import { UsersModule } from './modules/users/users.module';

// En el array imports[] agregar:
UsersModule,
```

Verification: `pnpm build` sin errores → `curl -X GET http://localhost:3000/api/v1/platform/users → 401`

---

### Task 5 — Agregar location_ids al JWT payload

**Agent**: security-expert
**Files**:

- `src/modules/auth/auth.service.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
  **Time**: 4 min

Steps:

1. Modificar `src/modules/auth/auth.service.ts` — en `login()` y `refresh()` agregar `location_ids` al payload:

En `login()`, cambiar la construcción del payload:

```typescript
// ANTES:
const payload: Record<string, unknown> = {
  sub: user.id,
  email: user.email,
  role: user.role,
  company_id: user.company_id ?? null,
};

// DESPUÉS:
const payload: Record<string, unknown> = {
  sub: user.id,
  email: user.email,
  role: user.role,
  company_id: user.company_id ?? null,
  location_ids: user.location_ids ?? [],
};
```

En `refresh()`, aplicar el mismo cambio al `newPayload`:

```typescript
// ANTES:
const newPayload: Record<string, unknown> = {
  sub: user.id,
  email: user.email,
  role: user.role,
  company_id: user.company_id ?? null,
};

// DESPUÉS:
const newPayload: Record<string, unknown> = {
  sub: user.id,
  email: user.email,
  role: user.role,
  company_id: user.company_id ?? null,
  location_ids: user.location_ids ?? [],
};
```

2. Modificar `src/modules/auth/strategies/jwt.strategy.ts` — actualizar `JwtPayload` y `validate()`:

```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  company_id: string | null;
  location_ids: string[];
}

// En validate():
async validate(payload: JwtPayload) {
  const user = await this.userRepository.findOne({
    where: { id: payload.sub, is_active: true },
  });
  if (!user) {
    throw new UnauthorizedException('User not found or inactive');
  }
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    company_id: payload.company_id,
    location_ids: payload.location_ids ?? [],
  };
}
```

Verification: `pnpm build` sin errores

---

### Task 6 — Filtrado de sedes por rol de usuario

**Agent**: backend-db-expert
**Files**:

- `src/modules/gym/locations/locations.service.ts`
- `src/modules/gym/locations/locations.controller.ts`
  **Time**: 4 min

Steps:

1. Modificar `src/modules/gym/locations/locations.service.ts` — actualizar `findAll()`:

```typescript
import { UserRole } from '../../auth/entities/user.entity';

// Reemplazar el método findAll existente:
findAll(companyId: string, userRole?: string, userLocationIds?: string[]) {
  if (userRole === UserRole.ADMIN && userLocationIds?.length) {
    return this.locationRepository.find({
      where: userLocationIds.map(id => ({ id, company_id: companyId })),
    });
  }
  return this.locationRepository.find({ where: { company_id: companyId } });
}
```

2. Modificar `src/modules/gym/locations/locations.controller.ts` — actualizar el `@Get()`:

Agregar import de `CurrentUser`:

```typescript
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
```

Reemplazar el método `findAll`:

```typescript
@Get()
findAll(@TenantId() companyId: string, @CurrentUser() user: any) {
  return this.locationsService.findAll(companyId, user.role, user.location_ids);
}
```

Verification: `pnpm build` sin errores

---

### Task 7 — DTOs + AccountingModule

**Agent**: backend-db-expert
**Files**:

- `src/modules/accounting/sales/dto/create-sale.dto.ts`
- `src/modules/accounting/accounting.module.ts`
  **Time**: 3 min

Steps:

1. Crear `src/modules/accounting/sales/dto/create-sale.dto.ts`:

```typescript
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../accounting/entities/sale.entity';

export class CreateSaleDto {
  @IsUUID()
  client_id: string;

  @IsUUID()
  location_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @MaxLength(500)
  concept: string;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;
}
```

2. Crear `src/modules/accounting/accounting.module.ts` (esqueleto — se completará en Task 9):

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { Client } from '../gym/clients/entities/client.entity';
import { Location } from '../gym/locations/entities/location.entity';
import { SalesService } from './sales/sales.service';
import { SalesController } from './sales/sales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Client, Location])],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class AccountingModule {}
```

Verification: `pnpm build` sin errores

---

### Task 8 — SalesService

**Agent**: backend-db-expert
**Files**:

- `src/modules/accounting/sales/sales.service.ts`
  **Time**: 5 min

Steps:

1. Crear `src/modules/accounting/sales/sales.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Client } from '../../gym/clients/entities/client.entity';
import { Location } from '../../gym/locations/entities/location.entity';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(dto: CreateSaleDto, companyId: string, adminId: string) {
    const client = await this.clientRepository.findOne({
      where: { id: dto.client_id, company_id: companyId },
    });
    if (!client)
      throw new NotFoundException(
        `Client ${dto.client_id} not found in this company`,
      );

    const location = await this.locationRepository.findOne({
      where: { id: dto.location_id, company_id: companyId },
    });
    if (!location)
      throw new NotFoundException(
        `Location ${dto.location_id} not found in this company`,
      );

    const sale = this.saleRepository.create({
      client_id: dto.client_id,
      company_id: companyId,
      location_id: dto.location_id,
      admin_id: adminId,
      amount: dto.amount,
      concept: dto.concept,
      payment_method: dto.payment_method,
    });
    return this.saleRepository.save(sale);
  }

  findAll(companyId: string, locationId?: string) {
    const where: Record<string, unknown> = { company_id: companyId };
    if (locationId) where.location_id = locationId;
    return this.saleRepository.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['client', 'location'],
    });
  }
}
```

Verification: `pnpm build` sin errores

---

### Task 9 — SalesController + registro en AppModule

**Agent**: backend-db-expert
**Files**:

- `src/modules/accounting/sales/sales.controller.ts`
- `src/app.module.ts`
  **Time**: 4 min

Steps:

1. Crear `src/modules/accounting/sales/sales.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('v1/accounting/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @Body() dto: CreateSaleDto,
    @TenantId() companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.salesService.create(dto, companyId, user.id);
  }

  @Get()
  findAll(
    @TenantId() companyId: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.salesService.findAll(companyId, locationId);
  }
}
```

2. Actualizar `src/app.module.ts` — agregar AccountingModule:

```typescript
import { AccountingModule } from './modules/accounting/accounting.module';

// En imports[] agregar:
AccountingModule,
```

Verification: `pnpm build` → `curl -X POST http://localhost:3000/api/v1/accounting/sales → 401`

---

### Task 10 — Swagger / OpenAPI

**Agent**: platform-expert
**Files**:

- `src/main.ts`
- `package.json` (solo install)
  **Time**: 4 min

Steps:

1. Instalar dependencia:

```bash
pnpm add @nestjs/swagger
```

2. Modificar `src/main.ts` — agregar configuración de Swagger después de crear la app y antes de `app.listen()`:

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// Después de app.setGlobalPrefix y ValidationPipe, agregar:
const config = new DocumentBuilder()
  .setTitle('Gym Zone API')
  .setDescription('API de control de acceso y contabilidad para gimnasios')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Verification: `pnpm start:dev` → abrir `http://localhost:3000/api/docs` → debe mostrar la documentación Swagger

---

## Verification Final

```bash
# 1. Build limpio
pnpm build

# 2. Levantar servicios
docker-compose up -d
pnpm seed
pnpm start:dev

# 3. Login como company_owner
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demogym.com","password":"Admin1234!"}'
# → { access_token: "...", refresh_token: "..." }

# 4. Crear admin (con el token de company_owner)
curl -X POST http://localhost:3000/api/v1/platform/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin2@demogym.com","password":"Admin1234!"}'
# → { id: "...", email: "admin2@demogym.com", role: "admin" }

# 5. Registrar venta
curl -X POST http://localhost:3000/api/v1/accounting/sales \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"<ID>","location_id":"<ID>","amount":50000,"concept":"Mensualidad","payment_method":"cash"}'
# → { id: "...", amount: "50000", ... }

# 6. Swagger UI
# Abrir: http://localhost:3000/api/docs
```

## Rollback Plan

Si alguna tarea falla:

1. Detener en la tarea que falló
2. `git stash` o revertir archivos modificados
3. Verificar el error con `pnpm build`
4. Corregir y continuar desde esa tarea
