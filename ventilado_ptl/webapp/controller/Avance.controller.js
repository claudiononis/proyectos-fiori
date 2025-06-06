sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/v2/ODataModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox"
], function (
  Controller,
  MessageToast,
  JSONModel,
  ODataModel,
  Filter,
  FilterOperator,
  MessageBox
) {
  "use strict";
  var ctx = this;
  var sTransporte;
  var sPuesto;
  var sReparto;
  var sPtoPlanif;
  var sUsuario;
  var sFecha;
  var datosD = [];

  return Controller.extend("ventilado.ventilado.controller.Desconsolidado", {
    onInit: function () {

      this._dbConnections = [];
      var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      oRouter.getRoute("Avance2").attachMatched(this.onRouteMatched, this);
      window.addEventListener("beforeunload", this._handleUnload.bind(this));
      window.addEventListener("popstate", this._handleUnload.bind(this));

      this.ejecutarAcciones().catch((error) => {
        console.error("Error al ejecutar acciones iniciales:", error);
      });
    },

    onRouteMatched: function () {
      this.ejecutarAcciones().catch((error) => {
        console.error("Error al ejecutar acciones iniciales:", error);
      });
    },

    ejecutarAcciones: function () {
      sPuesto = localStorage.getItem("sPuesto");
      sReparto = localStorage.getItem("sReparto");
      sPtoPlanif = localStorage.getItem("sPtoPlanif");
      sUsuario = localStorage.getItem("sPreparador");
      this.getView().byId("btScan2").setEnabled(false);
      var oModel = new sap.ui.model.json.JSONModel();
      this.getView().setModel(oModel);

      return this.obtenerYProcesarDatos()
        .then(() => {
          const totalTot = this.datosD.reduce((total, item) => total + (item.TOT || 0), 0);
          const totalScan = this.datosD.reduce((total, item) => total + (item.SCAN || 0), 0);
          const totalFaltan = this.datosD.reduce((total, item) => total + (item.FALTA || 0), 0);
          const totalKilo = parseFloat(this.datosD.reduce((total, item) => total + (parseFloat(item.KILO) || 0), 0).toFixed(1));
          const totalM3 = parseFloat(this.datosD.reduce((total, item) => total + (parseFloat(item.M3) || 0), 0).toFixed(3));
          const totalCubTeo = this.datosD.reduce((total, item) => total + (item.CubTEO || 0), 0);

          // Asignar contenedor automático solo si no existe
          this.datosD.forEach(item => {
            if (!item.contenedor) {
              item.contenedor = this.determinarContenedor(item.CubTEO);
            }
          });

          // Calcular displays solo si no están definidos
          //this.datosD = this.calcularDisplays(this.datosD);
          const limite1 = parseInt(localStorage.getItem("limite1")) || 8;
          const limite2 = parseInt(localStorage.getItem("limite2")) || 12;
          const usarRoll = localStorage.getItem("usarRoll") === "true";

          this.datosD = this.asignarContenedoresYDisplays(this.datosD, limite1, limite2, usarRoll);
          /********* */
          if (this.excedioLimiteDisplays(this.datosD)) {
            const oView = this.getView();

            const inputLimite1 = new sap.m.Input({
              value: limite1.toString(),
              type: "Number"
            });

            const inputLimite2 = new sap.m.Input({
              value: limite2.toString(),
              type: "Number"
            });

            const checkboxRoll = new sap.m.CheckBox({
              selected: usarRoll,
              text: "Usar Roll Container"
            });

            const dialog = new sap.m.Dialog({
              title: "Exceso de Displays",
              type: "Message",
              content: [
                new sap.m.Label({ text: "Límite 1 (Cubetas hasta):", labelFor: inputLimite1 }),
                inputLimite1,
                new sap.m.Label({ text: "Límite 2 (Palets desde):", labelFor: inputLimite2 }),
                inputLimite2,
                checkboxRoll
              ],
              beginButton: new sap.m.Button({
                text: "Recalcular",
                type: "Emphasized",
                press: () => {
                  const nuevoL1 = parseInt(inputLimite1.getValue(), 10);
                  const nuevoL2 = parseInt(inputLimite2.getValue(), 10);
                  const nuevoUsarRoll = checkboxRoll.getSelected();

                  localStorage.setItem("limite1", isNaN(nuevoL1) ? "8" : nuevoL1);
                  localStorage.setItem("limite2", isNaN(nuevoL2) ? "12" : nuevoL2);
                  localStorage.setItem("usarRoll", nuevoUsarRoll ? "true" : "false");

                  const recalculado = this.asignarContenedoresYDisplays(this.datosD, nuevoL1, nuevoL2, nuevoUsarRoll);
                  const excedeAhora = this.excedioLimiteDisplays(recalculado);

                  this.datosD = recalculado;
                  this.getView().getModel().setProperty("/tableData", recalculado);
                  this.getView().byId("btConfirmarContenedores").setEnabled(!excedeAhora);
                  //this.getView().byId("btScan2").setEnabled(!excedeAhora);

                  if (excedeAhora) {
                    sap.m.MessageToast.show("Todavía se exceden las 30 posiciones.");
                  } else {
                    sap.m.MessageToast.show("Asignación recalculada correctamente.");
                  }

                  dialog.close();
                }
              }),
              endButton: new sap.m.Button({
                text: "Cancelar",
                press: () => {
                  dialog.close();
                }
              }),
              afterClose: () => {
                dialog.destroy();
              }
            });

            dialog.open();

            // Desactivar botones mientras tanto
            oView.byId("btConfirmarContenedores").setEnabled(false);
            oView.byId("btScan2").setEnabled(false);
          }

          /******** */

          var oModel = new sap.ui.model.json.JSONModel({
            tableData: this.datosD,
            tableData2: this.datosD2,
            totalCantidadAsig: this.datosD.reduce((total, item) => total + (item.cantidadAsig || 0), 0),
            totalTot: totalTot,
            totalScan: totalScan,
            totalFaltan: totalFaltan,
            totalKilo: totalKilo,
            totalM3: totalM3,
            totalCubTeo: totalCubTeo,
            contenedor: "", // Inicializa como vacío o usa la lógica de determinación
            display: "",

          });

          this.getView().setModel(oModel);
        })
        .catch((error) => {
          console.error("Error al obtener y procesar datos:", error);
        });
    },

    determinarContenedor: function (cubTeo) {
      const limite1 = 5;
      const limite2 = 10;

      if (cubTeo <= limite1) {
        return "CUB";
      } else if (cubTeo > limite1 && cubTeo <= limite2) {
        return "ROLL";
      } else {
        return "PALLET";
      }
    },

    calcularDisplays: function (data) {
      let displayCounter = 1;

      data.forEach(function (item, index) {
        if (item.Ruta === "1") {
          // Ruta 1 siempre tiene dsp-001
          item.display = "dsp-001";
          displayCounter = 2; // Comienza el contador desde dsp-002 para las siguientes rutas
        } else {
          // Calcular el display según el tipo de contenedor
          switch (item.contenedor) {
            case "CUB":
              item.display = "dsp-" + ("000" + displayCounter).slice(-3);
              displayCounter += 1;
              break;
            case "ROLL":
              item.display = "dsp-" + ("000" + displayCounter).slice(-3);
              displayCounter += 2;
              break;
            case "PALLET":
              item.display = "dsp-" + ("000" + displayCounter).slice(-3);
              displayCounter += 3;
              break;
            default:
              item.display = "";
          }
        }
      });

      return data;
    },
    onChangeContenedor: function (oEvent) {
      // Obtener el ComboBox
      var oComboBox = oEvent.getSource();

      // Obtener el contenedor seleccionado
      var sContenedor = oComboBox.getSelectedKey();

      if (!sContenedor) {
        console.error("No se pudo obtener el contenedor seleccionado.");
        return;
      }

      // Obtener el contexto de enlace y el modelo
      var oBindingContext = oEvent.getSource().getBindingContext();
      var oModel = this.getView().getModel();
      var oData = oBindingContext.getObject();

      // Actualizar el contenedor seleccionado en el objeto vinculado al modelo
      oData.contenedor = sContenedor;

      // Actualizar el modelo con el nuevo valor del contenedor
      oModel.setProperty(oBindingContext.getPath() + "/contenedor", sContenedor);

      // Obtener todos los datos actualizados desde el modelo
      var aFullData = oModel.getProperty("/tableData");

      // Recalcular todos los displays
      aFullData = this.calcularDisplays(aFullData);

      // Actualizar el modelo con los nuevos displays
      oModel.setProperty("/tableData", aFullData);

      // Refrescar la UI
      oModel.refresh();
    },
    onConfirmarContenedores: function () {
      var ctx=this;
      var oModel = this.getView().getModel();
      var aFullData = oModel.getProperty("/tableData");

      // Guardar en IndexedDB
      this.guardarEnIndexedDB(aFullData).then(() => {
        MessageToast.show("Datos guardados correctamente en IndexedDB");

        // Actualizar el backend
        Promise.all(
          aFullData.map(item => {
            return this.actualizarBackend(item.id, item.contenedor, item.display);
          })
        ).then(() => {
          MessageToast.show("Datos actualizados correctamente en el backend");
           ctx.getView().byId("btScan2").setEnabled(true);
        }).catch((error) => {
          MessageBox.error("Error al actualizar el backend: " + error);
        });
      }).catch((error) => {
        MessageBox.error("Error al guardar en IndexedDB: " + error);
      });
    },

    guardarEnIndexedDB: function (aData) {
      return new Promise((resolve, reject) => {
        let request = indexedDB.open("ventilado", 5);
        request.onerror = function (event) {
          reject("Error al abrir la base de datos");
        };

        request.onsuccess = function (event) {
          let db = event.target.result;
          let transaction = db.transaction(["ventilado"], "readwrite");
          let objectStore = transaction.objectStore("ventilado");

          aData.forEach(function (item) {
            let index = objectStore.index("LugarPDisp");
            let getRequest = index.getAll(item.Ruta);

            getRequest.onsuccess = function () {
              let records = getRequest.result;

              records.forEach(function (record) {
                record.contenedor = item.contenedor;
                record.display = item.display;
                objectStore.put(record);
              });
            };
          });

          transaction.oncomplete = function () {
            resolve();
          };

          transaction.onerror = function (e) {
            reject("Error en la transacción: " + e.target.error);
          };
        };
      });
    },

    obtenerYProcesarDatos: function () {
      return this.obtenerDatosDeIndexedDB()
        .then((datos) => {
          this.datosD = this.procesarDatos(datos);
          this.datosD2 = this.procesarDatos2(datos);
        })
        .catch((error) => {
          console.error("Error al obtener datos de IndexedDB:", error);
          throw error;
        });
    },

    obtenerDatosDeIndexedDB: function () {
      ctx = this;
      return new Promise((resolve, reject) => {
        let request = indexedDB.open("ventilado", 5);
        request.onerror = (event) => {
          console.log("Error al abrir la base de datos:", event);
          reject("Error al abrir la base de datos");
        };
        request.onsuccess = (event) => {
          let db = event.target.result;
          ctx._dbConnections.push(db);
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
        if (a.Ruta < b.Ruta) return -1;
        if (a.Ruta > b.Ruta) return 1;
        return 0;
      });

      let resultado = {};
      datos.forEach((registro) => {
        let ruta = registro.LugarPDisp;
        let cantidad = registro.CantidadEntrega;
        let sCantEscaneada = registro.CantEscaneada;

        if (!resultado[ruta]) {
          resultado[ruta] = {
            Ruta: ruta,
            TOT: 0,
            SCAN: 0,
            FALTA: 0,
            TRANSPORTE: registro.Transporte,
            ENTREGA: registro.Entrega,
            KILO: 0,
            M3: 0,
            CLIENTE: registro.Destinatario,
            contenedor: registro.contenedor || "",
            display: registro.display || "",
            id: registro.Id
          };
        }

        resultado[ruta]["TOT"] += cantidad;
        resultado[ruta]["SCAN"] += Number(sCantEscaneada) || 0;
        resultado[ruta]["FALTA"] = resultado[ruta]["TOT"] - resultado[ruta]["SCAN"];
        resultado[ruta]["KILO"] = (parseFloat(resultado[ruta]["KILO"]) + (parseFloat(registro.Kgbrv) || 0)).toFixed(1);
        resultado[ruta]["M3"] = (parseFloat(resultado[ruta]["M3"]) + (parseFloat(registro.M3v) || 0)).toFixed(3);
        resultado[ruta]["CubTEO"] = Math.ceil(resultado[ruta]["M3"] / (0.7 * 0.077));
        resultado[ruta]["id"] = registro.Id;
      });

      let arrayResultado = Object.keys(resultado).map(ruta => resultado[ruta]);

      return arrayResultado;
    },

    procesarDatos2: function (datos) {
      datos.sort(function (a, b) {
        if (a.CodigoInterno < b.CodigoInterno) return -1;
        if (a.CodigoInterno > b.CodigoInterno) return 1;
        return 0;
      });

      let resultado = {};
      datos.forEach((registro) => {
        let CI = registro.CodigoInterno;
        let cantidad = registro.CantidadEntrega;
        let sCantEscaneada = registro.CantEscaneada;

        if (!resultado[CI]) {
          resultado[CI] = {
            CI: CI,
            TOT: 0,
            SCAN: 0,
            FALTA: 0,
            TRANSPORTE: registro.Transporte,
            ENTREGA: registro.Entrega,
            DESCRIPCION: registro.Descricion
          };
        }

        resultado[CI]["TOT"] += cantidad;
        resultado[CI]["SCAN"] += Number(sCantEscaneada);
        resultado[CI]["FALTA"] = resultado[CI]["TOT"] - resultado[CI]["SCAN"];
      });

      return Object.keys(resultado).map(key => resultado[key]);
    },

    onExit: function () {
      this.closeAllDbConnections();
    },

    closeAllDbConnections: function () {
      this._dbConnections.forEach((db) => {
        db.close();
      });
      this._dbConnections = [];
    },

    _handleUnload: function () {
      this.closeAllDbConnections();
    },

    onNavToScan: function () {
      var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      oRouter.navTo("Scan");
    },


    /************************** */
    mapearDisplayParaBackend: function (display) {
      if (display.startsWith("dsp-")) {
        return display.slice(4); // Extraer solo los números (ejemplo: "dsp-001" → "001")
      }
      return ""; // Valor predeterminado si no tiene el formato esperado
    },
    mapearContenedorParaBackend: function (contenedor) {
      switch (contenedor) {
        case "CUB":
          return "CU";
        case "ROLL":
          return "RO";
        case "PALLET":
          return "PA";
        default:
          return ""; // Valor predeterminado si no coincide
      }
    },
    /* actualizarBackend: function (id, contenedor, display) {
      return new Promise((resolve, reject) => {
        // Crear el modelo OData
        var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");

        // Construir la ruta para el registro específico
        var sPath = "/ventiladoSet(" + id + ")";

        // Mapear contenedor y display a formatos abreviados
        var sPRODV = this.mapearContenedorParaBackend(contenedor); // CU, RO, PA
        var sPRODR = this.mapearDisplayParaBackend(display);       // 001, 002

        // Datos a actualizar
        var oPayload = {
          PRODV: sPRODV, // Guardar el contenedor en PRODV
          PRODR: sPRODR  // Guardar el display en PRODR
        };

        // Actualizar el backend
        oModel.update(sPath, oPayload, {
          success: function () {
            console.log("Backend actualizado con éxito.");
            resolve();
          },
          error: function (oError) {
            console.error("Error al actualizar el backend:", oError);
            reject(oError);
          }
        });
      });
    },*/
    actualizarBackend: function (id, contenedor, display) {
      var sPRODV = this.mapearContenedorParaBackend(contenedor);
      var sPRODR = this.mapearDisplayParaBackend(display);

      var oDatos = {
        Id: id,
        Prodv: sPRODV,
        Prodr: sPRODR
      };

      this.oActualizarBackEnd(oDatos);
      return Promise.resolve(); // para que el flujo `Promise.all` siga funcionando

    },
    crud: function (sMetodo, datos, successCallback, errorCallback) {
      // var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
      var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {
        useBatch: false,
        defaultBindingMode: "TwoWay",
        deferredGroups: ["batchGroup1"]
      });
      var sPath = "/ventiladoSet(" + datos.Id + ")";

      oModel.update(sPath, datos, {
        success: function () {
          console.log("Backend actualizado con éxito (Scan2 style).");
          if (successCallback) successCallback();
        },
        error: function (oError) {
          console.error("Error al actualizar backend (Scan2 style):", oError);
          if (errorCallback) errorCallback(oError);
        }
      });
    },
    oActualizarBackEnd: function (datos) {
      this.crud("ACTUALIZAR", datos);
    },
    asignarContenedoresYDisplays: function (aData, limite1, limite2, usarRoll) {
      // Paso 1: Asignar tipo de contenedor
      aData.forEach(item => {
        if (item.CubTEO <= limite1) {
          item.contenedor = "CUB";
        } else if (item.CubTEO > limite2 || !usarRoll) {
          item.contenedor = "PALLET";
        } else {
          item.contenedor = "ROLL";
        }
      });

      // Paso 2: Ordenar por tipo de contenedor y ruta numérica
      const tipoOrden = { "CUB": 1, "PALLET": 2, "ROLL": 3 };
      aData.sort((a, b) => {
        if (tipoOrden[a.contenedor] !== tipoOrden[b.contenedor]) {
          return tipoOrden[a.contenedor] - tipoOrden[b.contenedor];
        }
        return parseInt(a.Ruta) - parseInt(b.Ruta);
      });

      // Paso 3: Asignar display sin cruzar módulos (cada módulo tiene 6 posiciones)
      let posicion = 1;
      const posicionesPorModulo = 6;

      aData.forEach(item => {
        const espacios = item.contenedor === "CUB" ? 1 :
          item.contenedor === "ROLL" ? 2 :
            item.contenedor === "PALLET" ? 3 : 1;

        let moduloActual = Math.ceil(posicion / posicionesPorModulo);
        let moduloFinal = Math.ceil((posicion + espacios - 1) / posicionesPorModulo);

        if (moduloActual !== moduloFinal) {
          posicion = (moduloActual * posicionesPorModulo) + 1;
        }

        item.display = "dsp-" + ("000" + posicion).slice(-3);
        posicion += espacios;
      });

      return aData;
    },

    // ✅ Nueva función para validar si se excede el límite de displays
    excedioLimiteDisplays: function (aData) {
      const totalEspacios = aData.reduce((acc, item) => {
        switch (item.contenedor) {
          case "CUB": return acc + 1;
          case "ROLL": return acc + 2;
          case "PALLET": return acc + 3;
          default: return acc;
        }
      }, 0);
      return totalEspacios > 30;
    }

  });
});  