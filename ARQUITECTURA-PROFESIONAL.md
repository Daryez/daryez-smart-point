# Arquitectura profesional de Daryez Smart Point

## Estado actual

La version web funciona como aplicacion local sin servidor y se abre desde `index.html`.
Por compatibilidad, el punto de entrada sigue siendo `app.js`, pero el codigo ya incorpora
fronteras logicas para separar seguridad, auditoria, backups, validacion, ventas,
catalogos, caja, reportes, configuracion e impresion.

## Modulos funcionales

- `auth`: usuarios, roles, sesiones y hashes de contrasena.
- `sales`: carrito, cobros, folios, devoluciones y control de stock.
- `products`: catalogo, precios, existencias, codigos y clasificaciones.
- `customers`: clientes, referencias fiscales y cuentas por cobrar.
- `suppliers`: proveedores y datos comerciales.
- `dashboard`: metricas, alertas, actividad reciente y estado de caja.
- `reports`: reportes por fecha, metodo de pago y productos.
- `backups`: exportacion, importacion, historial, integridad y recuperacion.
- `settings`: negocio, moneda, impuestos, tema, ticket y lector.
- `printing`: tickets, facturas y cortes imprimibles.

## Reglas de crecimiento

1. Mantener `app.js` como compatibilidad local hasta introducir un empaquetador.
2. Extraer primero funciones puras: validadores, formateadores, backup e integridad.
3. Extraer despues renderizadores por vista.
4. Dejar eventos de UI en un modulo de controladores.
5. Cuando exista servidor local o empaquetador, pasar a ES modules reales.

## Seguridad en frontend local

Un frontend local no puede impedir al 100% la manipulacion desde consola. Esta version
reduce el riesgo con validaciones, permisos, auditoria, hashes de contrasena, verificacion
de integridad y backups previos a restauraciones. La proteccion fuerte debe vivir tambien
en la capa persistente/backend que ya se este trabajando.
