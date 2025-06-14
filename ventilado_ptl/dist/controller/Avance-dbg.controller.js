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
    var sTransporte;
    var sPuesto ;
    var sReparto ;
    var sPtoPlanif ;
    var sUsuario;
    var sFecha; 
    var datosD=[];
    return Controller.extend("ventilado.ventilado.controller.Desconsolidado", {

        onInit: async function () {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            // Obtener el router y attachRouteMatched
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("Avance").attachMatched(this.onRouteMatched, this);

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
            
            // Calcular el total de cantidadAsig
            const totalCantidadAsig = this.datosD.reduce((total, item) => {
                return total + (item.cantidadAsig || 0);
            }, 0);

            // Crear un nuevo modelo JSON con los datos procesados y el total
            var oModel = new JSONModel({
                tableData: this.datosD,
                tableData2:this.datosD2,
                totalCantidadAsig: totalCantidadAsig
            });

            // Asignar el modelo a la vista
            this.getView().setModel(oModel);
            },

                     
        obtenerYProcesarDatos: async function () {
            try {
                let datos = await this.obtenerDatosDeIndexedDB();
                this.datosD = this.procesarDatos(datos);
                this.datosD2 = this.procesarDatos2(datos);
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
            datos.sort(function(a, b) {
                if (a.Ruta < b.Ruta) {
                    return -1;
                }
                if (a.Ruta > b.Ruta) {
                    return 1;
                }
                return 0;
            });
            let resultado = {};            
            datos.forEach((registro) => {   
                let ruta = registro.LugarPDisp;
                let cantidad = registro.CantidadEntrega; 
                let sCantEscaneada = registro.CantEscaneada;        
                if (!resultado[ruta]) {
                    // Inicializa el objeto de la ruta si no existe
                    resultado[registro.LugarPDisp] = {
                        "Ruta"         : ruta,
                        "TOT"          : 0,
                        "SCAN"         : 0, 
                        "FALTA"        : 0, 
                        "Cub TEO"      : registro.Cubteo,                     
                        "TRANSPORTE"   : registro.Transporte ,
                        "ENTREGA"      : registro.Entrega,  
                        "KILO"         : 0,
                        "M3"           : registro.M3teo,
                        "CLIENTE"      : registro.Destinatario,
                    };
                }

                // Suma la cantidad al total
                resultado[ruta]["TOT"] += cantidad;
                resultado[ruta]["SCAN"] += Number(sCantEscaneada) || 0;
                resultado[ruta]["FALTA"] = resultado[ruta]["TOT"] - resultado[ruta]["SCAN"];
                resultado[ruta]["KILO"] += parseFloat(registro.kgbrr) || 0;
                resultado[ruta]["M3"] = parseFloat(registro.M3r) || 0;
                resultado[ruta]["CLIENTE"] = registro.Destinatario;              
                
            });
            
            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);
            
            return arrayResultado;
        },

        procesarDatos2: function(datos) {
            // Ordenar datosD2 por Codigo Interno
            datos.sort(function(a, b) {
                if (a.Ruta < b.CodigoInterno) {
                    return -1;
                }
                if (a.Ruta > b.CodigoInterno) {
                    return 1;
                }
                return 0;
            });
            let resultado = {};            
            datos.forEach((registro) => {   
                let CI = registro.CodigoInterno;
                let cantidad = registro.CantidadEntrega; 
                let sCantEscaneada = registro.CantEscaneada;        
                if (!resultado[CI]) {
                    // Inicializa el objeto de la ruta si no existe
                    resultado[CI] = {
                        "CI"           : CI,
                        "TOT"          : 0,
                        "SCAN"         : 0, 
                        "FALTA"        : 0,                     
                        "TRANSPORTE"   : registro.Transporte ,
                        "ENTREGA"      : registro.Entrega, 
                        "DESCRIPCION"  : registro.Descricion,
                    };
                }

                // Suma la cantidad al total
                resultado[CI]["TOT"] += cantidad;                
                resultado[CI]["SCAN"] += Number(sCantEscaneada);
                resultado[CI]["FALTA"] =  resultado[CI]["TOT"] -  resultado[CI]["SCAN"];
                            
                
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