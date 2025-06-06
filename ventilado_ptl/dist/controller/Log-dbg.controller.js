sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",

    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",

], function (Controller, MessageToast, JSONModel,ODataModel,Filter,FilterOperator,MessageBox) {
    "use strict";
    var ctx= this;  // Variable eglobal en el controlador para guardar el contexto
    var sPuesto ;
    var sUsuario;
    var sReparto;
    var sPtoPlanif; 

   
    return Controller.extend("ventilado.ventilado.controller.Log", {

        onInit: async function () {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            // Obtener el router y attachRouteMatched
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("Log").attachMatched(this.onRouteMatched, this);

            // Manejar eventos de navegación
            window.addEventListener('beforeunload', this._handleUnload.bind(this));
            window.addEventListener('popstate', this._handleUnload.bind(this));

            // Ejecutar acciones iniciales
            await this.ejecutarAcciones();
        },

        onRouteMatched: function () {
            // Ejecutar acciones cada vez que la ruta es navegada
            this.ejecutarAcciones();
        },

        ejecutarAcciones: async function () {

            // Lerr datos locales
            sPuesto=localStorage.getItem('sPuesto');
            sReparto = localStorage.getItem('sReparto');
            sPtoPlanif = localStorage.getItem('sPtoPlanif');
            sUsuario = localStorage.getItem('sPreparador');

            await this.obtenerYProcesarDatos();
            // Ordenar datosD por IdScan
            this.datosD.sort(function(a, b) {
                if (a.IdScan < b.IdScan) {
                    return -1;
                }
                if (a.IdScan > b.IdScan) {
                    return 1;
                }
                return 0;
            });

            // Calcular el total de cantidadAsig
            const totalCantidadAsig = this.datosD.reduce((total, item) => {
                return total + (item.cantidadAsig || 0);
            }, 0);

            // Crear un nuevo modelo JSON con los datos procesados y el total
            var oModel = new JSONModel({
                tableData: this.datosD,
                totalCantidadAsig: totalCantidadAsig,
                Transporte:this.datosD[0].Transporte
            });

            // Asignar el modelo a la vista
            this.getView().setModel(oModel);
            },

                    
        obtenerYProcesarDatos: async function () {
            try {
                let datos = await this.obtenerDatosDeIndexedDB();
                this.datosD = this.procesarDatos(datos);
            } catch (error) {
                console.log("Error:", error);
            }
          },
          obtenerDatosDeIndexedDB: function () {
            ctx=this;
            return new Promise((resolve, reject) => {
              let request = indexedDB.open("ventilado",5);
          
              request.onerror = (event) => {
                console.log("Error al abrir la base de datos:", event);
                reject("Error al abrir la base de datos");
              };
          
              request.onsuccess = (event) => {
                let db = event.target.result;
                ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
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


        procesarDatos: function(datos) {
            let resultado = {};            
            datos.forEach((registro) => {   
                if(registro.CantEscaneada>0) {           
                    resultado[registro.Id] = {
                        "Id"               : registro.Id,
                        "IdScan"           : registro.AdicChar2,
                        "Ean"              : registro.Ean,
                        "CodigoInterno"    : registro.CodigoInterno,
                        "Descricion"       : registro.Descricion,
                        "RutaAsig"         : String(registro.LugarPDisp).padStart(2,'0'),
                        "RutaConf"         : String(registro.LugarPDisp).padStart(2,'0'),
                        "Transporte"       : registro.Transporte ,
                        "Entrega"          : registro.Entrega,  
                        "EntreProd"        : registro.Entrega + registro.CodigoInterno,  
                        "Asign"            : registro.Entrega + registro.CodigoInterno +"A",  
                        "TipoLog"          : "SCAN"  ,
                        "FechaHora"        : registro.AdicDec2,
                        "Preparador"       : registro.Preparador,
                        "Cliente"          : registro.Destinatario,
                        "cantidadAsig"     : registro.CantEscaneada

                    };
                }
                
            });
            
            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);
            
            return arrayResultado;
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