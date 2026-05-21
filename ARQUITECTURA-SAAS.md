# Daryez Smart Point - arquitectura SaaS/local

Esta version mantiene el POS actual funcionando como frontend estatico y agrega una base profesional para migrar gradualmente a API real.

## Estructura nueva

- `server/index.js`: servidor Express y entrega segura de `index.html`, `styles.css` y `app.js`.
- `server/database`: conexion SQLite/PostgreSQL y migraciones.
- `server/middlewares`: seguridad, sesiones, permisos, tenant y errores.
- `server/modules`: modulos por dominio.
- `server/shared`: utilidades reutilizables para controladores y repositorios.

## Modulos iniciales

- `auth`: login JWT/cookie, roles y permisos.
- `tenants`: empresas para multiempresa.
- `products`, `customers`, `suppliers`: CRUD base por empresa.
- `sales`: ventas con validacion de stock.
- `supplier-invoices`: control de facturas de proveedor y alertas.
- `invoice-templates`: plantillas visuales y Excel con placeholders.
- `memberships`: planes basic/professional/enterprise.
- `analytics`, `backups`, `audit`: base para reportes, snapshots y trazabilidad.

## Siguiente migracion

1. Ejecutar migraciones y crear el usuario administrador inicial.
2. Conectar el frontend actual a `/api` por modulo.
3. Migrar `localStorage` a API con cache local/offline controlada.
4. Activar pagos reales Stripe/PayPal.
5. Convertir el editor de facturas en drag-and-drop completo.
