# Plan: gym-zone-api — Fase 1 MVP

**Date**: 2026-03-27
**Complexity**: complex
**Estimated time**: 120 min

## Acceptance Criteria
- [ ] Proyecto NestJS inicializado con pnpm en `/gym-zone-api/`
- [ ] Conexión a PostgreSQL funcional via TypeORM
- [ ] 8 entidades creadas con relaciones correctas
- [ ] Auth con JWT (access 15min + refresh 7 días) operativo
- [ ] TenantInterceptor inyecta company_id en cada request autenticado
- [ ] RolesGuard protege rutas según rol
- [ ] CRUD Companies + Licenses (SuperAdmin)
- [ ] CRUD Locations, Clients, Memberships (Company/Admin)
- [ ] POST /api/v1/access/validate retorna granted + registra AccessLog síncrono
- [ ] GET /api/health responde 200
- [ ] docker-compose.yml levanta PostgreSQL

## Edge Cases
1. Client sin membresía activa → `granted: false`, `reason: "no_active_membership"`
2. Company con licencia inactiva → `granted: false`, `reason: "company_license_inactive"`
3. RFID/fingerprint no encontrado → `granted: false`, `reason: "client_not_found"`
4. Admin intenta acceder a sede no asignada → 403 Forbidden
5. Token expirado → 401 con mensaje claro para que el frontend haga refresh
6. company_id ausente en JWT de super_admin → TenantInterceptor lo omite (super_admin no tiene tenant)

---

## Tasks

### Task 1 — Scaffold del proyecto NestJS
**Agent**: platform-expert
**Files**:
- `/home/juanes/Escritorio/Proyectos/Gym-zone-manager/gym-zone-api/package.json`
- `/home/juanes/Escritorio/Proyectos/Gym-zone-manager/gym-zone-api/src/main.ts`
- `/home/juanes/Escritorio/Proyectos/Gym-zone-manager/gym-zone-api/src/app.module.ts`
- `/home/juanes/Escritorio/Proyectos/Gym-zone-manager/gym-zone-api/.env.example`
**Time**: 5 min

Steps:
1. Crear el proyecto NestJS con pnpm en el directorio existente:
   ```bash
   cd /home/juanes/Escritorio/Proyectos/Gym-zone-manager/gym-zone-api
   npx @nestjs/cli new . --package-manager pnpm --skip-git
   ```
2. Instalar dependencias core:
   ```bash
   pnpm add @nestjs/typeorm typeorm pg
   pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
   pnpm add @nestjs/config class-validator class-transformer
   pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
   pnpm add bcryptjs uuid
   pnpm add -D @types/passport-jwt @types/bcryptjs @types/uuid
   ```
3. Crear `.env.example` con todas las variables necesarias
4. Configurar `main.ts`: prefijo global `/api`, ValidationPipe global, CORS

Verification: `cd /home/juanes/Escritorio/Proyectos/Gym-zone-manager/gym-zone-api && pnpm build`

---

### Task 2 — Config Module + Database Module
**Agent**: backend-db-expert
**Files**:
- `src/config/configuration.ts`
- `src/config/database.config.ts`
- `src/shared/database/database.module.ts`
- `src/app.module.ts`
**Time**: 4 min

Steps:
1. Crear `src/config/configuration.ts` que exporta la configuración tipada desde variables de entorno:
   ```typescript
   export default () => ({
     port: parseInt(process.env.PORT, 10) || 3000,
     database: {
       host: process.env.DB_HOST || 'localhost',
       port: parseInt(process.env.DB_PORT, 10) || 5432,
       username: process.env.DB_USER || 'gymzone',
       password: process.env.DB_PASSWORD || 'gymzone',
       name: process.env.DB_NAME || 'gymzone',
     },
     jwt: {
       accessSecret: process.env.JWT_ACCESS_SECRET,
       refreshSecret: process.env.JWT_REFRESH_SECRET,
       accessExpiresIn: '15m',
       refreshExpiresIn: '7d',
     },
   });
   ```
2. Crear `src/shared/database/database.module.ts` con TypeORM `forRootAsync` usando ConfigService
3. Registrar `ConfigModule.forRoot({ isGlobal: true })` y `DatabaseModule` en `AppModule`

Verification: `pnpm build` sin errores de TypeScript

---

### Task 3 — Entidades TypeORM
**Agent**: backend-db-expert
**Files**:
- `src/modules/platform/companies/entities/company.entity.ts`
- `src/modules/platform/licenses/entities/license.entity.ts`
- `src/modules/gym/locations/entities/location.entity.ts`
- `src/modules/auth/entities/user.entity.ts`
- `src/modules/gym/clients/entities/client.entity.ts`
- `src/modules/gym/memberships/entities/membership.entity.ts`
- `src/modules/gym/access/entities/access-log.entity.ts`
- `src/modules/accounting/entities/sale.entity.ts`
**Time**: 5 min

