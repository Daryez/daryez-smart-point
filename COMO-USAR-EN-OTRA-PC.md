# Instalar Daryez Smart Point en otra computadora

## Instalacion rapida

1. Copia completa la carpeta `podemos-editar-un-programa`.
2. Pegala en la otra computadora, por ejemplo en:
   - `Documentos\Daryez Smart Point`
   - `Escritorio\Daryez Smart Point`
   - una carpeta fija de trabajo del negocio
3. Abre la carpeta copiada.
4. Da doble clic en `Abrir Daryez Smart Point.bat`.
5. Si Windows pregunta con que abrirlo, elige tu navegador principal.

Tambien puedes abrir directamente `index.html`.

## Primera apertura en otra computadora

En una instalacion nueva, el sistema ahora mostrara una pregunta inicial para elegir:

- `Mantener base inicial`
- `Iniciar limpio`

Tambien puedes hacer ese proceso despues desde `Configuracion` con el boton `Restablecer todo`.

## Instalacion limpia

Si abres el sistema en una computadora nueva y no importas backup, ahora iniciara completamente limpio:

- Sin productos
- Sin inventario
- Sin clientes
- Sin proveedores
- Sin clasificaciones
- Sin ventas
- Sin creditos

Solo quedara el acceso inicial:

- Usuario: `admin`
- Contrasena: `admin`

Despues del primer ingreso, crea usuarios reales desde `Usuarios`:

- Administrador
- Supervisor
- Cajero

Recomendacion: cambia la contrasena inicial de `admin`.

## Como pasar tambien la informacion

1. En la computadora actual entra a `Backup`.
2. Pulsa `Exportar backup`.
3. Guarda el archivo `.json`.
4. En la otra computadora abre el sistema.
5. Entra a `Backup`.
6. Usa `Importar backup` y selecciona el `.json`.

El sistema ahora valida el backup antes de restaurarlo y conserva historial de respaldos automaticos.

## Compatibilidad de versiones

- El backup ahora guarda metadatos de version del sistema.
- La restauracion acepta backups antiguos y los adapta a la version actual cuando es posible.
- Antes de actualizar siempre exporta un backup nuevo.

## Como actualizar una instalacion

1. Abre la version actual y exporta backup.
2. Reemplaza la carpeta del sistema por la nueva version.
3. Abre la nueva version.
4. Importa el backup exportado.

## Recomendacion para no perder datos

- Usa siempre `Exportar backup` antes de cambiar de computadora.
- Guarda una copia del `.json` en USB, OneDrive o Google Drive.
- Si vas a actualizar el sistema, haz backup antes de reemplazar archivos.

## Forma mas simple de abrirlo

- Doble clic en `Abrir Daryez Smart Point.bat`
- O abre `index.html` directamente en el navegador

## Instalacion profesional con backend

Ahora el proyecto ya tiene `package.json` porque se agrego una base profesional con Node.js, Express, API REST, SQLite/PostgreSQL, autenticacion, multiempresa, membresias y plantillas de factura.

1. Instala Node.js 20 o superior.
2. Copia la carpeta completa del sistema a la otra PC.
3. Abre PowerShell dentro de la carpeta del proyecto.
4. Crea la configuracion:

```powershell
copy .env.example .env
```

5. Instala dependencias:

```powershell
npm install
```

6. Crea la base de datos local y el usuario inicial:

```powershell
npm run setup
```

7. Inicia el sistema:

```powershell
npm run dev
```

8. Abre:

`http://localhost:4173`

Usuario inicial del backend:

- Correo: `admin@daryez.local`
- Contrasena: `admin12345`
- Empresa inicial: `1`

Cambia esos datos en `.env` antes de usarlo en produccion.

## Modo SaaS con PostgreSQL

Para usar PostgreSQL en servidor/cloud, edita `.env`:

```env
DB_CLIENT=postgres
DATABASE_URL=postgres://user:password@localhost:5432/daryez_smart_point
```

Despues ejecuta:

```powershell
npm run setup
npm run start
```

## Por que antes no habia package.json

Antes el POS era una app estatica de doble clic. Ahora ya existe `package.json` porque empezamos la conversion real a software comercial con backend, base de datos, seguridad, API y estructura SaaS.

## Instalacion recomendada para negocio real

1. Crea una carpeta fija, por ejemplo `C:\Daryez Smart Point`.
2. Copia ahi todos los archivos del sistema.
3. Crea un acceso directo al archivo `Abrir Daryez Smart Point.bat`.
4. Coloca ese acceso directo en el escritorio.
5. Usa siempre el mismo navegador en esa computadora.
6. Entra al sistema y configura:
   - datos del negocio
   - moneda
   - impuesto
   - usuarios y roles
   - ticket
   - lector de codigo de barras
7. Exporta un backup inicial despues de configurar todo.

## Recomendacion para uso real

Para una operacion diaria mas estable, lo ideal es:

1. Mantener siempre la misma carpeta del sistema.
2. Usar el mismo navegador en esa computadora.
3. Importar el ultimo backup despues de instalar o mover el sistema.
4. Exportar backup al final de cada jornada o usar el historial automatico como respaldo adicional.

## Si luego quieres una version mas profesional

El siguiente paso seria empaquetarlo como app de escritorio con:

- `Electron`
- `Tauri`

Eso permitiria instalarlo como programa real, con icono propio y mejor control del almacenamiento local.
