sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",  // Importar BusyIndicator
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",

], function (UIComponent,Controller, MessageToast, MessageBox,BusyIndicator,ODataModel,Filter,FilterOperator) {
    "use strict";
    var ctx;
    var sPreparador;
    var sTransporte;
  
    var sPtoPlanif ;
    var sPuesto;
    var sFecha; 
 
    return Controller.extend("ventilado.ventilado.controller.View1", {
       
        onInit: function () {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            var oDate = new Date();
            var oFormattedDate = this._formatDate(oDate);
            var oFechaInput = this.byId("fecha"); // Asegúrate de que el ID del campo de entrada sea "fechaInput"
            if (oFechaInput) {
                oFechaInput.setValue(oFormattedDate);
            }

           /*  sPuesto = sessionStorage.getItem("puesto") || "";
             sReparto = sessionStorage.getItem("reparto") || "";
             sPtoPlanif = sessionStorage.getItem("pto_planif") || "";
             sUsuario = sessionStorage.getItem("usuario") || "";*/
             sFecha = sessionStorage.getItem("fecha") || new Date().toISOString().slice(0, 10);

            
            // Obtener el router y añadir la función para el evento routeMatched
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteView1").attachPatternMatched(this.onRouteMatched, this);
        },
        onRouteMatched: function (oEvent) {
            // Código que deseas ejecutar cada vez que la vista se muestra
            console.log("aca");
        },
        _formatDate: function (date) {
            var day = String(date.getDate()).padStart(2, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0'); // Enero es 0
            var year = date.getFullYear();
            return day + '/' + month + '/' + year;
        },
         
        onScanPress: function () {      
               const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
               oRouter.navTo("Scan");                 
        },
        onDesconsolidadoPress:function(){
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Desconsolidado"); 
        },   
        onCierrePress:function(){
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Cierre"); 
        },        

        /*  Cuando se pulsa "Buscar datos" se ejecuta esta funcion
            Se busca el modelo y se llama a la "Function import" del back end para buscar los datos  del transporte
            a ventilar.           
        */
        onBuscarPress:function(){
            // Guardar los valores en sessionStorage
            sTransporte = this.getView().byId("reparto").getValue().padStart(10, '0');
            sPtoPlanif = this.getView().byId("pto_planif").getValue().padStart(4, '0');
            sPuesto = this.getView().byId("puesto").getValue();
            sPreparador = this.getView().byId("Usuario").getValue();


          /*  var sOperador = this.getView().byId("Usuario").getValue();
            var sPuesto = this.getView().byId("puesto").getValue();
            sessionStorage.setItem("puesto", sPuesto);
            sessionStorage.setItem("reparto", sTransporte);
            sessionStorage.setItem("usuario", sOperador);
            sessionStorage.setItem("fecha", sFecha);*/

            // Guardar datos
            localStorage.setItem('sPuesto', sPuesto);
            localStorage.setItem('sReparto', sTransporte);
            localStorage.setItem('sPtoPlanif', sPtoPlanif);
            localStorage.setItem('sPreparador', sPreparador);

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

        buscarDatos:function(){
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
            var sPtoPlanificacion =  ctx.getView().byId("pto_planif").getValue();

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
                        sErrorMessage = "Error desconocido";
                    }
                    MessageToast.show( sErrorMessage);
                                }
              });


        },
        onLogPress:function(){
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Log");  
        },
        onAvancePPress:function(){
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Avance");  
        },

//
/////////   Funciones para base offline
  /*      _initDatabase: function () {
        
            //Se crea la base local con todos sus campos para el transporte que se ventilara
            //Ver de hacer un function impor y traer labase, luego volcarla aca
            var request = indexedDB.open("ventilado", 4);

            request.onerror = function (event) {
                console.error("Error al abrir la base de datos:", event.target.errorCode);
            };

            request.onupgradeneeded = function (event) {
                var db = event.target.result;
            // Si el objectStore ya existe, entonces solo actualizar los índices que faltan
            if (!db.objectStoreNames.contains("ventilado")) {
                var objectStore = db.createObjectStore("ventilado", { keyPath: "Id" });
            } else {
                var objectStore = event.target.transaction.objectStore("ventilado");
            }

            if (!objectStore.indexNames.contains("Ean")) {
                objectStore.createIndex("Ean", "Ean", { unique: false });
            }
            if (!objectStore.indexNames.contains("Fecha")) {
                objectStore.createIndex("Fecha", "Fecha", { unique: false });
            }
            if (!objectStore.indexNames.contains("Transporte")) {
                objectStore.createIndex("Transporte", "Transporte", { unique: false });
            }
            if (!objectStore.indexNames.contains("Entrega")) {
                objectStore.createIndex("Entrega", "Entrega", { unique: false });
            }
            if (!objectStore.indexNames.contains("NombreDestinatario")) {
                objectStore.createIndex("NombreDestinatario", "NombreDestinatario", { unique: false });
            }
            if (!objectStore.indexNames.contains("Nonbre_destinatario")) {
                objectStore.createIndex("Nonbre_destinatario", "Nonbre_destinatario", { unique: false });
            }
            if (!objectStore.indexNames.contains("Calle")) {
                objectStore.createIndex("Calle", "Calle", { unique: false });
            }
            if (!objectStore.indexNames.contains("Lugar_destinatario")) {
                objectStore.createIndex("Lugar_destinatario", "Lugar_destinatario", { unique: false });
            }
            if (!objectStore.indexNames.contains("Codigo_interno")) {
                objectStore.createIndex("CodigoInterno", "CodigoInterno", { unique: false });
            }
            if (!objectStore.indexNames.contains("Descricion")) {
                objectStore.createIndex("Descricion", "Descricion", { unique: false });
            }
            if (!objectStore.indexNames.contains("Cantidad_entrega")) {
                objectStore.createIndex("Cantidad_entrega", "Cantidad_entrega", { unique: false });
            }
            if (!objectStore.indexNames.contains("LugarPDisp")) {
                objectStore.createIndex("LugarPDisp", "LugarPDisp", { unique: false });
            }
            if (!objectStore.indexNames.contains("Cant_escaneada")) {
                objectStore.createIndex("Cant_escaneada", "Cant_escaneada", { unique: false });
            }
            if (!objectStore.indexNames.contains("Preparador")) {
                objectStore.createIndex("Preparador", "Preparador", { unique: false });
            }
            if (!objectStore.indexNames.contains("Estado")) {
                objectStore.createIndex("Estado", "Estado", { unique: false });
            }

            console.log("Almacén de objetos e índices creados con éxito.");
            
            };

            request.onsuccess = function (event) {
                this.db = event.target.result;
                console.log("Base de datos abierta con éxito.");
                this._fetchAndStoreOData(); //Luego de abrir la base se leen y guardan los datos
            }.bind(this);
        },*/

        _fetchAndStoreOData: function () {
            var ctx = this;
            var request = indexedDB.deleteDatabase("ventilado");
        
            request.onerror = function (event) {
                console.error("Error al borrar la base de datos:", event.target.errorCode);
            };
        
            request.onblocked = function(event) {
                console.warn("La base de datos no se pudo borrar porque otra conexión aún está abierta.");
            };
        
            request.onsuccess = function (event) {
                console.log("Base de datos borrada con éxito.");
        
                // Después de borrar la base de datos, abrirla de nuevo
                var openRequest = indexedDB.open("ventilado", 5);
        
                openRequest.onerror = function (event) {
                    console.error("Error al abrir la base de datos:", event.target.errorCode);
                    
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
                                // Si es un array, iterar sobre cada item
                                oData.results.forEach(function (item) {
                                    // Completando el campo "Transporte" con ceros a la izquierda si es necesario
                                    item.Transporte = (item.Transporte || '').padStart(10, '0');
                                    // Guardar el item en el object store
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
                            console.log("Datos copiados con éxito.");
                            ctx.getView().byId("btScan").setEnabled(true);
                            ctx.getView().byId("btLog").setEnabled(true);
                            ctx.getView().byId("btAvance").setEnabled(true);
                            ctx.getView().byId("btCierre").setEnabled(true);
                            ctx.getView().byId("btDesconsolidado").setEnabled(true);
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
        }
   
    });
});