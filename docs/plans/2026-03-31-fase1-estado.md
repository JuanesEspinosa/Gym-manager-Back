# Estado: gym-zone-api — Fase 1 MVP

**Actualizado**: 2026-03-31

---

## Lo que se implementó

### UsersModule (`src/modules/users/`)

- `dto/create-user.dto.ts` — valida email, password (min 8), role=ADMIN, location_ids opcionales
- `dto/update-user.dto.ts` — partial de CreateUserDto sin email ni password
- `dto/assign-locations.dto.ts` — array de UUIDs de sedes
- `users.service.ts` — findAll, findOne, create (409 si email duplicado), update, assignLocations (404 si sede no pertenece a la company), deactivate
- `users.controller.ts` — endpoints en `v1/platform/users`, restringidos a `company_owner`
- `users.module.ts` — registra User + Location entities

**Endpoints:**
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/v1/platform/users` | Listar admins de la company |
| POST | `/api/v1/platform/users` | Crear admin |
| GET | `/api/v1/platform/users/:id` | Ver admin |
| PUT | `/api/v1/platform/users/:id` | Actualizar admin |
| PUT | `/api/v1/platform/users/:id/locations` | Asignar sedes al admin |
| PATCH | `/api/v1/platform/users/:id/deactivate` | Desactivar admin |

---

### AccountingModule (`src/modules/accounting/`)

- `sales/dto/create-sale.dto.ts` — valida client_id, location_id, amount, concept, payment_method
- `sales/sales.service.ts` — create (valida que client y location pertenezcan a la company), findAll (filtrable por location_id)
- `sales/sales.controller.ts` — endpoints en `v1/accounting/sales`, accesible por `company_owner` y `admin`
- `accounting.module.ts` — registra Sale, Client, Location entities

**Endpoints:**
| Método | URL | Descripción |
|--------|-----|-------------|
| POST | `/api/v1/accounting/sales` | Registrar venta |
| GET | `/api/v1/accounting/sales` | Listar ventas (query: `?location_id=`) |

---

### JWT — location_ids

- `auth.service.ts` — `location_ids` incluido en el payload de `login()` y `refresh()`
- `jwt.strategy.ts` — `JwtPayload` actualizado, `validate()` retorna `location_ids`

---

### Filtrado de sedes por rol

- `locations.service.ts` — `findAll()` filtra por `location_ids` del usuario cuando el rol es `ADMIN`
- `locations.controller.ts` — pasa `CurrentUser` al service para el filtrado

---

### Swagger

- `@nestjs/swagger` instalado
- `main.ts` — documentación disponible en `GET /api/docs`

---

### AppModule

- `UsersModule` y `AccountingModule` registrados en `src/app.module.ts`

---

## Lo que falta

### No probado en runtime

- Los endpoints **no fueron probados con el servidor corriendo**. Solo se verificó `pnpm build` (compilación sin errores).
- Falta ejecutar la verificación final del plan:
  ```bash
  docker-compose up -d
  pnpm seed
  pnpm start:dev
  # Luego los curls del plan original
  ```

### Posibles gaps a validar

- Edge case: admin con `location_ids: []` → `findAll(locations)` debe retornar `[]` (no error) — **no probado**
- Edge case: `PUT /locations` con IDs de otra company → debe retornar 404 — **no probado**
- Edge case: `POST /sales` con `client_id` de otra company → debe retornar 404 — **no probado**
- Swagger UI: verificar que `GET /api/docs` carga correctamente en browser — **no probado**

### Fuera de scope de Fase 1 (no implementado)

- Decoradores `@ApiProperty()` en DTOs y entidades para documentación Swagger detallada
- Paginación en listados (`/users`, `/sales`)
- Tests unitarios e integración
- `DELETE /v1/platform/users/:id` (solo se implementó deactivate/soft-delete)
- Filtros adicionales en `/sales` (por fecha, por cliente, por método de pago)
- Refresh token rotation (actualmente no invalida el token anterior)