Steps:
1. **License**: `id (uuid), plan_type (enum: basic|pro|enterprise), max_locations, valid_until (date), is_active (bool), company_id (FK)`
2. **Company**: `id (uuid), name, tax_id, is_active (bool), license (OneToOne → License)`
3. **Location**: `id (uuid), company_id (FK → Company), name, address, timezone`
4. **User**: `id (uuid), company_id (FK → Company, nullable para super_admin), email (unique), password_hash, role (enum: super_admin|company_owner|admin), location_ids (simple-json o ManyToMany a Location)`
5. **Client**: `id (uuid), company_id (FK → Company), fingerprint_hash (nullable), rfid_code (nullable), full_name, email, phone, is_active`
6. **Membership**: `id (uuid), client_id (FK → Client), company_id (FK → Company), type (enum: monthly|quarterly|annual), start_date, end_date, is_active`
7. **AccessLog**: `id (uuid), client_id (FK), company_id, location_id (FK), access_method (enum: rfid|fingerprint), granted (bool), timestamp`
8. **Sale**: `id (uuid), client_id (FK), company_id, location_id (FK), admin_id (FK → User), amount (decimal), concept, payment_method (enum: cash|card|transfer), created_at`
9. Agregar todas las entidades al array `entities` del DatabaseModule

Verification: `pnpm build` — todas las entidades compilan sin errores

---

### Task 4 — Auth Module (JWT + Refresh Tokens)
**Agent**: security-expert
**Files**:
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/strategies/jwt-refresh.strategy.ts`
- `src/modules/auth/dto/login.dto.ts`
- `src/modules/auth/dto/refresh-token.dto.ts`
**Time**: 5 min

Steps:
1. `LoginDto`: `{ email: string, password: string }` con validaciones class-validator
2. `AuthService.login()`:
   - Busca User por email
   - Valida bcrypt password
   - Genera `access_token` (payload: `{ sub: user.id, email, role, company_id }`, expiresIn: 15m)
   - Genera `refresh_token` (expiresIn: 7d, secret diferente)
   - Retorna `{ access_token, refresh_token, user: { id, email, role } }`
3. `AuthService.refresh()`: valida refresh token, emite nuevo access token
4. `JwtStrategy`: extrae Bearer token, retorna payload como `request.user`
5. `AuthController`:
   - `POST /api/auth/login`
   - `POST /api/auth/refresh`
   - `POST /api/auth/logout` (placeholder, stateless por ahora)

Verification: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}' → 401`

---

### Task 5 — Guards, Decorators e Interceptor (Common)
**Agent**: security-expert
**Files**:
- `src/common/guards/jwt-auth.guard.ts`
- `src/common/guards/roles.guard.ts`
- `src/common/decorators/roles.decorator.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/common/decorators/tenant-id.decorator.ts`
- `src/common/interceptors/tenant.interceptor.ts`
**Time**: 4 min

Steps:
1. `JwtAuthGuard` extiende `AuthGuard('jwt')` de passport
2. `@Roles(...roles: Role[])` — SetMetadata decorator
3. `RolesGuard`: implementa `CanActivate`, lee metadata de roles, compara con `request.user.role`
4. `@CurrentUser()` — `createParamDecorator` que retorna `request.user`
5. `@TenantId()` — `createParamDecorator` que retorna `request.tenantId`
6. `TenantInterceptor`:
   - Si `request.user.role === 'super_admin'` → no inyecta tenantId (puede operar en cualquier company)
   - Si no → extrae `company_id` del JWT payload y lo asigna a `request.tenantId`
   - Registrar como interceptor global en `AppModule` (después de auth guard)

Verification: `pnpm build` sin errores

---

### Task 6 — Platform Module: Companies + Licenses
**Agent**: backend-db-expert
**Files**:
- `src/modules/platform/companies/companies.controller.ts`
- `src/modules/platform/companies/companies.service.ts`
- `src/modules/platform/companies/dto/create-company.dto.ts`
- `src/modules/platform/licenses/licenses.controller.ts`
- `src/modules/platform/licenses/licenses.service.ts`
- `src/modules/platform/licenses/dto/create-license.dto.ts`
- `src/modules/platform/platform.module.ts`
**Time**: 5 min

Steps:
1. **CompaniesService**: `findAll()`, `findOne(id)`, `create(dto)`, `update(id, dto)`, `activate(id)`, `deactivate(id)`
   - Todos los métodos solo accesibles por `super_admin`
2. **LicensesService**: `create(dto)`, `findByCompany(companyId)`, `activate(id)`, `deactivate(id)`
3. **CompaniesController**: rutas bajo `/api/v1/platform/companies`, guard `@UseGuards(JwtAuthGuard)`, `@Roles('super_admin')`
4. **LicensesController**: rutas bajo `/api/v1/platform/licenses`
5. Registrar en `PlatformModule` e importar en `AppModule`

