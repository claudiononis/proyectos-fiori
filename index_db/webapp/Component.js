/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define(
  ["sap/ui/core/UIComponent",
   "sap/ui/Device", 
   "indexdb/model/models",
   "indexdb/model/dbHandler",// agrego esto que es donde esta el handlerde l BD

],
  function (UIComponent, Device, models,dbHandler) {//agregar dbhandler
    "use strict";

    return UIComponent.extend("indexdb.Component", {
      metadata: {
        manifest: "json",
      },

      /**
       * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
       * @public
       * @override
       */
      init: function () {
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // enable routing
        this.getRouter().initialize();

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        /*Inicio  Agregar esto de acuerdo a la base de datos    */
        // Solo una vez: inicializamos la base de datos
        dbHandler._initializeDbConfig({
          name: "demoDB", // Nombre de la base de datos
          version: 1, // Versión de la base de datos
          store: "productos", // Nombre de la tabla o store
          //Campos de la tabla
          keyPath: "id", // Clave primaria de la tabla
          indices: ["CodigoInterno", "LugarPDisp"], // resto de los campos
          staticData: [
            // Datos estáticos para la tabla solo para prueba
            {
              id: 1,
              CodigoInterno: "A001",
              LugarPDisp: "001",
              OtroCampo: "Prueba 1",
            },
            {
              id: 2,
              CodigoInterno: "A002",
              LugarPDisp: "010",
              OtroCampo: "Prueba 2",
            },
            {
              id: 3,
              CodigoInterno: "A001",
              LugarPDisp: "005",
              OtroCampo: "Prueba 3",
            },
          ],
        });

        // Guardamos el handler como propiedad global
        this.dbHandler = dbHandler;

        /*  fin  */
      },
    });
  }
);
