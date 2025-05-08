sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ndc/BarcodeScanner",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, MessageToast, JSONModel, BarcodeScanner) {
        "use strict";

        return Controller.extend("escaner.scaner.controller.View1", {
            onScan: function (oEvent) {
                var that = this;
                BarcodeScanner.scan(
                    function (mResult) {
                        if (!mResult.cancelled) {
                            that.getView().byId("materialNumber").setValue(mResult.text);
                            /*MessageBox.show("We got a QR code\n" +
                                "Result: " + mResult.text + "\n" +
                                "Format: " + mResult.format + "\n");*/
                        }
                    },
                    function (Error) {
                        alert("Scanning failed: " + Error);
                    }
                );
            },
        });
    });