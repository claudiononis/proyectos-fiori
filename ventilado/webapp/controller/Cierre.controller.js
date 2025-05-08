sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    // "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, MessageBox) {
    "use strict";
    var ctx;  // Variable global en el controlador para guardar el contexto
    var sPuesto;
    var sUsuario;
    var sReparto;
    var sPtoPlanif;
    var datosD = [];
    return Controller.extend("ventilado.ventilado.controller.Cierre", {

        onInit: function () {
            this._dbConnections = []; // Array para almacenar conexiones abiertas
            // Obtener el router y attachRouteMatched
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("Cierre").attachMatched(this.onRouteMatched, this);

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
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel);
            this.obtenerYProcesarDatos();
        },

        obtenerYProcesarDatos: function () {
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
                // Convertir LugarPDisp a número para la comparación
                var lugarA = parseInt(a.LugarPDisp, 10);
                var lugarB = parseInt(b.LugarPDisp, 10);

                if (lugarA < lugarB) {
                    return -1;
                }
                if (lugarA > lugarB) {
                    return 1;
                }
                return 0;
            });

            let resultado = {};
            datos.forEach((registro) => {
                let ruta = registro.LugarPDisp;
                let cantidad = registro.CantidadEntrega;
                let cantidadEsc = registro.CantEscaneada;
                let M3v = registro.M3v;
                let KGBrV = registro.Kgbrv;
                let M3R = registro.M3r;
                let KGBrR = registro.Kgbrr;
                let Cubre = registro.Cubre;

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
                        "CubTeo": 0,
                        KgBxCub: 0,
                        "M3H2O": registro.M3teo,
                        "porcTeo": 0,
                        "ProdR": 0,
                        "KGBrR": 0,
                        "M3R": 0,
                        "CubR": registro.Cubre,
                        "PaR": registro.Pa,
                        "CubEq": registro.CubEq,
                        "KgbxCubR": 0,
                        "M3H2OR": registro.M3H2OR,
                        "porcReal": registro.porcReal,
                        "TOT": 0,
                        "TOT2": 0
                    };

                }

                // Suma la cantidad al total
                resultado[ruta]["PRODV"] += cantidad;
                resultado[ruta]["ProdR"] += cantidadEsc;

                // resultado[ruta]["KGBrV"] += (parseFloat(resultado[ruta]["KGBrR"]) || 0 + Number(KGBrV) || 0).toFixed(2).replace(/^0+(\d)/, '$1');
                resultado[ruta]["KGBrV"] = (parseFloat(resultado[ruta]["KGBrV"]) + Number(KGBrV) || 0)
                    .toFixed(2)
                    .replace(/^(-?)0+(?=\d)/, '$1');
                resultado[ruta]["M3V"] = (parseFloat(resultado[ruta]["M3V"]) + Number(M3v) || 0).toFixed(3).replace(/^0+(\d)/, '$1');


                resultado[ruta]["KGBrR"] = (parseFloat(resultado[ruta]["KGBrR"]) + Number(KGBrR) || 0)
                    .toFixed(2)
                    .replace(/^(-?)0+(?=\d)/, '$1');


                resultado[ruta]["M3R"] = (parseFloat(resultado[ruta]["M3R"]) + Number(M3R) || 0).toFixed(3).replace(/^0+(\d)/, '$1');
                if (Number(Cubre) !== 0) {
                    resultado[ruta]["KgbxCubR"] = (parseFloat(resultado[ruta]["KgbxCubR"]) + (Number(KGBrR) / (Number(Cubre))) || 0).toFixed(2);
                }
                else
                    resultado[ruta]["KgbxCubR"] = 0;

                resultado[ruta]["CubTeo"] += Math.ceil(registro.M3v / 0.077);
                //  resultado[ruta]["KgBxCub"] += (Number(KGBrv) || 0)/(registro.M3v / 0.077);
                // Calcula CubTeo y KgBxCub
                resultado[ruta]["CubTeo"] = resultado[ruta]["M3V"] / 0.077;
                resultado[ruta]["KgBxCub"] = resultado[ruta]["CubTeo"] !== 0 ? resultado[ruta]["KGBrV"] / resultado[ruta]["CubTeo"] : 0;

                // Asegura que CubTeo y KgBxCub sean números con dos decimales
                resultado[ruta]["CubTeo"] = Math.ceil(resultado[ruta]["CubTeo"].toFixed(2));
                resultado[ruta]["KgBxCub"] = parseFloat((resultado[ruta]["KGBrV"] / resultado[ruta]["CubTeo"]).toFixed(2));
                resultado[ruta]["M3H2O"] = parseFloat((resultado[ruta]["M3V"] / resultado[ruta]["CubTeo"]).toFixed(2));
                resultado[ruta]["M3H2OR"] = parseFloat((resultado[ruta]["M3R"] / resultado[ruta]["CubR"]).toFixed(2));
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
