sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
], function (Controller, ODataModel, Filter, FilterOperator, MessageBox, JSONModel) {
    "use strict";
    var ctx;  // Variable global en el controlador para guardar el contexto

    return Controller.extend("ventilado.ventilado.controller.Verdesafectacion", {

        onInit: function () {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            // Obtener el router y attachRouteMatched
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("Verdesafectacion").attachMatched(this.onRouteMatched, this);
            var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
            var aFilters = [];
            aFilters.push(new Filter("Transporte", FilterOperator.EQ, localStorage.getItem('sReparto')));
            ctx = this;
            var oJSONModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oJSONModel);
            oModel.read("/zdesafectacionSet", {
                filters: aFilters,
                success: function (oData) {
                    var oJSONModel = ctx.getView().getModel();
                    // var oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData({ tableData: oData.results });
                    ctx.getView().setModel(oJSONModel);


                },
                error: function (oError) {
                    console.error("Error al leer datos del servicio OData:", oError);

                }
            });



        },

        onRouteMatched: function () {
            // Ejecutar acciones cada vez que la ruta es navegada
            var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
            var aFilters = [];
            aFilters.push(new Filter("Transporte", FilterOperator.EQ, localStorage.getItem('sReparto')));
            ctx = this;
            oModel.read("/zdesafectacionSet", {
                filters: aFilters,
                success: function (oData) {
                    var oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData({ tableData: oData.results });
                    ctx.getView().setModel(oJSONModel);


                },
                error: function (oError) {
                    console.error("Error al leer datos del servicio OData:", oError);

                }
            });
        },
        formatResultIcon: function (value) {
            if (value === 0) {
                return "sap-icon://accept"; // Icono de éxito
            } else if (value === 1) {
                return "sap-icon://decline"; // Icono de error
            }
            return "";
        },

        formatResultColor: function (value) {
            if (value === 0) {
                return "Success"; // Color verde para éxito
            } else if (value === 1) {
                return "Error"; // Color rojo para error
            }
            return "None";
        },




    });
});