Verification: `pnpm build` + endpoints responden 401 sin token

---

### Task 7 — Gym Module: Locations + Clients + Memberships
**Agent**: backend-db-expert
**Files**:
- `src/modules/gym/locations/locations.controller.ts`
- `src/modules/gym/locations/locations.service.ts`
- `src/modules/gym/locations/dto/create-location.dto.ts`
- `src/modules/gym/clients/clients.controller.ts`
- `src/modules/gym/clients/clients.service.ts`
- `src/modules/gym/clients/dto/create-client.dto.ts`
- `src/modules/gym/memberships/memberships.controller.ts`
- `src/modules/gym/memberships/memberships.service.ts`
- `src/modules/gym/memberships/dto/create-membership.dto.ts`
- `src/modules/gym/gym.module.ts`
**Time**: 5 min

Steps:
1. **LocationsService**: todos los queries filtran por `company_id` (del `request.tenantId`)
   - `findAll(companyId)`, `findOne(id, companyId)`, `create(dto, companyId)`, `update`, `remove`
2. **ClientsService**: igual, filtrar por `company_id`. Incluir búsqueda por `rfid_code` y `fingerprint_hash`
3. **MembershipsService**: crear membresía asigna `company_id` del client. `findActive(clientId)` retorna membresía vigente (fecha actual entre start_date y end_date, is_active=true)
4. Roles permitidos:
   - Locations: `company_owner` y `admin` (admin solo ve sus sedes asignadas)
   - Clients: `company_owner` y `admin`
   - Memberships: `company_owner` y `admin`

Verification: `pnpm build`

---

### Task 8 — Access Module: Validación de Acceso
**Agent**: backend-db-expert
**Files**:
- `src/modules/gym/access/access.controller.ts`
- `src/modules/gym/access/access.service.ts`
- `src/modules/gym/access/dto/validate-access.dto.ts`
**Time**: 4 min

Steps:
1. `ValidateAccessDto`:
   ```typescript
   class ValidateAccessDto {
     @IsUUID() location_id: string;
     @IsEnum(['rfid', 'fingerprint']) method: 'rfid' | 'fingerprint';
     @IsString() credential: string;
   }
   ```
2. `AccessService.validate(dto, companyId)`:
   ```
   1. Buscar Client por (company_id + rfid_code) o (company_id + fingerprint_hash)
      → Si no encontrado: { granted: false, reason: 'client_not_found' }
   2. Verificar company.license.is_active
      → Si no: { granted: false, reason: 'company_license_inactive' }
   3. Buscar Membership activa del client (is_active=true AND end_date >= NOW())
      → Si no: { granted: false, reason: 'no_active_membership' }
   4. Insertar AccessLog (síncrono, no bloqueante para la respuesta):
      this.accessLogRepo.save({ client_id, company_id, location_id, method, granted: true, timestamp: new Date() })
   5. Retornar { granted: true, client_name: client.full_name }
   ```
3. Endpoint: `POST /api/v1/access/validate` — requiere auth con rol `admin`
4. No usar `await` para el AccessLog save (fire-and-forget):
   ```typescript
   this.accessLogRepo.save(log).catch(err => console.error('AccessLog save failed', err));
   ```

Verification: `pnpm build`

---

### Task 9 — Health Check Endpoint
**Agent**: platform-expert
**Files**:
- `src/modules/health/health.controller.ts`
- `src/modules/health/health.module.ts`
**Time**: 2 min

Steps:
1. Instalar: `pnpm add @nestjs/terminus`
2. Crear `HealthController` con `GET /api/health`:
   ```typescript
   @Get()
   @HealthCheck()
   check() {
     return this.health.check([
       () => this.db.pingCheck('database'),
     ]);
   }
   ```
3. Registrar `HealthModule` en `AppModule`

Verification: `curl http://localhost:3000/api/health → { status: 'ok' }`

---

### Task 10 — Seed Inicial + Validación End-to-End
**Agent**: backend-db-expert
**Files**:
- `src/database/seeds/initial.seed.ts`
- `README.md`
**Time**: 4 min

Steps:
1. Script de seed que crea:
   - SuperAdmin user: `superadmin@gymzone.com` / `Admin1234!`
   - Una Company demo con License activa
   - Un Location demo
   - Un Admin user asignado al Location
   - Un Client con Membership activa
2. Agregar scripts en `package.json`: `"seed": "ts-node src/database/seeds/initial.seed.ts"`
3. Actualizar `README.md` con instrucciones de setup:
   ```
   docker-compose up -d
   pnpm install
   cp .env.example .env
   pnpm seed
   pnpm start:dev
   ```

Verification:
```bash
# Login como SuperAdmin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@gymzone.com","password":"Admin1234!"}' \
  → { access_token: "...", refresh_token: "..." }
```
