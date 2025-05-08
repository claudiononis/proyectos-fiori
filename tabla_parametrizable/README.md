📦 Tabla Parametrizable SAPUI5 - Guía de reutilización

Este proyecto contiene una tabla completamente reutilizable y configurable desde un archivo JSON, ideal para integrarla rápidamente en cualquier aplicación Fiori.

🧩 ¿Qué incluye esta plantilla?

Fragmento XML reutilizable (TableTemplate.fragment.xml) con tabla UI5.

Modelo JSON (config.json) con definición de columnas, botones, títulos y datos.

Controlador que construye dinámicamente columnas y botones desde el modelo.

🛠️ Cómo reutilizar esta tabla en otro proyecto

1. Copiar archivos necesarios

Copiá los siguientes archivos a tu nuevo proyecto Fiori:

/webapp/
├── fragment/
│   └── TableTemplate.fragment.xml         # Fragmento con la estructura de la tabla
├── model/
│   └── config.json                        # Datos y configuración de columnas/botones
├── controller/
│   └── View1.controller.js               # Controlador con la lógica de armado de la tabla
├── view/
│   └── View1.view.xml                    # Vista que contiene el VBox para insertar la tabla

También asegurate de tener en tu proyecto el archivo:

/webapp/Component.js                      # Agregar ahí la carga del modelo JSON

2. Ubicación esperada en la estructura del proyecto

/webapp/
├── controller/
│   └── View1.controller.js
├── fragment/
│   └── TableTemplate.fragment.xml
├── model/
│   └── config.json
├── view/
│   └── View1.view.xml
├── Component.js
├── index.html

3. Qué archivos debés crear o adaptar

Archivo

Acción

TableTemplate.fragment.xml

Copiar tal cual o personalizar su contenido

config.json

Copiar y modificar según columnas y botones que necesites

View1.controller.js

Copiar completo o integrar su lógica en tu controlador

View1.view.xml

Crear una vista con <VBox id="fragmentContainer" />

Component.js

Agregar carga del modelo JSON en init()

4. Editar config.json para tus necesidades

Podés modificar:

🔠 title: Título de la tabla.

🔢 fixedColumnCount: cantidad de columnas fijas.

📊 columns[]: título, ancho y campo asociado de cada columna.

🧭 toolbarButtons[]: texto, icono y función que deben llamar.

📦 tableData[]: datos a mostrar en la tabla.

✅ Ventajas

100% flexible y mantenible.

No requiere copiar código XML de tablas.

Columnas y botones configurables desde JSON.

Se adapta fácilmente a cualquier aplicación SAPUI5/Fiori.

❗ Consideraciones

El modelo debe estar disponible antes de ejecutar el código que accede a /config/columns.

Si vas a cargar datos desde OData o fuentes externas, deberías volver a usar attachRequestCompleted().

👤 Autor / Créditos

Plantilla desarrollada como parte de una iniciativa para reutilizar tablas complejas en SAP Fiori sin repetir estructuras XML.