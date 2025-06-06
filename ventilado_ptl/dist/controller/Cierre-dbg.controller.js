sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
   // "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
], function (Controller, MessageToast, JSONModel,  Filter, FilterOperator, MessageBox) {
    "use strict";
    var ctx;  // Variable global en el controlador para guardar el contexto
    var sPuesto;
    var sUsuario;
    var sReparto;
    var sPtoPlanif;
    var datosD=[];
    return Controller.extend("ventilado.ventilado.controller.Cierre", {

        onInit: function () {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            // Obtener el router y attachRouteMatched
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("Log").attachMatched(this.onRouteMatched, this);

            // Manejar eventos de navegación
            window.addEventListener('beforeunload', this._handleUnload.bind(this));
            window.addEventListener('popstate', this._handleUnload.bind(this));

            // Ejecutar acciones iniciales
            this.ejecutarAcciones();
            
        },

        onRouteMatched: function () {
            // Ejecutar acciones cada vez que la ruta es navegada
            this.ejecutarAcciones();
        },

        ejecutarAcciones: function () {
            // Leer datos locales
            sPuesto = localStorage.getItem('sPuesto');
            sReparto = localStorage.getItem('sReparto');
            sPtoPlanif = localStorage.getItem('sPtoPlanif');
            sUsuario = localStorage.getItem('sPreparador');
            
            this.obtenerYProcesarDatos();
        },

        obtenerYProcesarDatos:  function () {
            this.obtenerDatosDeIndexedDB()
                .then(datos => {
                    datosD = this.procesarDatos(datos);
                    // Calcular el total de cantidadAsig
                    const totalCantidadAsig = datosD.reduce((total, item) => {
                        return total + (item.cantidadAsig || 0);
                    }, 0);
                    // Crear un nuevo modelo JSON con los datos procesados
                    var oModel = new JSONModel({
                        tableData: datosD,
                        Transporte: datosD.length > 0 ? datosD[0].Transporte : ""
                    });

                    // Asignar el modelo a la vista
                    this.getView().setModel(oModel);
                })
                .catch(error => {
                    console.log("Error:", error);
                });
        },

        obtenerDatosDeIndexedDB: async function () {
            ctx = this;
            return new Promise((resolve, reject) => {
                let request = indexedDB.open("ventilado", 5);

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

        procesarDatos: function (datos) {
            datos.sort(function (a, b) {
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
                let M3v = registro.M3v;
                let KGBrv = registro.Kgbrv;

                if (!resultado[ruta]) {
                    // Inicializa el objeto de la ruta si no existe
                    resultado[registro.LugarPDisp] = {
                        "Ruta": ruta,
                        "CLIENTE": registro.Destinatario,
                        "RAZONSOCIAL": registro.NombreDestinatario,
                        "ENTREGA": registro.Entrega,
                        "PRODV": 0,
                        "KGBrV": 0,
                        "M3V": 0,
                        "Transporte": registro.Transporte,
                        "CubTeo": registro.CubTeo,
                        KgBxCub: registro.KgBxCub,
                        "M3H2O": registro.M3teo,
                        "porcTeo": 0,
                        "ProdR": registro.ProdR,
                        "KGBrR": registro.KGBrR,
                        "M3R": registro.M3R,
                        "CubR": registro.CubR,
                        "PaR": registro.PaR,
                        "CubEq": registro.CubEq,
                        "KgbxCubR": registro.KgbxCubR,
                        "M3H2OR": registro.M3H2OR,
                        "porcReal": registro.porcReal,
                        "TOT": 0
                    };
                }

                // Suma la cantidad al total
                resultado[ruta]["TOT"] += cantidad;
                resultado[ruta]["KGBrV"] += Number(KGBrv) || 0;
                resultado[ruta]["M3V"] += Number(M3v) || 0;
            });

            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);

            return arrayResultado;
        },

        // Cuando se sale de la página se cierran todas las conexiones a la base local
        onExit: function () {
            this.closeAllDbConnections();
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
