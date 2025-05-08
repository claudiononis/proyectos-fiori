sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Fragment",
  "sap/ui/table/Column",
  "sap/m/Label",
  "sap/m/Text",
  "sap/m/Button",
  "sap/m/MessageToast"
], function (Controller, Fragment, Column, Label, Text, Button, MessageToast) {
  "use strict";

  return Controller.extend("tablaparametrizable.controller.View1", {
    onInit: function () {
      // Obtener la vista actual y el VBox donde se insertará el fragmento
      var oView = this.getView();
      var oVBox = this.byId("fragmentContainer");

      // Cargar el fragmento reutilizable que contiene la tabla
      Fragment.load({
        id: oView.getId(), // asegura que los IDs internos del fragmento sean únicos
        name: "tablaparametrizable.fragment.TableTemplate", // nombre del fragmento XML
        controller: this // pasar el controlador actual para manejar eventos
      }).then(function (oFragment) {
        // Insertar el fragmento en la vista
        oVBox.addItem(oFragment);

        // Obtener el modelo cargado en Component.js
        var oModel = oView.getModel();
        if (!oModel) {
          console.error("El modelo no está disponible.");
          return;
        }

        // Leer los datos de configuración desde el modelo JSON
        var aColumns = oModel.getProperty("/config/columns");
        var aButtons = oModel.getProperty("/config/toolbarButtons");

        if (!aColumns || !aButtons) {
          console.warn("No hay columnas o botones definidos en el modelo.");
          return;
        }

        // Obtener las referencias a los controles de la tabla y toolbar del fragmento
        var oTable = oView.byId("customTable");
        var oToolbar = oView.byId("customToolbar");

        // Agregar columnas dinámicamente a la tabla, según la definición del JSON
        aColumns.forEach(function (col) {
          oTable.addColumn(new Column({
            width: col.width,
            label: new Label({ text: col.title }),
            template: new Text({ text: `{${col.path}}` }) // binding al campo definido
          }));
        });

        // Agregar botones dinámicamente al toolbar, según la definición del JSON
        aButtons.forEach(function (btn) {
          oToolbar.addContent(new Button({
            text: btn.text,
            type: btn.type || "Default",
            icon: btn.icon || "",
            press: this[btn.press].bind(this) // ejecuta el método correspondiente del controlador
          }));
        }, this);
      }.bind(this));
    },

    // Acción del botón Escanear
    onScanPress: function () {
      MessageToast.show("Escaneo iniciado");
    },

    // Acción del botón Guardar
    onSavePress: function () {
      MessageToast.show("Datos guardados");
    }
  });
});
