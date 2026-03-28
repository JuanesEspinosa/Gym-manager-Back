# gym-zone-api

Backend API para el sistema Gym Zone Manager -- SaaS de control de acceso y contabilidad para gimnasios.

## Stack

- **NestJS** -- framework principal
- **PostgreSQL** -- base de datos
- **TypeORM** -- ORM
- **JWT** -- autenticacion (access 15min + refresh 7 dias)
- **Socket.IO** -- eventos en tiempo real
- **pnpm** -- package manager

## Setup

### 1. Requisitos
- Node.js >= 18
- pnpm >= 8
- PostgreSQL 15+

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de PostgreSQL.

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Levantar base de datos

Configura PostgreSQL con las credenciales del `.env` y crea la base de datos:

```sql
CREATE DATABASE gymzone;
```

### 5. Seed inicial

```bash
pnpm seed
```

Crea los datos de prueba:
- SuperAdmin: `superadmin@gymzone.com` / `Admin1234!`
- Company Owner: `owner@demogym.com` / `Admin1234!`
- Admin: `admin@demogym.com` / `Admin1234!`
- Client con membresia activa (RFID: `RFID-DEMO-001`)

### 6. Iniciar en desarrollo

```bash
pnpm start:dev
```

La API estara disponible en: `http://localhost:3000/api`

## Endpoints principales

| Metodo | Ruta | Descripcion | Roles |
|--------|------|-------------|-------|
| POST | /api/auth/login | Login | Publico |
| POST | /api/auth/refresh | Refresh token | Publico |
| GET | /api/health | Health check | Publico |
| GET | /api/v1/platform/companies | Listar empresas | super_admin |
| POST | /api/v1/platform/companies | Crear empresa | super_admin |
| POST | /api/v1/platform/licenses | Crear licencia | super_admin |
| GET | /api/v1/gym/locations | Listar sedes | company_owner, admin |
| POST | /api/v1/gym/locations | Crear sede | company_owner, admin |
| GET | /api/v1/gym/clients | Listar clientes | company_owner, admin |
| POST | /api/v1/gym/clients | Crear cliente | company_owner, admin |
| POST | /api/v1/gym/memberships | Crear membresia | company_owner, admin |
| POST | /api/v1/access/validate | Validar acceso RFID/huella | admin, company_owner |

## Arquitectura

```
src/
├── modules/
│   ├── auth/           # JWT auth + estrategias Passport
│   ├── platform/       # SuperAdmin: companies + licenses
│   ├── gym/            # Core: locations, clients, memberships, access
│   └── health/         # Health check endpoint
├── common/
│   ├── guards/         # JwtAuthGuard, RolesGuard
│   ├── decorators/     # @Roles, @CurrentUser, @TenantId
│   └── interceptors/   # TenantInterceptor (multi-tenancy)
├── config/             # Variables de entorno tipadas
└── shared/
    └── database/       # TypeORM module
```

## Multi-tenancy

Todos los endpoints autenticados (excepto super_admin) operan dentro del contexto de la company del usuario autenticado. El `TenantInterceptor` extrae `company_id` del JWT y lo inyecta en `request.tenantId`. Todos los services filtran por este valor automaticamente.
