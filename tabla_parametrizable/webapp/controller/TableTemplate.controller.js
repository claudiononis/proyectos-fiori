sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Button"
  ], function(Controller, Column, Label, Text, Button) {
    "use strict";
  
    return Controller.extend("tablaparametrizable.controller.TableTemplate", {
      onInit: function () {
        var oTable = this.byId("customTable");
        var oToolbar = this.byId("customToolbar");
        var oModel = this.getView().getModel();
        var aColumns = oModel.getProperty("/config/columns");
        var aButtons = oModel.getProperty("/config/toolbarButtons");
  
        aColumns.forEach(function (col) {
          oTable.addColumn(new Column({
            width: col.width,
            label: new Label({ text: col.title }),
            template: new Text({ text: `{${col.path}}` })
          }));
        });
  
        aButtons.forEach(function (btn) {
          oToolbar.addContent(new Button({
            text: btn.text,
            type: btn.type || "Default",
            icon: btn.icon || "",
            press: this[btn.press].bind(this)
          }));
        }, this);
      },
  
      onScanPress: function () {
        sap.m.MessageToast.show("Escaneo iniciado");
      },
  
      onSavePress: function () {
        sap.m.MessageToast.show("Datos guardados");
      }
    });
  });
  