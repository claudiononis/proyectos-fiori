# 📦 Modelo Fiori con IndexedDB

Este proyecto es una aplicación base desarrollada en SAPUI5 (Fiori) que demuestra cómo integrar `IndexedDB` dentro de una app UI5. Puede ser utilizada como plantilla para incorporar almacenamiento local persistente en tus propios proyectos Fiori.

---

## 🚀 ¿Para qué sirve?

- Guardar datos localmente en el navegador
- Funcionar parcialmente sin conexión
- Mantener datos aunque el usuario recargue o cierre el navegador

---

## 🧩 ¿Cómo integrar esto en tu propio proyecto?

1. **Copiar los archivos necesarios:**

   Desde este repositorio, copiá las siguientes partes a tu proyecto:

   ```
   /controller/Main.controller.js       ← Lógica con IndexedDB
   /model/models.js                     ← Inicialización de modelos (ajustable)
   /view/Main.view.xml                  ← Vista con acciones de ejemplo
   ```

2. **Incluir la inicialización de IndexedDB:**

   Dentro del `Main.controller.js`, se crean y gestionan las conexiones con IndexedDB. Podés copiar las funciones como:

   ```javascript
   this.db = indexedDB.open("NombreDB", 1);
   ```

   y adaptarlas a la estructura de datos que necesites.

3. **Adaptar la lógica a tus datos:**

   Modificá el nombre de la base, las tablas (object stores) y las claves según tus necesidades:

   ```javascript
   request.onupgradeneeded = function(event) {
     let db = event.target.result;
     db.createObjectStore("miTabla", { keyPath: "id" });
   };
   ```

4. **Reutilizar funciones CRUD:**

   Podés extraer funciones como `agregarDato`, `leerDatos`, `borrarDato`, etc., del controlador y usarlas en cualquier parte de tu app.

5. **Ajustar vistas y bindings:**

   La vista XML contiene campos y botones conectados al modelo y al controlador. Solo reemplazá o adaptá los IDs y bindings según tu proyecto.

---

## 💡 Requisitos para correr

- Navegador moderno con soporte para `IndexedDB`
- SAPUI5 (versión estándar)
- Servidor web local (Live Server, BAS, o similar)

---

## 📚 Recursos útiles

- [IndexedDB en MDN](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API)
- [SAPUI5 Framework](https://sapui5.hana.ondemand.com)

---

## 🧑‍💻 Autor

Desarrollado por [claudiononis](https://github.com/claudiononis) como modelo educativo.

---

## ⚠️ Nota

Este proyecto es una base funcional, pero se recomienda modularizar y aplicar validaciones antes de usar en proyectos productivos.
