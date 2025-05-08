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
│   └── TableTemplate.fragment.xml
├── model/
│   └── config.json
├── controller/
│   └── View1.controller.js  (o integrá el contenido en tu controlador existente)

2. Insertar el fragmento en tu vista XML

En tu vista principal (MainView.view.xml, por ejemplo):

<VBox id="fragmentContainer" />

3. Cargar el fragmento en el controlador

En tu controlador (MainView.controller.js o similar):

Pegá el código de View1.controller.js.

Asegurate de tener los imports de Column, Label, Text, Button y Fragment.

Modificá el nombre del fragmento si cambia el namespace del nuevo proyecto.

4. **Cargar el modelo de configuración en **Component.js

Agregá este código en Component.js dentro de init():

var oConfigModel = new sap.ui.model.json.JSONModel();
oConfigModel.loadData("model/config.json");
this.setModel(oConfigModel); // modelo por defecto

5. Editar config.json para tus necesidades

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