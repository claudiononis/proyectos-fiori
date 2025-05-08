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

                // Crear modelo del cronómetro
                const oClockModel = new JSONModel({
                    time: "00:00:00", // Tiempo inicial
                    isRunning: false, // Estado del cronómetro
                    elapsedSeconds: 0 // Tiempo transcurrido en segundos
                });
                this.setModel(oClockModel, "clock");

                // Inicializar lógica del cronómetro
                this._startClockTimer(oClockModel);      
            },


            _formatDate: function(oDate) {
                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-dd" });
                return oDateFormat.format(oDate);
            },
            _startClockTimer: function (oModel) {
                setInterval(() => {
                    if (oModel.getProperty("/isRunning")) {
                        // Incrementar el tiempo transcurrido
                        const elapsedSeconds = oModel.getProperty("/elapsedSeconds") + 1;
                        oModel.setProperty("/elapsedSeconds", elapsedSeconds);
    
                        // Convertir segundos a hh:mm:ss
                        const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
                        const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
                        const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    
                        oModel.setProperty("/time", `${hours}:${minutes}:${seconds}`);
                    }
                }, 1000);
            },
            
        });
    });
        