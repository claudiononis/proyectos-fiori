sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/odata/v2/ODataModel",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageBox",
    ],
    function (
        Controller,
        MessageToast,
        JSONModel,
        ODataModel,
        Filter,
        FilterOperator,
        MessageBox
    ) {
        "use strict";
        var ctx;
        var sReparto;
        return Controller.extend("ventilado.ventilado.controller.Log", {
            onInit: function () {
                this._dbConnections = []; // Array para almacenar conexiones abiertas
                this.datosD = [];

                // Obtener el router y attachRouteMatched
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.getRoute("Log").attachMatched(this.onRouteMatched, this);

                // Manejar eventos de navegación
                window.addEventListener("beforeunload", this._handleUnload.bind(this));
                window.addEventListener("popstate", this._handleUnload.bind(this));

                var oModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(oModel);

                // Ejecutar acciones iniciales
                this.ejecutarAcciones();
            },

            onRouteMatched: async function () {
                // Ejecutar acciones cada vez que la ruta es navegada
                await this.ejecutarAcciones();
            },

            ejecutarAcciones: async function () {
                // Leer datos locales
                var sPuesto = localStorage.getItem("sPuesto");
                sReparto = localStorage.getItem("sReparto");
                var sPtoPlanif = localStorage.getItem("sPtoPlanif");
                var sUsuario = localStorage.getItem("sPreparador");

                try {
                    await this.obtenerYProcesarDatos();

                    // Ordenar datosD por IdScan
                    this.datosD.sort((a, b) => a.IdScan - b.IdScan);

                    // Calcular el total de cantidadEscaneada
                    const totalCantidadAEsc = this.datosD.reduce(
                        (total, item) => total + (item.CantEscaneada || 0),
                        0
                    );

                    // Crear un nuevo modelo JSON con los datos procesados y el total
                    var oModel = new JSONModel({
                        tableData: this.datosD,
                        totalCantidadEsc: totalCantidadAEsc,
                        Transporte: this.datosD[0]?.Transporte || "",
                    });

                    // Asignar el modelo a la vista
                    this.getView().setModel(oModel);
                } catch (error) {
                    console.error("Error al obtener y procesar datos:", error);
                }
            },

            obtenerYProcesarDatos: async function () {
                try {
                    let datos = await this.obtenerDatosDeIndexedDB();
                    this.datosD = this.procesarDatos(datos);
                } catch (error) {
                    console.error("Error al obtener y procesar datos:", error);
                }
            },

            obtenerDatosDeIndexedDB: function () {
                return new Promise((resolve, reject) => {
                    let request = indexedDB.open("ventilado", 5);

                    request.onerror = (event) => {
                        console.error("Error al abrir la base de datos:", event);
                        reject("Error al abrir la base de datos");
                    };

                    request.onsuccess = (event) => {
                        let db = event.target.result;
                        this._dbConnections.push(db); // Guardar referencia a la conexión abierta

                        let transaction = db.transaction(["ventilado"], "readonly");
                        let objectStore = transaction.objectStore("ventilado");
                        let data = [];

                        objectStore.openCursor().onsuccess = (event) => {
                            let cursor = event.target.result;
                            if (cursor) {
                                data.push(cursor.value);
                                cursor.continue();
                            } else {
                                resolve(data);
                            }
                        };
                    };
                });
            },

            procesarDatos: function (datos) {
                let resultado = {};

                datos.forEach((registro) => {
                    if (registro.CantEscaneada > 0) {
                        resultado[registro.Id] = {
                            Id: registro.Id,
                            IdScan: registro.AdicChar2,
                            Ean: registro.Ean,
                            CodigoInterno: registro.CodigoInterno,
                            Descricion: registro.Descricion,
                            RutaAsig: String(registro.LugarPDisp).padStart(2, "0"),
                            RutaConf: String(registro.LugarPDisp).padStart(2, "0"),
                            Transporte: registro.Transporte,
                            Entrega: registro.Entrega,
                            EntreProd: registro.Entrega + registro.CodigoInterno,
                            Asign: registro.Entrega + registro.CodigoInterno + "A",
                            TipoLog: "SCAN",
                            FechaHora: registro.AdicDec2,
                            Preparador: registro.Preparador,
                            Cliente: registro.Destinatario,
                            cantidadAsig: registro.CantidadEntrega,
                            AdicChar1: registro.AdicChar1,
                            AdicChar2: registro.AdicChar2,
                            Adic_Dec1: registro.Adic_Dec1,
                            CantEscaneada: registro.CantEscaneada,
                            Preparador: registro.Preparador,
                            Estado: registro.Estado,
                            Kgbrr: registro.Kgbrr,
                            M3r: registro.M3r,
                            Kgbrv: registro.Kgbrv,
                            M3v: registro.M3v,
                        };
                    }
                });

                // Convierte el objeto resultado en un array
                let arrayResultado = Object.keys(resultado).map(
                    (ruta) => resultado[ruta]
                );
                return arrayResultado;
            },
            onclick: function () {
                var tableData = oLocalModel.getProperty("/tableData");
                var tableData = oLocalModel.getProperty("/tableData");
                // Buscar el registro correspondiente en tableData
                tableData = tableData.filter(function (registro) {
                    return registro.Id !== idToRemove;
                });
                oLocalModel.setProperty("/tableData", tableData);
            },
            updateTableData: function (id, newValue) {
                var oLocalModel = this.getView().getModel();
                // var tTableData = oLocalModel.getProperty("/tableData");
                //  var oData = oContext.getObject(); // Obtén el objeto de datos usando el contexto
                var tableData = oLocalModel.getProperty("/tableData");
                // Buscar el registro correspondiente en tableData
                tableData = tableData.filter(function (registro) {
                    return registro.Id !== 1;
                });
                oLocalModel.setProperty("/tableData", tableData);
            },
            onEdit: function (oEvent) {
                var ctx = this;
                var oButton = oEvent.getSource();
                var oContext = oButton.getBindingContext();
                var sPath = oContext.getPath();
            
                // Obtener los datos de la fila
                var oData = this.getView().getModel().getProperty(sPath);
            
                // Crear un diálogo para solicitar la contraseña de administrador
                var oDialogPassword = new sap.m.Dialog({
                    title: 'Contraseña de Administrador',
                    type: 'Message',
                    content: [
                        new sap.m.Label({ text: 'Por favor ingrese la contraseña de administrador:' }),
                        new sap.m.Input({ type: 'Password', id: 'adminPassword' })
                    ],
                    beginButton: new sap.m.Button({
                        text: 'Aceptar',
                        press: function () {
                            var sPassword = sap.ui.getCore().byId('adminPassword').getValue();
            
                            // Llamada OData para validar la contraseña
                            var oModelo = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
                            oModelo.read("/ZCONFIGVENTILADOSet", {
                                urlParameters: {
                                    "Password": sPassword // El nombre del parámetro debe coincidir con el del backend
                                },
                                
                                success: function (oResponse) {
                                    if (oResponse.results[0].Passadm1 == sPassword) { // Validar la contraseña con la respuesta del backend
                                        oDialogPassword.close();
            
                                        // Proceder con la lógica de edición (continuación del código original)
                                        var oInput = new sap.m.Input({
                                            value: oData.CantEscaneada,
                                            type: "Number", // Asegurarse de que la entrada sea numérica
                                            liveChange: function (oEvent) {
                                                var sValue = oEvent.getParameter("value");
                                            },
                                        });
            
                                        var oDialogEdit = new sap.m.Dialog({
                                            title: "Cantidad Escaneada realmente",
                                            content: [
                                                // Agregar campos para editar el ítem aquí
                                                oInput,
                                            ],
                                            beginButton: new sap.m.Button({
                                                text: "Save",
                                                press: function () {
                                                    var updatedValue = oInput.getValue();
                                                    var Kgbrr;
                                                    var M3r;
                                                    // Lógica de actualización de IndexedDB, tabla local y backend
                                                    var request = indexedDB.open("ventilado", 5);
                                                    request.onsuccess = function (event) {
                                                        var db = event.target.result;
                                                        ctx._dbConnections.push(db);
            
                                                        var M3r, Kgbrr;
                                                        ctx.actualizarCantEscaneada(
                                                            db,
                                                            oData.Id,
                                                            Number(updatedValue),
                                                            resultadoFormateadoKgbrr,
                                                            resultadoFormateadoM3r
                                                        );
            
                                                        var updatedData = [
                                                            {
                                                                Id: oData.Id,
                                                                CantEscaneada: Number(updatedValue),
                                                                Kgbrr: resultadoFormateadoKgbrr,
                                                                M3r: resultadoFormateadoM3r,
                                                            },
                                                        ];
                                                        ctx.actualizarBackEnd(updatedData);
                                                    };
            
                                                    // Actualizar el modelo local
                                                    var oLocalModel = ctx.getView().getModel();
                                                    var tTableData = oLocalModel.getProperty("/tableData");
                                                    var registro = tTableData.find((item) => item.Id === oData.Id);
            
                                                    if (registro) {
                                                        var cantAnteriorEsc = registro.CantEscaneada;
                                                        registro.CantEscaneada = Number(updatedValue);
                                                        var totalCantidadEsc = oLocalModel.getProperty("/totalCantidadEsc");
                                                        totalCantidadEsc = totalCantidadEsc - cantAnteriorEsc + Number(updatedValue);
            
                                                        M3r = (registro.M3v * Number(updatedValue)) / registro.cantidadAsig;
                                                        Kgbrr = (registro.Kgbrv * Number(updatedValue)) / registro.cantidadAsig;
            
                                                        var resultadoFormateadoM3r = M3r.toFixed(3).padStart(5, " ");
                                                        var resultadoFormateadoKgbrr = Kgbrr.toFixed(2).padStart(5, " ");
            
                                                        oLocalModel.setProperty("/totalCantidadEsc", totalCantidadEsc);
                                                        oLocalModel.setData({ tableData: tTableData });
                                                    } else {
                                                        console.error("Registro no encontrado para actualizar");
                                                    }
            
                                                    localStorage.setItem("Actualizar", true);
                                                    oDialogEdit.close();
                                                },
                                            }),
                                            endButton: new sap.m.Button({
                                                text: "Cancel",
                                                press: function () {
                                                    oDialogEdit.close();
                                                },
                                            }),
                                        });
            
                                        oDialogEdit.open();
                                    } else {
                                        sap.m.MessageToast.show("Contraseña incorrecta. Inténtelo nuevamente.");
                                    }
                                },
                                error: function () {
                                    sap.m.MessageToast.show("Error al validar la contraseña en el servidor.");
                                }
                            });
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: 'Cancelar',
                        press: function () {
                            oDialogPassword.close();
                        }
                    }),
                    afterClose: function () {
                        oDialogPassword.destroy();
                    }
                });
            
                // Abrir el diálogo de contraseña
                oDialogPassword.open();
            },
            

 /*           onEdit: function (oEvent) {
                ctx = this;
                var oModel = new sap.ui.model.odata.v2.ODataModel(
                    "/sap/opu/odata/sap/ZVENTILADO_SRV/",
                    {
                        useBatch: false,
                        defaultBindingMode: "TwoWay",
                        deferredGroups: ["batchGroup1"],
                    }
                );
                oModel.refreshMetadata();
                var oButton = oEvent.getSource();
                var oContext = oButton.getBindingContext();
                var sPath = oContext.getPath();

                // Retrieve the data from the selected row
                var oData = this.getView().getModel().getProperty(sPath);

                // Handle the edit logic here
                var oInput = new sap.m.Input({
                    value: oData.CantEscaneada,
                    type: "Number", // Ensure the input is numeric
                    liveChange: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        // var oSaveButton = sap.ui.getCore().byId("saveButton");
                        // oSaveButton.setEnabled(!isNaN(sValue) && sValue.trim() !== "");
                    },
                });
                var oDialog = new sap.m.Dialog({
                    title: "Cantidad Escaneada realmente",
                    content: [
                        // Add fields to edit the item here
                        oInput,
                    ],
                    beginButton: new sap.m.Button({
                        text: "Save",
                        press: function () {
                            var updatedValue = oInput.getValue();

                            //actualizar base local
                            var request = indexedDB.open("ventilado", 5);
                            var Kgbrr;
                            var M3r;
                            request.onsuccess = function (event) {
                                var db = event.target.result;
                                ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
                                // // Llamar a la función para actualizar el campo 'CantEscaneada' y Kgbrr y M3r

                                ctx.actualizarCantEscaneada(
                                    db,
                                    oData.Id,
                                    Number(updatedValue),
                                    resultadoFormateadoKgbrr,
                                    resultadoFormateadoM3r
                                );
                                // obtener el valor actualizado

                                // Salvar cambios y cerrar
                                var updatedData = [
                                    {
                                        Id: oData.Id,
                                        CantEscaneada: Number(updatedValue),
                                        Kgbrr: resultadoFormateadoKgbrr,
                                        M3r: resultadoFormateadoM3r,
                                    },
                                ];
                                ctx.actualizarBackEnd(updatedData);
                            };

                            // Obtener el modelo local
                            var oLocalModel = ctx.getView().getModel();

                            // Obtener los datos de la tabla desde el modelo
                            var tTableData = oLocalModel.getProperty("/tableData");

                            // Encontrar el registro específico utilizando el Id
                            var registro = tTableData.find((item) => item.Id === oData.Id);

                            // Asegurarse de que el registro exista
                            if (registro) {
                                // Actualizar el campo CantEscaneada del registro con el nuevo valor
                                var cantAnteriorEsc = registro.CantEscaneada;
                                registro.CantEscaneada = Number(updatedValue);
                                // Actualizar el modelo con los datos modificados
                                var totalCantidadEsc =
                                    oLocalModel.getProperty("/totalCantidadEsc");
                                totalCantidadEsc =
                                    totalCantidadEsc - cantAnteriorEsc + Number(updatedValue);

                                M3r =
                                    (registro.M3v * Number(updatedValue)) / registro.cantidadAsig;
                                Kgbrr =
                                    (registro.Kgbrv * Number(updatedValue)) /
                                    registro.cantidadAsig;

                                // Redondear a 1 decimal
                                // resultadoM3r = Math.round(resultadoM3r * 10) / 100;

                                // Formatear el resultado para que tenga longitud 5
                                var resultadoFormateadoM3r = M3r.toFixed(3).padStart(5, " ");
                                var resultadoFormateadoKgbrr = Kgbrr.toFixed(2).padStart(
                                    5,
                                    " "
                                );

                                oLocalModel.setProperty("/totalCantidadEsc", totalCantidadEsc);
                                oLocalModel.setData({ tableData: tTableData });
                                // Actualizar la propiedad totalCantidadEsc
                            } else {
                                console.error("Registro no encontrado para actualizar");
                            }

                            localStorage.setItem("Actualizar", true);
                            oDialog.close();
                        },
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            oDialog.close();
                        },
                    }),
                });
                oDialog.open();
            },*/
            onDelete: function (oEvent) {
                var ctx = this;
                var oButton = oEvent.getSource();
                var oContext = oButton.getBindingContext();
                var sPath = oContext.getPath();
                // Obtener los datos de la fila
                var oData = this.getView().getModel().getProperty(sPath);
            
                // Crear un diálogo para solicitar la contraseña de administrador
                var oDialog = new sap.m.Dialog({
                    title: 'Contraseña de Administrador',
                    type: 'Message',
                    content: [
                        new sap.m.Label({ text: 'Por favor ingrese la contraseña de administrador:' }),
                        new sap.m.Input({ type: 'Password', id: 'adminPassword' })
                    ],
                    beginButton: new sap.m.Button({
                        text: 'Aceptar',
                        press: function () {
                            var sPassword = sap.ui.getCore().byId('adminPassword').getValue();
            
                            // Llamada OData para validar la contraseña
                            var oModel = ctx.getView().getModel(); // Suponiendo que tu modelo OData ya está configurado
                            var oModelo = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
                            var sServiceUrl = "/sap/opu/odata/sap/ZVENTILADO_SRV/"; // URL del servicio OData que valida la contraseña
                            oModelo.read("/ZCONFIGVENTILADOSet", {
                                urlParameters: {
                                    "Password": sPassword // El nombre del parámetro debe coincidir con el del backend
                                },
                                success: function (oResponse) {
                                    if (oResponse.results[0].Passadm1==sPassword) { // Suponiendo que el backend devuelve un campo IsValid
                                        oDialog.close();
            
                                        // Confirmar el borrado
                                        sap.m.MessageBox.confirm("Esta seguro que quiere borrar este ítem?", {
                                            onClose: function (oAction) {
                                                if (oAction === sap.m.MessageBox.Action.OK) {
                                                    // Actualizar los campos de la fila y enviar al backend
                                                    var updatedData = [
                                                        {
                                                            Id: oData.Id,
                                                            CantEscaneada: 0,
                                                            AdicChar1: "",
                                                            AdicChar2: "",
                                                            AdicDec1: "",
                                                            AdicDec2: "",
                                                            Preparador: "",
                                                            Estado: "INICIAL",
                                                        },
                                                    ];
                                                    ctx.actualizarBackEnd(updatedData);
            
                                                    // Abrir la base de datos IndexedDB y actualizar
                                                    var request = indexedDB.open("ventilado", 5);
                                                    request.onsuccess = function (event) {
                                                        var db = event.target.result;
                                                        ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
                                                        ctx.actualizarBorrado(db, oData.Id);
                                                    };
                                                }
                                            }.bind(ctx),
                                        });
                                    } else {
                                        sap.m.MessageToast.show("Contrasena incorrecta. Intentelo nuevamente.");
                                    }
                                },
                                error: function () {
                                    sap.m.MessageToast.show("Error al validar la contrasena en el servidor.");
                                }
                            });
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: 'Cancelar',
                        press: function () {
                            oDialog.close();
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
                });
            
                // Abrir el diálogo
                oDialog.open();
            },
            actualizarBackEnd: function (updatedData) {
                var oModel = new sap.ui.model.odata.v2.ODataModel(
                    "/sap/opu/odata/sap/ZVENTILADO_SRV/",
                    {
                        useBatch: false,
                        defaultBindingMode: "TwoWay",
                        deferredGroups: ["batchGroup1"],
                    }
                );
                // Definir la función updateRecord
                var updateRecord = function (oEntry, onSuccess, onError) {
                    // La ruta debe estar construida correctamente según el modelo y los datos
                    var sEntitySet = "/ventiladoSet";
                    var sPath = sEntitySet + "(" + oEntry.Id + ")"; // Ajusta esta ruta según tu modelo OData
                    oModel.update(sPath, oEntry, {
                        success: function () {
                            MessageToast.show(
                                "Registro " + oEntry.Id + " actualizado con éxito."
                            );
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show(
                                "Error al actualizar el registro " + oEntry.Dni
                            );
                            console.error(oError);
                            if (onError) onError(oError);
                        },
                    });
                };

                // Función para actualizar los registros secuencialmente
                var updateRecords = function (aData) {
                    var updateNext = function (index) {
                        if (index < aData.length) {
                            updateRecord(aData[index], function () {
                                updateNext(index + 1);
                            });
                        } else {
                            MessageToast.show(
                                "Todos los registros se han actualizado con éxito."
                            );
                        }
                    }.bind(this);
                    updateNext(0);
                };
                updateRecords(updatedData);
            },

            actualizarCantEscaneada: function (
                db,
                id,
                nuevaCantidadEscaneada,
                Kgbrr,
                M3r
            ) {
                var transaction = db.transaction(["ventilado"], "readwrite");
                var objectStore = transaction.objectStore("ventilado");

                var request = objectStore.get(id);
                request.onsuccess = function (event) {
                    var data = event.target.result;
                    if (data) {
                        data.CantEscaneada = nuevaCantidadEscaneada;

                        var updateRequest = objectStore.put(data);
                        updateRequest.onsuccess = function () {
                            console.log(
                                "Cantidad Escaneada actualizada con éxito en IndexedDB."
                            );
                        };
                        updateRequest.onerror = function (event) {
                            console.error(
                                "Error al actualizar Cantidad Escaneada en IndexedDB:",
                                event
                            );
                        };
                    }
                };
                request.onerror = function (event) {
                    console.error("Error al obtener el registro de IndexedDB:", event);
                };
            },
            actualizarBorrado: function (db, id) {
                ctx = this;
                var transaction = db.transaction(["ventilado"], "readwrite");
                var objectStore = transaction.objectStore("ventilado");

                var request = objectStore.get(id);
                request.onsuccess = function (event) {
                    var data = event.target.result;
                    if (data) {
                        data.CantEscaneada = 0;
                        data.Estado = "INICIAL";
                        data.AdicChar1 = "";
                        data.AdicChar2 = "";
                        data.AdicDec1 = "";
                        data.AdicDec1 = "";
                        data.Preparador = "";
                        var updateRequest = objectStore.put(data);

                        updateRequest.onsuccess = function () {
                            console.log("Datos actualizados con éxito en IndexedDB.");
                            var oLocalModel = ctx.getView().getModel();
                            var tableData = oLocalModel.getProperty("/tableData");
                            tableData = tableData.filter(function (registro) {
                                return registro.Id !== id;
                            });

                            oLocalModel.setProperty("/tableData", tableData);
                        };
                        updateRequest.onerror = function (event) {
                            console.error("Error al actualizar en IndexedDB:", event);
                        };
                    }
                };
                request.onerror = function (event) {
                    console.error("Error al obtener el registro de IndexedDB:", event);
                };
            },
               
            onExit: function () {
                this._cerrarConexiones(); // Cerrar todas las conexiones abiertas al salir del controlador
            },

            _cerrarConexiones: function () {
                this._dbConnections.forEach((db) => {
                    db.close();
                });
                this._dbConnections = [];
            },

            _handleUnload: function () {
                this._cerrarConexiones(); // Cerrar todas las conexiones abiertas al descargar o cambiar de página
            },
            onNavToScan: function() {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("Scan"); 
            }
        });
    }
);
