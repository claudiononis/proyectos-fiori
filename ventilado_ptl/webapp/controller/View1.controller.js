sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",  // Importar BusyIndicator
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",

], function (UIComponent, Controller, MessageToast, MessageBox, BusyIndicator, ODataModel, Filter, FilterOperator, Fragment) {
    "use strict";
    var ctx;
    var sPreparador;
    var sTransporte;

    var sPtoPlanif;
    var sPuesto;
    var sFecha;
    let todasLasRutasAsignadas = false;

    return Controller.extend("ventilado.ventilado.controller.View1", {

        onInit: function () {
            // Cargar límites desde localStorage o usar por defecto
            const oView = this.getView();
            const limite1 = localStorage.getItem("limite1");
            const limite2 = localStorage.getItem("limite2");
            const usarRoll = localStorage.getItem("usarRoll");

            oView.byId("limite1").setValue(limite1 !== null ? limite1 : "8");
            oView.byId("limite2").setValue(limite2 !== null ? limite2 : "12");
            oView.byId("usarRoll").setSelected(usarRoll === "true");



            this._dbConnections = []; // Array para almacenar conexiones abiertas
            var oDate = new Date();
            var oFormattedDate = this._formatDate(oDate);
            var oFechaInput = this.byId("fecha"); // Asegúrate de que el ID del campo de entrada sea "fechaInput"

            if (oFechaInput) {
                oFechaInput.setValue(oFormattedDate);
            }

            sFecha = sessionStorage.getItem("fecha") || new Date().toISOString().slice(0, 10);

            // Obtener el router y añadir la función para el evento routeMatched
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteView1").attachPatternMatched(this.onRouteMatched, this);

            const oConfigModel = new sap.ui.model.json.JSONModel({
                listaDisplaysCol1: [],
                listaDisplaysCol2: [],
                displaysDesactivados: []
            });
            this._actualizarIndicadorDisplaysMarcados();
            this.getView().setModel(oConfigModel, "configModel");
        },


        onRouteMatched: function (oEvent) {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            var aInputs = [
                this.byId("puesto"),
                this.byId("reparto"),
                this.byId("pto_planif"),
                this.byId("Usuario")
            ];

            var bValid = true;

            // Validar todos los campos requeridos
            aInputs.forEach(function (oInput) {
                if (!oInput.getValue()) {
                    // oInput.setValueState("Error");
                    bValid = false;
                } else {
                    oInput.setValueState("None");
                }
            });
            if (localStorage.getItem('Actualizar') == 'true' && bValid) {
                localStorage.setItem('Actualizar', false)
                this.onBuscarPress();
            }
            this.verificarAsignacionDeDisplays();
             this._actualizarIndicadorDisplaysMarcados();

        },

        _formatDate: function (date) {
            var day = String(date.getDate()).padStart(2, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0'); // Enero es 0
            var year = date.getFullYear();
            return day + '/' + month + '/' + year;
        },

        onScanPress: function () {
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Scan");
        },
        onDesconsolidadoPress: function () {
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Desconsolidado");
        },
        onCierrePress: function () {
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Cierre");
        },
        onLogPress: function () {
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Log");
        },
        onAvancePPress: function () {
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // oRouter.navTo("Avance");
            oRouter.navTo("Avanceporci");
        },
        onAvanceRutaPress: function () {
            this.onExit();
            const oView = this.getView();
            const limite1 = parseInt(oView.byId("limite1").getValue(), 10);
            const limite2 = parseInt(oView.byId("limite2").getValue(), 10);
            const usarRoll = oView.byId("usarRoll").getSelected();
            localStorage.setItem("limite1", isNaN(limite1) ? "8" : limite1);
            localStorage.setItem("limite2", isNaN(limite2) ? "12" : limite2);
            localStorage.setItem("usarRoll", usarRoll ? "true" : "false");
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Avance2");
        },

        /*  Cuando se pulsa "Buscar datos" se ejecuta esta funcion
            Se busca el modelo y se llama a la "Function import" del back end para buscar los datos  del transporte
            a ventilar.           
        */
        onBuscarPress: function () {
            this.closeAllDbConnections();
            // Guardar los valores en sessionStorage
            sTransporte = this.getView().byId("reparto").getValue().padStart(10, '0');
            sPtoPlanif = this.getView().byId("pto_planif").getValue().padStart(4, '0');
            sPuesto = this.getView().byId("puesto").getValue();
            sPreparador = this.getView().byId("Usuario").getValue();


            // Guardar datos
            localStorage.setItem('sPuesto', sPuesto);
            localStorage.setItem('sReparto', sTransporte);
            localStorage.setItem('sPtoPlanif', sPtoPlanif);
            localStorage.setItem('sPreparador', sPreparador);
            localStorage.setItem('Actualizar', false);

            var aInputs = [
                this.byId("puesto"),
                this.byId("reparto"),
                this.byId("pto_planif"),
                this.byId("Usuario")
            ];

            var bValid = true;

            // Validar todos los campos requeridos
            aInputs.forEach(function (oInput) {
                if (!oInput.getValue()) {
                    oInput.setValueState("Error");
                    bValid = false;
                } else {
                    oInput.setValueState("None");
                }
            });

            if (bValid) {
                // Mostrar 
                this.onExit();
                BusyIndicator.show(0);
                // Todos los campos requeridos están llenos, buscar datos
                this.buscarDatos();
            } else {
                MessageBox.error("ERROR. Por favor, complete todos los campos obligatorios.", {
                    title: "Error ",
                    styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                    onClose: function () {
                        console.log("Mensaje de error personalizado cerrado.");
                    }
                });

            }
        },

        buscarDatos: function () {
            var ctx = this;
            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {
                useBatch: false,
                defaultBindingMode: "TwoWay",
                deferredGroups: ["batchGroup1"]
            });
            oModel.refreshMetadata();
            sTransporte = ctx.getView().byId("reparto").getValue().padStart(10, '0');
            var sOperador = ctx.getView().byId("Usuario").getValue();
            var sPuesto = ctx.getView().byId("puesto").getValue();
            var sPtoPlanificacion = ctx.getView().byId("pto_planif").getValue();

            //actualizo datos globales
            var oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            if (oGlobalModel) {
                oGlobalModel.setProperty("/puesto", sPuesto);
                oGlobalModel.setProperty("/reparto", sTransporte);
            }
            oModel.callFunction("/GenerarTransporte", {  // se llama a la function import
                method: "GET",
                urlParameters: {
                    transporte: sTransporte, // pasa los parametros strings
                    pto_planificacion: sPtoPlanificacion
                },
                success: function (oData) {
                    // Manejar éxito
                    MessageToast.show("Se cargaron los datos para el ventilado");
                    // Procesar la respuesta aquí
                    var transporte = oData.Transporte;
                    transporte = transporte.padStart(10, '0');
                    var entrega = oData.Entrega;
                    var pto_planificacion = oData.Pto_planificacion;
                    var estado = oData.Ean;
                    // Aquí se puede  trabajar con los datos recibidos
                    console.log("Transporte: ", transporte);
                    console.log("Pto Entrega: ", pto_planificacion);
                    console.log("Entrega: ", entrega);
                    console.log("Estado: ", estado);
                    // leer datos del Transporte a  ventilar
                    // y los guarda en la base local              
                    ctx._fetchAndStoreOData();

                },
                error: function (oError) {
                    // Manejar error
                    var sErrorMessage = "";
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        sErrorMessage = oErrorResponse.error.message.value;
                    } catch (e) {
                        sErrorMessage = "Error desconocido,  revise conexion de Internet y VPN";
                    }
                    BusyIndicator.hide();  // Ocultar 
                    MessageToast.show(sErrorMessage);
                },
                timeout: 10000 // Establecer un tiempo de espera de 10 segundos
            });


        },




        _fetchAndStoreOData: function () {
            var ctx = this;
            var request = indexedDB.deleteDatabase("ventilado");

            request.onerror = function (event) {
                console.error("Error al borrar la base de datos:", event.target.errorCode);
            };

            request.onblocked = function (event) {
                console.warn("La base de datos no se pudo borrar porque otra conexión aún está abierta.");
                BusyIndicator.hide();  // Ocultar 
            };

            request.onsuccess = function (event) {
                console.log("Base de datos borrada con éxito.");

                // Después de borrar la base de datos, abrirla de nuevo
                var openRequest = indexedDB.open("ventilado", 5);

                openRequest.onerror = function (event) {
                    console.error("Error al abrir la base de datos:", event.target.errorCode);
                    BusyIndicator.hide();  // Ocultar 

                };

                openRequest.onupgradeneeded = function (event) {
                    var db = event.target.result;
                    var objectStore = db.createObjectStore("ventilado", { keyPath: "Id" });

                    objectStore.createIndex("Ean", "Ean", { unique: false });
                    objectStore.createIndex("Fecha", "Fecha", { unique: false });
                    objectStore.createIndex("Transporte", "Transporte", { unique: false });
                    objectStore.createIndex("Entrega", "Entrega", { unique: false });
                    objectStore.createIndex("NombreDestinatario", "NombreDestinatario", { unique: false });
                    objectStore.createIndex("Calle", "Calle", { unique: false });
                    objectStore.createIndex("Lugar_destinatario", "Lugar_destinatario", { unique: false });
                    objectStore.createIndex("CodigoInterno", "CodigoInterno", { unique: false });
                    objectStore.createIndex("Descricion", "Descricion", { unique: false });
                    objectStore.createIndex("CantidadEntrega", "CantidadEntrega", { unique: false });
                    objectStore.createIndex("LugarPDisp", "LugarPDisp", { unique: false });
                    objectStore.createIndex("Preparador", "Preparador", { unique: false });
                    objectStore.createIndex("Estado", "Estado", { unique: false });
                    objectStore.createIndex("Cubre", "Cubre", { unique: false });
                    objectStore.createIndex("Pa", "Pa", { unique: false });
                    objectStore.createIndex("AdicChar1", "AdicChar1", { unique: false });


                };

                openRequest.onsuccess = function (event) {
                    ctx.db = event.target.result;
                    ctx._dbConnections.push(ctx.db); // Guardar referencia a la conexión abierta
                    console.log("Base de datos abierta con éxito.");

                    var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
                    //Se leen los datos del backend filtrando por el numero de transporte
                    // Configurar los filtros
                    var aFilters = [];
                    aFilters.push(new Filter("Transporte", FilterOperator.EQ, sTransporte));
                    oModel.read("/ventiladoSet", {
                        filters: aFilters,
                        success: function (oData) {
                            var transaction = ctx.db.transaction(["ventilado"], "readwrite");
                            var objectStore = transaction.objectStore("ventilado");

                            // Verificar si oData.results es un array
                            if (Array.isArray(oData.results)) {
                                oData.results.sort(function (a, b) {
                                    if (a.CodigoInterno === b.CodigoInterno) {
                                        // Convertir LugarPDisp a número para una correcta comparación
                                        return parseInt(a.LugarPDisp, 10) - parseInt(b.LugarPDisp, 10);
                                    }
                                    return a.CodigoInterno.localeCompare(b.CodigoInterno);
                                });
                                // Si es un array, iterar sobre cada item
                                oData.results.forEach(function (item) {
                                    // Completando el campo "Transporte" con ceros a la izquierda si es necesario
                                    item.Transporte = (item.Transporte || '').padStart(10, '0');

                                    // Guardar el item en el object store, primero elimina de LugarPDisp los ceros a la izquierda
                                    var lugarPDisp = item.LugarPDisp;

                                    // Eliminar ceros a la izquierda usando replace
                                    lugarPDisp = lugarPDisp.replace(/^0+/, '');

                                    // Asignar de nuevo el valor sin ceros a la izquierda
                                    item.LugarPDisp = lugarPDisp;
                                    objectStore.put(item);
                                });
                            } else {
                                // Si no es un array, manejar el único item directamente
                                var item = oData.results;
                                // Completando el campo "Transporte" con ceros a la izquierda si es necesario
                                item.Transporte = (item.Transporte || '').padStart(10, '0');
                                // Guardar el item en el object store
                                objectStore.put(item);
                            }
                            BusyIndicator.hide();  // Ocultar 
                            ctx.verificarAsignacionDeDisplays();
                            console.log("Datos copiados con éxito.");
                            /* ctx.getView().byId("btScan").setEnabled(true);
                            ctx.getView().byId("btLog").setEnabled(true);
                            ctx.getView().byId("btAvance").setEnabled(true);
                            ctx.getView().byId("btCierre").setEnabled(true);
                            ctx.getView().byId("btDesconsolidado").setEnabled(true);
                            ctx.getView().byId("btAvanceRuta").setEnabled(true); */

                        },
                        error: function (oError) {
                            console.error("Error al leer datos del servicio OData:", oError);
                            BusyIndicator.hide();  // Ocultar BusyIndicator en caso de error
                        }
                    });
                };
            };
        },
        /******   Cuando se sale de la pagina se cierran todas las conexiones a la base local */
        onExit: function () {
            this.closeAllDbConnections(); // Cerrar todas las conexiones cuando se cierre el controlador
        },

        closeAllDbConnections: function () {
            this._dbConnections.forEach(db => {
                db.close();
            });
            this._dbConnections = []; // Resetear el array de conexiones
        },
        _handleUnload: function () {
            this.closeAllDbConnections();
        },

        onConfigurarDisplaysDañados: function () {
            var oView = this.getView();
            ctx = this;
            // Check if the fragment is already loaded
            if (!this.byId("checkboxDialog")) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ventilado.ventilado.view.CheckBoxDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    const aItems = [];
                    for (let i = 1; i <= 30; i++) {
                        aItems.push({
      text: "dsp-" + i.toString().padStart(3, "0"),
      selected: false // 👈 aseguramos que el valor inicial es false
    });
                    }

                    const oModel = new sap.ui.model.json.JSONModel({
                        leftColumn: aItems.slice(0, 15),
                        rightColumn: aItems.slice(15)
                    });
                    oView.setModel(oModel, "checkboxes");
                    // this.getView.Entrega
                    oDialog.open();
                    ctx._preseleccionarDisplaysMarcados(oDialog);
                });
            } else {
                const aItems = [];
                for (let i = 1; i <= 30; i++) {
                    aItems.push({
      text: "dsp-" + i.toString().padStart(3, "0"),
      selected: false // 👈 aseguramos que el valor inicial es false
    });
                }

                const oModel = new sap.ui.model.json.JSONModel({
                    leftColumn: aItems.slice(0, 15),
                    rightColumn: aItems.slice(15)
                });
                oView.setModel(oModel, "checkboxes");
                // this.getView.Entrega
                this.byId("checkboxDialog").open();
                ctx._preseleccionarDisplaysMarcados(this.byId("checkboxDialog"));

            }
        },


        /**
         * Handler for the close event of the checkbox dialog.
         * Closes the checkbox dialog.
         */
        onCloseDialog: function () {
            this.byId("checkboxDialog").close();
        },
        onAceptarDisplays: function () {
            const oDialog = this.byId("checkboxDialog");
            const oHBox = oDialog.getContent()[0];
            const seleccionados = [];

          oHBox.getItems().forEach(oVBox => {
  oVBox.getItems().forEach(oHBoxInner => {
    if (oHBoxInner.isA("sap.m.HBox")) {
      oHBoxInner.getItems().forEach(oControl => {
        if (oControl.isA("sap.m.CheckBox") && oControl.getSelected()) {
          seleccionados.push(oControl.getText());
        }
      });
    }
  });
});

            localStorage.setItem("displaysDesactivados", JSON.stringify(seleccionados));
            MessageToast.show("Displays desactivados: " + seleccionados.join(", "));
            oDialog.close();
             this._actualizarIndicadorDisplaysMarcados();
        }        ,
        verificarAsignacionDeDisplays: function () {
            const ctx = this;
            const request = indexedDB.open("ventilado", 5);

            request.onsuccess = function (event) {
                const db = event.target.result;
                const transaction = db.transaction(["ventilado"], "readonly");
                const objectStore = transaction.objectStore("ventilado");

                const rutasConDisplay = new Set();
                const todasLasRutas = new Set();

                const cursorRequest = objectStore.openCursor();

                cursorRequest.onsuccess = function (e) {
                    const cursor = e.target.result;
                    if (cursor) {
                        const registro = cursor.value;

                        // Ruta única
                        const ruta = registro.LugarPDisp;
                        todasLasRutas.add(ruta);

                        if (registro.Prodr && registro.Prodr.trim() !== "") {
                            rutasConDisplay.add(ruta);
                        }

                        cursor.continue();
                    } else {
                        // Al terminar de recorrer
                        const todasAsignadas = [...todasLasRutas].every(ruta =>
                            rutasConDisplay.has(ruta)
                        );

                        if (todasAsignadas) {
                            ctx._setBotones(true);  // Habilitar todos
                        } else {
                            ctx._setBotones(false); // Solo avance por ruta
                        }
                    }
                };
            };
        },
        _setBotones: function (todoHabilitado) {
            const oView = this.getView();

            oView.byId("btScan").setEnabled(todoHabilitado);
            oView.byId("btLog").setEnabled(todoHabilitado);
            oView.byId("btAvance").setEnabled(todoHabilitado);
            oView.byId("btDesconsolidado").setEnabled(todoHabilitado);
            oView.byId("btCierre").setEnabled(todoHabilitado);

            // Avance por Ruta siempre habilitado
            oView.byId("btAvanceRuta").setEnabled(true);
        },


        onToggleRollContainer: function (oEvent) {
            const bSelected = oEvent.getParameter("selected");
            const oView = this.getView();
            const oInputLim1 = oView.byId("limite1");
            const oInputLim2 = oView.byId("limite2");

            if (!this._lastLimite2Value) {
                this._lastLimite2Value = oInputLim2.getValue();
            }

            if (!bSelected) {
                // Desactiva Roll Container
                const valLim1 = oInputLim1.getValue();
                oInputLim2.setValue(valLim1);
                oInputLim2.setEnabled(false);
            } else {
                // Activa Roll Container
                oInputLim2.setEnabled(true);
                oInputLim2.setValue(this._lastLimite2Value || "12");
            }
        },
        _actualizarIndicadorDisplaysMarcados: function () {
            const lista = JSON.parse(localStorage.getItem("displaysDesactivados") || "[]");
            const hayMarcados = lista.length > 0;
            this.byId("lblDisplaysMarcados").setVisible(hayMarcados);
        },
       /*  _preseleccionarDisplaysMarcados: function (oDialog) {
            // Recuperar selección previa
            const seleccionados = JSON.parse(localStorage.getItem("displaysDesactivados") || "[]");

            // El contenido principal es un HBox
            const oHBox = oDialog.getContent()[0];
            if (!oHBox) return;

            // Recorremos ambos VBox
            oHBox.getItems().forEach(oVBox => {
                oVBox.getItems().forEach(oControl => {
                    if (oControl.isA("sap.m.CheckBox")) {
                        const sTexto = oControl.getText();
                        oControl.setSelected(seleccionados.includes(sTexto));
                    }
                });
            });
        }, */

_preseleccionarDisplaysMarcados: function (oDialog) {
  // Recuperar selección previa
  const seleccionados = JSON.parse(localStorage.getItem("displaysDesactivados") || "[]");

  // El contenido principal es un HBox
  const oHBox = oDialog.getContent()[0];
  if (!oHBox) return;

  // Recorremos ambos VBox (columnas)
  oHBox.getItems().forEach(oVBox => {
    // Dentro de cada VBox hay varios HBox (CheckBox + Icon)
    oVBox.getItems().forEach(oHBoxItem => {
      if (oHBoxItem.isA("sap.m.HBox")) {
        oHBoxItem.getItems().forEach(oControl => {
          if (oControl.isA("sap.m.CheckBox")) {
            const sTexto = oControl.getText();
            oControl.setSelected(seleccionados.includes(sTexto));
          }
        });
      }
    });
  });
},





    });
});