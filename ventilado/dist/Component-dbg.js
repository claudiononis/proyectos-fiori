/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "ventilado/ventilado/model/models",
        "sap/ui/model/json/JSONModel"
       ],
    function (UIComponent, Device, models,JSONModel) {
        "use strict";

        return UIComponent.extend("ventilado.ventilado.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // Crear un modelo para gestionar el estado de autenticación
                var oAuthModel = new JSONModel({
                    isLoggedIn: false
                });
                this.setModel(oAuthModel, "auth");

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                
               // Crear el modelo global
                var oDate = new Date();
                var oFormattedDate = this._formatDate(oDate);

               var oGlobalModel = new JSONModel({
                    puesto :"",
                    reparto: "",
                    operador: "",
                    fecha: oFormattedDate,
                    cantidad: "",
                    ruta:""
                });

                // Establecer el modelo global en el componente para que esté disponible globalmente
                this.setModel(oGlobalModel, "globalModel");

            },
            _formatDate: function(oDate) {
                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-dd" });
                return oDateFormat.format(oDate);
            }
        });
    }
);