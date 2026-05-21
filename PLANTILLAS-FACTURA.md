# Plantillas de factura

La seccion `Factura` ahora permite tres modos:

- `Diseno del sistema`: ticket/factura generada por el POS.
- `Excel importado`: lee celdas de una plantilla `.xlsx` y reemplaza placeholders.
- `HTML libre`: permite pegar o importar un archivo `.html` con CSS propio.

## Placeholders disponibles

- `{{logo}}`
- `{{empresa}}`
- `{{factura}}`
- `{{ncf}}`
- `{{comprobante_fiscal}}`
- `{{tipo_comprobante}}`
- `{{rnc_empresa}}`
- `{{rnc_cliente}}`
- `{{serie}}`
- `{{fecha}}`
- `{{cliente}}`
- `{{telefono}}`
- `{{direccion}}`
- `{{productos}}`
- `{{productos_tabla}}`
- `{{subtotal}}`
- `{{itbis}}`
- `{{impuesto}}`
- `{{total}}`
- `{{metodo_pago}}`
- `{{cajero}}`
- `{{rnc}}`
- `{{nota}}`

## Recomendacion

Para disenos con logo, columnas, colores, encabezados, firmas o formatos muy personalizados, usa `HTML libre`. Excel funciona para estructuras de celdas y texto, pero los navegadores no garantizan lectura perfecta de todos los estilos, imagenes, macros o formas internas de Excel.
