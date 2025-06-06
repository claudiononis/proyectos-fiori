sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",

], function (Controller, MessageToast, PDFViewer,Fragment,JSONModel,ODataModel,Filter,FilterOperator,MessageBox) {
    "use strict";
    var ctx= this;  // Variable global en el controlador para guardar el contexto
    var sTransporte;
    var sPuesto ;
    var sReparto ;
    var sPtoPlanif ;
    var sUsuario;
    var sFecha; 
    var maxAdicChar2 = 0;
    return Controller.extend("ventilado.ventilado.controller.Scan2", {
         
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
             // Obtener el valor máximo de AdicChar2
             maxAdicChar2 =   await this.obtenerMaxAdicChar2();
             
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
            //completo con ceros            
            sReparto = sReparto.padStart(10, '0');
            sPtoPlanif = sPtoPlanif.padStart(4, '0');
     
            this._checkNetworkStatus();  // funcion para que el navegador controle la conexion a internet
            this._fetchCodConfirmacionData(); // Llamar a la función para leer los Codigos de confirmacion de ruta del backend                  
     
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel);
            this.obtenerYProcesarDatos();
            
        },

/****** Inicio: Obtiene los datos de la Base local agrupa x Ruta y arma  la tabla de avance  */
obtenerMaxAdicChar2: async function () {
    let datos = await this.obtenerDatosDeIndexedDB();
    let maxAdicChar2 = 0;
    datos.forEach((item) => {
        let valorAdicChar2 = parseInt(item.AdicChar2, 10);
        if (!isNaN(valorAdicChar2) && valorAdicChar2 > maxAdicChar2) {
            maxAdicChar2 = valorAdicChar2;
        }
    });
    return maxAdicChar2;
},
        obtenerYProcesarDatos: async function () {
            try {
                let datos = await this.obtenerDatosDeIndexedDB();
                let resultado = this.procesarDatos(datos);
                //Calculo los totales para la tabla avance
                var total = resultado.reduce(function(accumulator, currentValue) {
                    return accumulator + Number(currentValue.TOT);
                }, 0);
                var totalScan = resultado.reduce(function(accumulator, currentValue) {
                    return accumulator + Number(currentValue.SCAN);
                }, 0);
                var totalFalta = resultado.reduce(function(accumulator, currentValue) {
                    return accumulator + Number(currentValue.FALTA);
                }, 0);
                var totalCubTeo = resultado.reduce(function(accumulator, currentValue) {
                    return accumulator + Number(currentValue["Cub TEO"]);
                }, 0);
                //Recupera el estado del transporte

                // Nombres de las columnas
                var columnNames = ["Ruta", "CLIENTE", "RAZONSOCIAL","TOT", "SCAN", "FALTA", "Cub TEO", "C Real", "Pa"];
        
                // Mapear arrayResultado a la estructura de tableDataArray
                var tableDataArray = resultado.map((registro) => {
                    var nuevoRegistro = {};
                    columnNames.forEach((column) => {
                        nuevoRegistro[column] = registro[column] || "0";
                    });
                    return nuevoRegistro;
                });
        
                // Actualizar el modelo con tableDataArray
             //   var oGlobalModel = this.getOwnerComponent().getModel("globalModel");
                var oModel = this.getView().getModel(); // Obtener el modelo de la vista
                oModel.setData({
                    printEtiquetas: false,
                    isStarted: false,
                    isArrowVisible: false,
                    isClosed: true,  
                    showPasswordInput: false,
                    tableData: tableDataArray,
                    totalP: total,
                    totalScan: totalScan,
                    totalFalta: totalFalta,
                    totalCubTeo:totalCubTeo,
                    estadoDelTransporte: "",
                    puesto: "Estación de trabajo Nro: " + sPuesto,
                    transporte: "Reparto: " + String(Number(sReparto)),
                    cuenta: 0,
                    cantidad: 0,
                    ruta: 0,
                    ean: "",
                    eanRuta: "",
                    id: 0
                });
                this.getView().setModel(oModel);
        
                console.log(tableDataArray);
            } catch (error) {
                console.log("Error:", error);
            }
          },
          obtenerDatosDeIndexedDB: function () {
            var ctx = this;
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
                let ruta = registro.LugarPDisp;
                let cantidad = registro.CantidadEntrega; 
                let sCantEscaneada = registro.CantEscaneada;           
                if (!resultado[ruta]) {
                    // Inicializa el objeto de la ruta si no existe
                    resultado[ruta] = {
                        "Ruta"        : ruta,
                        "TOT"         : 0,
                        "SCAN"        : 0, 
                        "FALTA"       : 0, 
                        "Cub TEO"     : registro.Cubteo, 
                        "C Real"      : 0, 
                        "Pa"          : 0, 
                        "TRANSPORTE"  : registro.Transporte ,
                        "ENTREGA"     : registro.Entrega,               
                       "CUBETA"       : 0,
                     //   "TOTALCUBETA" : 0,  "Cub TEO"
                        "PRODUCTO"    : 0,
                        "KILO"        : 0,
                        "M3"          : registro.M3teo,
                        "CLIENTE"     : registro.Destinatario,
                        "RAZONSOCIAL" : registro.NombreDestinatario,
                        "DIRECCION"   : registro.Calle,
                        "LOCALIDAD"   :  registro.LugarDestinatario,
                        "CODIGOINTERNO"   :  registro.CodigoInterno,

                      //  fecha: registro.fecha,  //Suponiendo que la fecha es la misma para todos los registros de la misma ruta
                      //  transportista: registro.transportista  // Suponiendo que el transportista es el mismo para todos los registros de la misma ruta
                    };
                }

                // Suma la cantidad al total
                resultado[ruta]["TOT"] += cantidad;                
                resultado[ruta]["SCAN"] += Number(sCantEscaneada);
                resultado[ruta]["FALTA"] =  resultado[ruta]["TOT"] -  resultado[ruta]["SCAN"];
               // resultado[ruta]["TRANSPORTE"] = registro.Transporte ;
               // resultado[ruta]["ENTREGA"] = registro.Entrega;
                resultado[ruta]["CUBETA"] = "";
                resultado[ruta]["TOTALCUBETA"] = resultado[ruta]["TOTALCUBETA"];
                resultado[ruta]["PRODUCTO"] =resultado[ruta]["TOT"] ;
                resultado[ruta]["KILO"] += registro.kgbrr ;
                resultado[ruta]["M3"] =registro.M3r;
                resultado[ruta]["CLIENTE"] = registro.Destinatario ;
                resultado[ruta]["RAZONSOCIAL"] =  registro.NombreDestinatario;
                resultado[ruta]["DIRECCION"] = registro.Calle ;
                resultado[ruta]["LOCALIDAD"] = registro.LugarDestinatario;
                resultado[ruta]["C Real"] = registro.Cubre;
                resultado[ruta]["Pa"] = registro.Pa;
                resultado[ruta]["Cub TEO"] += registro.Cubteo;
                   
                // Aquí deberías agregar lógica para calcular SCAN, FALTA, Cub TEO, C Real, Pa
            });
            
            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);
            
            return arrayResultado;
        },
/****** Fin: Obtiene los datos de la Base local agrupa x Ruta y arma  la tabla de avance  */        

        _checkNetworkStatus: function () {
            if (navigator.onLine) {
                MessageToast.show("Conexión a internet disponible.");
            } else {
                MessageToast.show("No hay conexión a internet.");
            }
        },

        _updateNetworkStatus: function () {
            this._checkNetworkStatus();
        },

/******  Borrar la entrada */   

        onClearEanInput:function(){
            var oModel = this.getView().getModel();
            var cantidad = this.getView().byId("txtCantidad");
            var sRuta = this.getView().byId("txtRuta");
            var descripcion = this.getView().byId("lDescripcion");
            var Ean = this.getView().byId("eanInput");
            var ci = this.getView().byId("edtCI");
            oModel.setProperty("/ruta", 0);
            oModel.setProperty("/cantidad", 0);               
            oModel.setProperty("/ean", '');
            oModel.setProperty("/id", 0);
            oModel.setProperty("/isArrowVisible", false);
            
            // Actualiza la pantalla
            cantidad.setText('');
            sRuta.setText('');
            descripcion.setText('');
            Ean.setValue('');
            ci.setText('');
        },
        

/****** Inicio: Arranca proceso de  escaneo  ********************************************/

        onStartPress:function (){

            var oModel = this.getView().getModel();
            oModel.setProperty("/isStarted", true);
            var Input = this.getView().byId("eanInput");              
            setTimeout(function() {
                Input.focus();
            }, 0);
            ctx=this.getView();
            document.body.addEventListener('click', function(event) {
            // Manejar el evento clic del cuerpo de la página
            var eanInput = ctx.byId("eanInput"); 
            eanInput.focus();
            
            });

        },
/**    Se dispara con el ENTER luego del EAN */
        onEanInputSubmit: function (oEvent) {
            // Detectar cuando se presiona Enter en el input del EAN
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            // Ejecutar la función deseada
            this.handleEanEnter(sValue);
        },
        handleEanEnter: async function (sValue) {
          // Lógica a ejecutar cuando se presiona Enter en el input del EAN
          // var cantidad = this.getView().byId("txtCantidad");
           ctx=this;
            // Lógica a ejecutar cuando se presiona Enter en el input del EAN
           var cantidad = this.getView().byId("txtCantidad");
           var sRuta = this.getView().byId("txtRuta");
           var descripcion = this.getView().byId("lDescripcion");
           var Ean = this.getView().byId("eanInput");
           var ci = this.getView().byId("edtCI");
           var oModel = this.getView().getModel();
           var cantidadYRuta;
           if (oModel.getProperty("/ruta")==0){
                // Entra un codigo y el modelo esta vacio
                try {
                    /** vemos si el EAN es un producto */ 
                    cantidadYRuta = await this.obtenerCantidadYRuta(sValue,1);                
                    if (cantidadYRuta.cantidad > 0 ){
                        console.log("es un producto");
                        // Actualiza el modelo
                        oModel.setProperty("/ruta", cantidadYRuta.ruta);
                        oModel.setProperty("/cantidad", cantidadYRuta.cantidad);               
                        oModel.setProperty("/ean", sValue);
                        oModel.setProperty("/id", cantidadYRuta.id);
                        oModel.setProperty("/AdicChar2", cantidadYRuta.AdicChar2);
                         // Actualiza la pantalla
                        cantidad.setText(cantidadYRuta.cantidad);
                        sRuta.setText(cantidadYRuta.ruta);
                        descripcion.setText(cantidadYRuta.descripcion);
                        Ean.setValue(cantidadYRuta.ean);
                        ci.setText(cantidadYRuta.ci);

                    }
                    else {
                        cantidadYRuta = await this.obtenerCantidadYRuta(sValue,2); // no es unproducto verifica si es un CI
                        if (cantidadYRuta.cantidad > 0 ){
                            // Actualiza el modelo
                            console.log("es un ci");
                            oModel.setProperty("/ruta", cantidadYRuta.ruta);
                            oModel.setProperty("/cantidad", cantidadYRuta.cantidad);               
                            oModel.setProperty("/ean", cantidadYRuta.ean);
                            oModel.setProperty("/id", cantidadYRuta.id);
                            oModel.setProperty("/ci", cantidadYRuta.ci);
                            // Actualiza la pantalla
                            cantidad.setText(cantidadYRuta.cantidad);
                            sRuta.setText(cantidadYRuta.ruta);
                            descripcion.setText(cantidadYRuta.descripcion);
                            Ean.setValue(cantidadYRuta.ean);
                            ci.setText(cantidadYRuta.ci);
                        }
                        else{ // no es ni producto ni CI, comprobar si es un codigo de confirmacion                           
                            if(cantidadYRuta.cantidad==-2){
                                console.log(" Error: Producto sobrante");
                                MessageBox.error("ERROR. este producto no puede asignarse a ninguna ruta. Producto sobrante", {
                                    title: "Error ",
                                    styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                                    onClose: function () {
                                        console.log("Mensaje de error personalizado cerrado.");
                                    }
                                });       
                              
                            }
                            else if (cantidadYRuta.cantidad==-1){
                               console.log(" Error no se conoce el valor ingresado"); 
                               MessageBox.error("ERROR. No se pudo determinar el valor ingresado", {
                                title: "Error ",
                                styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                                onClose: function () {
                                    console.log("Mensaje de error personalizado cerrado.");
                                }
                            });

                            }                            
                        }

                    }
                } catch (error) {
                    console.error("Error al obtener la cantidad y la ruta:", error);               
                }
            }
            else{// entro un codigo y el modelo no esta vacio, tiene que entrar un codigo de confirmacion
                var ruta = this._findRouteByEAN(sValue);
                if (ruta){
                    console.log("es una confirmacion")
                    // es la confirmacion al ciclo actual
                    // resetea valores para iniciar el nuevo ciclo  
                    var scant= oModel.getProperty("/cantidad");
                    if (ruta ==oModel.getProperty("/ruta"))  {                   
                        oModel.setProperty("/ruta", 0);                         
                        oModel.setProperty("/cantidad", 0);                               
                        oModel.setProperty("/ean", "");
                        oModel.setProperty("/ci", "");
                        oModel.setProperty("/descripcion", "");                        
                        //actualiza el estado 
                     var request = indexedDB.open("ventilado", 5);  
                          
                        var id=  oModel.getProperty("/id");  

                        request.onsuccess = function(event) {
                            var db = event.target.result;
                            ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
                            // Llamar a la función para actualizar el campo 'Estado'
                            // Incrementar y asignar el nuevo valor de AdicChar2
                            maxAdicChar2 = maxAdicChar2+1; 
                            ctx.actualizarEstado(db, id, "Completo",scant,String(maxAdicChar2), ctx.getFormattedDateTime());
                        };
                        oModel.setProperty("/id", 0);                               
                        cantidad.setText("");
                        sRuta.setText("");
                        descripcion.setText("");
                        Ean.setValue("");
                        ci.setText(""); 
                        // Actualizar tableData
                       var tableData = oModel.getProperty("/tableData");
                       // Buscar el registro correspondiente en tableData
                       tableData.forEach(function (registro) {
                           if (registro.Ruta === ruta) {                        
                            registro.SCAN = Number(registro.SCAN) || 0;
                               registro.SCAN += Number(scant);
                               registro.FALTA = registro.FALTA - Number(scant);
                           }
                       });
                       var totalScan = oModel.getProperty("/totalScan");
                       totalScan = totalScan + Number(scant);
                       var totalFalta = oModel.getProperty("/totalFalta");
                       totalFalta = totalFalta - Number(scant);

                        // Establecer el array actualizado en el modelo
                       oModel.setProperty("/tableData", tableData);
                       oModel.setProperty("/totalScan", totalScan);
                       oModel.setProperty("/totalFalta", totalFalta);
                    }
                    
                    else{
                        //MessageBox.warning("Error : Esta confirmando en una ruta equivocada, tiene que hacelo en la ruta"+ oModel.getProperty("/ruta"));
                        MessageBox.error("Error : Esta confirmando en una ruta equivocada, tiene que hacelo en la ruta "+ oModel.getProperty("/ruta"), {
                            title: "Error ",
                            styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                            onClose: function () {
                                console.log("Mensaje de error personalizado cerrado.");
                            }
                        });
                    } 
                }
                else{  
                    MessageBox.error("Error : Tiene que ingresar un codigo de confirmacion de ruta", {
                        title: "Error ",
                        styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                        onClose: function () {
                            console.log("Mensaje de error personalizado cerrado.");
                        }
                    });               
                }
            }
            var oModel = this.getView().getModel();
            oModel.setProperty("/isArrowVisible", true);
            var descripcion = this.getView().byId("lDescripcion");
            MessageToast.show("Valor ingresado: " + sValue);
 
        },  
              
    
       /***    /** Encuentra la ruta a partir del EAN  */
       _findRouteByEAN: function(ean) {
        var oLocalModel = this.getView().getModel();
        var aCodConfirmacionData = oLocalModel.getProperty("/codConfirmacionData");
    
        // Buscar el EAN en el array de datos
        var foundItem = aCodConfirmacionData.find(function(item) {
            return item.Ean === ean;
        });
    
        if (foundItem) {
            return foundItem.Ruta;
        } else {
            console.log("EAN no encontrado.");
            return null;
        }
    },

    /** Lee del backend los codigos EAN de las rutas y los pasa a un array local */
    _fetchCodConfirmacionData: function() {
        var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
        
        oModel.read("/CodConfirmacionSet", {
            success: function (oData) {
               // var oLocalModel = this.getView().getModel("localModel");
                var oLocalModel = this.getView().getModel();
                // Verificar si oData.results es un array
                if (Array.isArray(oData.results)) {
                    // Si es un array, guardar todos los items en el modelo local
                    oLocalModel.setProperty("/codConfirmacionData", oData.results);// guarda los codigos en el modelo local
                } else {
                    // Si no es un array, manejar el único item directamente
                    var item = oData.results;
                    oLocalModel.setProperty("/codConfirmacionData", [item]);// guarda los codigos en el modelo local
                }
                console.log("Datos copiados con éxito.");
            }.bind(this),
            error: function (oError) {
                console.error("Error al leer datos del servicio OData:", oError);
            }
        });
    },

        actualizarEstado: function (db, id, nuevoEstado, cant ,AdicChar2,fechaHora) {
            ctx=this;
            var transaction = db.transaction(["ventilado"], "readwrite");
            var objectStore = transaction.objectStore("ventilado");
   
            var getRequest = objectStore.get(id);// consulta la base x el registro que tiene el id pasado
        
            getRequest.onsuccess = function(event) {
                var data = event.target.result;// recupera el registro
                if (data) {
                    // Actualizar el campo 'Estado'
                    data.Estado = nuevoEstado;   
                    data.CantEscaneada = cant; 
                    data.AdicChar2 =  AdicChar2;  
                    data.AdicDec2 =  fechaHora;
                    data.Preparador =  sUsuario;
                    data.AdicDec1 =  sPuesto;
                    // Guardar el registro actualizado
                    var updateRequest = objectStore.put(data);        
                    updateRequest.onsuccess = function(event) { // si se guardo satisfactoriamente vengo x aca
                        console.log("El campo 'Estado' ha sido actualizado exitosamente.");
                        // Verificar que el campo 'Estado' ha sido actualizado correctamente
                        var verifyRequest = objectStore.get(id);
                        verifyRequest.onsuccess = function(event) {
                            var updatedData = event.target.result;
                            console.log("Valor actualizado del campo 'Estado':", updatedData.Estado);
                   
                            ctx.oActualizarBackEnd(id, nuevoEstado, cant, AdicChar2,fechaHora ,sUsuario,sPuesto);
                        };
                        verifyRequest.onerror = function(event) { // si hay un error al guardar el dato , voy x aca
                            console.log("Error al verificar el campo 'Estado':", event.target.error);
                        };
                    };
        
                    updateRequest.onerror = function(event) {// si hay error al recuperar el registro voy x aca
                        console.log("Error al actualizar el campo 'Estado':", event.target.error);
                    };
                } else {// si no se encuentra el registro voy x aca
                    console.log("No se encontró ningún registro con el Id proporcionado.");
                }
            };
        
           
        },
        oActualizarBackEnd:function(id, estado, cantidad ,AdicChar2,fechaHora,sUsuario,sPuesto){
            var updatedData =[{ "Id": id, "Estado": estado, "CantEscaneada": cantidad ,"AdicChar2": AdicChar2,"AdicDec2": fechaHora,"Preparador": sUsuario,"AdicDec1": sPuesto}] ;
            this.crud("ACTUALIZAR", "ventilado",id, updatedData, "");

        },

        //   Aca se hacen los calculos para mostrar los numeros GRANDES de la pantalla
        obtenerCantidadYRuta: async function(eanInput, busqueda) {
           
            try {
                var datos = await this.onGetData(eanInput , busqueda ); // Realiza una sola lectura de la tabla
                return { cantidad: datos.Cantidad, ruta: datos.Ruta, descripcion: datos.descripcion , id: datos.id, ean: datos.ean, ci: datos.ci, AdicChar2: datos.AdicChar2}; // Devuelve un objeto con la cantidad y la ruta
            } catch (error) {
               // console.error("Error al obtener la cantidad y la ruta:", error);
                return { cantidad: -3, ruta: -1 , descripcion:""}; // o cualquier otro valor predeterminado si lo prefieres
            }
        },


//********* fin escaneo **************************/
//******* Abre pagina de ventilado- Cierre */
onCierrePress:function(){

},
//*******  Funcion para descargar las etiquetas  ****** */ 
        onGeneratePDF: function () {


            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {
                useBatch: false  // Deshabilitar batch requests, actualizo de a un registro.
            });
            //Se envian los datos para las etiquetas

            ctx=this.getView(); //guardo el contexto        
                   
            var sServiceURL = oModel.sServiceUrl;
            var sSource = sServiceURL + "/sFormSet(Fname='"+ sReparto +"')/$value";
            // Crear y abrir el PDFViewer
            var opdfViewer = new sap.m.PDFViewer();
            ctx.addDependent(opdfViewer);
            opdfViewer.setSource(sSource);
            opdfViewer.setTitle("Etiquetas del Reparto");
            opdfViewer.open();  


        },
        onGeneratePDF_back: function () {

            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {
                useBatch: false  // Deshabilitar batch requests, actualizo de a un registro.
            });
            //Se envian los datos para las etiquetas

            var oData = {
                "Dni": 1,
                "Nombre": "value2",
                "Apellido":"erere",
            };
            ctx=this.getView(); //guardo el contexto
            oModel.create("/zpruebaSet", oData, {
                success: function(oData, response) {
                    // Después de que se cree la entidad con éxito, genera la URL para el PDF
                 var sServiceURL = oModel.sServiceUrl;
                    //var sSource = sServiceURL + "/sFormSet(Fname='ZETIQUETAS')/$value";
                    var sSource = sServiceURL + "/sFormSet(Fname='"+sTransporte+"')/$value";
                   // Fname='" + sFname + "',FnameNew ='" + sTransporte + "'
                    // Crear y abrir el PDFViewer
                    var opdfViewer = new sap.m.PDFViewer();
                    ctx.addDependent(opdfViewer);
                    opdfViewer.setSource(sSource);
                    opdfViewer.setTitle("Etiquetas del Reparto");
                    opdfViewer.open();  
                }.bind(this),
                error: function(oError) {
                    sap.m.MessageToast.show("Error al enviar datos al backend");
                }
            });

        },

  
        
//********* */ fin  descarga de etiquetas   ********/
      onOpenTransport: function () {
            var oViewModel = this.getView().getModel();
            oViewModel.setProperty("/showPasswordInput", true);
        },
        onPasswordSubmit: function () {
            var oViewModel = this.getView().getModel();
            var sPassword = this.getView().byId("password").getValue();
            if (sPassword === "12345") {  // Reemplazar con la lógica real de validación
                /////
                var aData =oViewModel.setProperty("/tableData2");
                console.log("Updated Data: ", oViewModel.getProperty("/tableData"));
                var request = indexedDB.open("ventilado", 5);  
               // var id=  oViewModel.getProperty("/id");                         
                request.onsuccess = function(event) {
                    var db = event.target.result;
                    ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
                    // Iterar sobre cada elemento de tableData y actualizar en IndexedDB
                    aData.forEach(function(item) {
                        /*var indice = item.Ruta; // Usar el campo 'Ruta' como índice
                        var nuevoCubR = Number(item["C Real"]); // Campo 'C Cub'
                        var nuevoValorPa = Number(item["Pa"]); // Campo 'Pa'*/
                       
                        // Llamar a la función para actualizar  estado del transporte
                        ctx.actualizarCantCubReales(db, indice, nuevoCubR, nuevoValorPa, "");
                        ctx.byId("dialogoStop").close(); 
                        var oModel = ctx.getView().getModel();
                        oViewModel.setProperty("/estadoDelTransporte", "");
                        oViewModel.setProperty("/isClosed", true);
                        oViewModel.setProperty("/showPasswordInput", false);
                        oViewModel.setProperty("/printEtiquetas", true);
                    });
                    
                };  


                /////
               
                oViewModel.setProperty("/isClosed", false);
                oViewModel.setProperty("/showPasswordInput", false);
                MessageToast.show("Transporte abierto con éxito.");
            } else {
                
                MessageBox.error("Error :Contraseña incorrecta. Por favor, inténtelo de nuevo.", {
                    title: "Error ",
                    styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                    onClose: function () {
                        console.log("Mensaje de error personalizado cerrado.");
                    }
                });            
            }
        },

        // Método para abrir el diálogo del código interno
        onOpenCodeInputDialog: function() {
           
           //Cargamos el Dialogo
            var oView = this.getView();            
            if (!this.byId("dialogoCI")) {
             // load asynchronous XML fragment
             Fragment.load({
              id: oView.getId(),
              name: "ventilado.ventilado.view.CodeInputDialog",// todo el camino incluido el nombre del XML
              controller: this
            }).then(function (oDialog) {
            // connect dialog to the root view 
            //of this component (models, lifecycle)
                oView.addDependent(oDialog);
                oDialog.open();
               });
             } else {
                 this.byId("dialogoCI").open();
                  }
        },
             
        // Método para manejar la confirmación del valor ingresado en el diálogo del código interno
        onCodeInputConfirm: async function() {
            var codeInput = this.byId("codeInput");
            var inputValue = codeInput.getValue();

            // Transferir el valor ingresado al campo de entrada principal
            var mainInput = this.getView().byId("edtCI");
            mainInput.setText(inputValue);
            //Buscar en la base de datos

            this.byId("dialogoCI").close();
//  buscar  el EAN del codigo interno ingresado y poner el valor de EAN en el eanInput
            var datos = await this.onGetData2(inputValue);
            var eanInput = this.byId("eanInput");
            eanInput.setValue(datos.ean);// Muestra valor de EAN recuperado
           // Llamar a la función handleEanEnter
           this.handleEanEnter(datos.ean);
     
        },

        // Método para manejar el evento afterClose del diálogo
        onCodeInputDialogClose: function(oEvent) {
                // Limpiar el campo de entrada del diálogo
                var codeInput = this.byId("codeInput");
                codeInput.setValue("");
                // Devolver el foco al input del EAN
                var eanInput = this.byId("eanInput");
                eanInput.focus();
            
        },

         onPessParcialDialog:function(){
             //Cargamos el Dialogo
             var oView = this.getView();            
             if (!this.byId("parcial")) {
              // load asynchronous XML fragment
              Fragment.load({
               id: oView.getId(),
               name: "ventilado.ventilado.view.ParcialDialog",
               controller: this
             }).then(function (oDialog) {
             // connect dialog to the root view 
             //of this component (models, lifecycle)
                 oView.addDependent(oDialog);
                 oDialog.open();
                });
              } else {
                  this.byId("dialogoParcial").open();
                   }

        },
      
       // Método para manejar la confirmación del valor ingresado en el diálogo del código interno
        onParcialConfirm: function() {
            var parcial = this.byId("parcial");
            var inputValue = parcial.getValue();

            // Transferir el valor ingresado  a la logica

            this.byId("dialogoParcial").close();            
    
        },

        // Método para manejar el evento afterClose del diálogo
        onParcialDialogClose: function(oEvent) {
                // Limpiar el campo de entrada del diálogo
                var parcial = this.byId("parcial");
                parcial.setValue("");
                // Devolver el foco al input del EAN
                var eanInput = this.byId("eanInput");
                eanInput.focus();
            
        },  
        
         // Método para abrir el diálogo Stop
         onStopDialog: function() {
           ctx=this;
           //Vemos el estado del  Transporte 
           var oModel= this.getView().getModel();
                //Cargamos el Dialogo  
                var oView = this.getView();            
                if (!this.byId("dialogoStop")) {
                // load asynchronous XML fragment
                Fragment.load({
                id: oView.getId(),
                name: "ventilado.ventilado.view.StopDialog",
                controller: this
                }).then(function (oDialog) {
                // connect dialog to the root view 
                //of this component (models, lifecycle)
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
                } else {
                    this.byId("dialogoStop").open();
                    }
     
         },
          // Método para manejar la confirmación del valor ingresado en el diálogo Stop
        onStopConfirm: function() {

            var oTable = this.byId("customTable2");
            var aItems = oTable.getItems();
            var oModel = this.getView().getModel();
            var aData = oModel.getProperty("/tableData");
            var bValid = true;
            aItems.forEach(function(oItem, index) {
                var oCells = oItem.getCells();
                // Verificar que al menos uno de los valores sea mayor a cero ( cubetas reales o pallets)
                if (oCells[7].getValue() <= 0 && oCells[8].getValue() <= 0) {
                    bValid = false;
                }

                aData[index]["C Real"] = oCells[7].getValue();
                aData[index]["Pa"] = oCells[8].getValue();
            });
            if (bValid){
                oModel.setProperty("/tableData", aData);
                console.log("Updated Data: ", oModel.getProperty("/tableData"));
                var request = indexedDB.open("ventilado", 5);  
                var id=  oModel.getProperty("/id");                         
                request.onsuccess = function(event) {
                    var db = event.target.result;
                    ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
                    // Iterar sobre cada elemento de tableData y actualizar en IndexedDB
                    aData.forEach(function(item) {
                        var indice = item.Ruta; // Usar el campo 'Ruta' como índice
                        var nuevoCubR = Number(item["C Real"]); // Campo 'C Cub'
                        var nuevoValorPa = Number(item["Pa"]); // Campo 'Pa'
                       
                        // Llamar a la función para actualizar el campo 'CubR y Pa' y el estado del transporte
                        ctx.actualizarCantCubReales(db, indice, nuevoCubR, nuevoValorPa, "CERRADO");
                        ctx.byId("dialogoStop").close(); 
                        var oModel = ctx.getView().getModel();
                        oModel.setProperty("/estadoDelTransporte", "CERRADO");
                        oModel.setProperty("/isClosed", true);
                        oModel.setProperty("/showPasswordInput", false);
                        oModel.setProperty("/printEtiquetas", true);
                    });
                    
                };  

            }
            else {
                MessageBox.error("Los campos 'C Real' y 'Pa' no pueden ser ambos cero. Por favor, introduce valores válidos.", {
                    title: "Error ",
                    styleClass: "customMessageBox", // Aplica la clase CSS personalizada
                    onClose: function () {
                        console.log("Mensaje de error personalizado cerrado.");
                    }
                });       
            } 
            
        },

        actualizarCantCubReales: function (db, indice, nuevoCubR,nuevoValorPa, estado) {
            ctx=this;
            var transaction = db.transaction(["ventilado"], "readwrite");
            var objectStore = transaction.objectStore("ventilado");
            var index = objectStore.index("LugarPDisp");
            var lugar_p_disp = indice; // Reemplaza esto con el valor que estás buscando
        
            index.openCursor(IDBKeyRange.only(lugar_p_disp)).onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    var record = cursor.value;                    
                    // Actualizar los campos Cubre y Pa con los nuevos valores
                    record.Cubre = nuevoCubR;
                    record.Pa = nuevoValorPa;
                    record.AdicChar1= estado;
                    var id = record.Id;
                    // Actualizar el registro en el object store
                    var updateRequest = cursor.update(record);
                    updateRequest.onsuccess = function() {
                        console.log("Registro actualizado:", record);
                        var updatedData =[{ "Id": id, "Cubre": nuevoCubR, "Pa": nuevoValorPa , "AdicChar1":estado}] ;
                        ctx.crud("ACTUALIZAR", "ventilado",id, updatedData, "");
                        
                    };
                    updateRequest.onerror = function(event) {
                        console.error("Error al actualizar el registro:", event.target.errorCode);
                    };
        
                    cursor.continue(); // Continuar buscando más registros
                } else {
                    console.log("No more records found or no records found");
                }
            };
        
            transaction.oncomplete = function() {
                console.log("Transacción completada.");
            };
        
            transaction.onerror = function(event) {
                console.error("Error en la transacción:", event.target.errorCode);
            };     
           
        },
        // Método para manejar el evento afterClose del diálogo
        onStopDialogClose: function(oEvent) {
            // Limpiar el campo de entrada del diálogo
         //   var parcial = this.byId("stopInput");
          //  parcial.setValue("");
            // Devolver el foco al input del EAN
           // var eanInput = this.byId("eanInput");
           // eanInput.focus();
        },

/******  Llamada ejemplo al CRUD  ****************
        
        onCrudCrear: function() {
            var createData = [
                { "Dni": 2, "Nombre": "Nombre2", "Apellido": "Apellido2" },
                { "Dni": 3, "Nombre": "Nombre3", "Apellido": "Apellido3" }
            ];
            this.crud("CREAR", "zprueba", createData, "");
        },
        onCrudUpdate: function() {
            var updatedData =[{ "Dni": 14, "Nombre": "NombAct10", "Apellido": "ApelliAo" },
                              { "Dni": 15, "Nombre": "NombAct11", "Apellido": "ApelliAct" }
            ] ;
            this.crud("ACTUALIZAR", "zprueba", updatedData, "");
        },         

        onCrudRead: function() {
            this.crud("READ", "ventilado", "", "");
           
        },
        onCrudBorrar: function() {

           // this.crud("BORRAR", "zprueba", "", "");
           this.crud("FI", "zprueba", "", "");
        },
*/

//*******  Inicio  Funciones para el CRUD del oData *******/  
        crud: function(operacion , tabla,id, oValor1, oValor2 ){
            var ctx = this; 
            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {                
                useBatch: false,
                defaultBindingMode: "TwoWay",
                deferredGroups: ["batchGroup1"]
            });
            oModel.refreshMetadata();
            var sEntitySet  = "/" + tabla + "Set"
            
            if (operacion == "READ"  ){

            // Configurar los filtros
           var aFilters = [];

            aFilters.push(new Filter("Transporte", FilterOperator.EQ, oValor1));
            aFilters.push(new Filter("Entrega", FilterOperator.EQ, oValor2));

            // Hacer la llamada OData
         
            oModel.read(sEntitySet, {    
                filters: aFilters,
                success: function (oData) {
                    // Manejar datos exitosamente
                    console.log(oData);
                },
                error: function (oError) {
                    // Manejar errores
                    console.error(oError);
                }
            });

            }
            else if (operacion == 'FI'){
                var sTransporte = sReparto;//"0000001060";
                var sPtoPlanificacion = sPtoPlanif;//"1700";
                oModel.callFunction("/GenerarTransporte", {
                    method: "GET",
                    urlParameters: {
                      transporte: sTransporte, // Pass parameters directly as strings
                      pto_planificacion: sPtoPlanificacion
                    },
                    success: function (oData) {
                      // Manejar éxito
                      MessageToast.show("Se cargaron los datos para el ventilado");
                      // Procesar la respuesta aquí
                        var transporte = oData.Transporte;
                        var entrega = oData.Entrega;
                        var pto_planificacion = oData.Pto_planificacion;
                        var estado = oData.Ean;

                        // Aquí puedes trabajar con los datos recibidos
                        console.log("Transporte: ", transporte);
                        console.log("Pto Entrega: ", pto_planificacion); 
                        console.log("Entrega: ", entrega);
                        console.log("Estado: ", estado);  

                        ctx.crud("READ", "ventilado", transporte, "1700");// se leen los datos del transporte 
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
            }

            else if(operacion == "CREAR")  {

                var createRecord = function(oEntry, onSuccess, onError) {
                    var sEntitySet  = "/" + tabla + "Set"
                    oModel.create(sEntitySet, oEntry, {
                        success: function () {
                        //    MessageToast.show("Registro " + oEntry.Dni + " creado con éxito.");
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show("Error al crear el registro " + oEntry.Dni);
                            console.error(oError);
                            if (onError) onError(oError);
                        }
                    });
                };
            
                var createNext = function(index) {
                    if (index < oValor1.length) {
                        createRecord(oValor1[index], function() {
                            createNext(index + 1);
                        });
                    } else {
                        MessageToast.show("Todos los registros se han creado con éxito.");
            
                    }
                }.bind(this);
            
                createNext(0);
            }
            else if(operacion == "ACTUALIZAR" ) {
             // Definir la función updateRecord

                var updateRecord = function(oEntry, onSuccess, onError) {
                    // La ruta debe estar construida correctamente según el modelo y los datos
                    var sEntitySet  = "/" + tabla + "Set"
                    var sPath = sEntitySet+"(" + oEntry.Id + ")";  // Ajusta esta ruta según tu modelo OData
                    oModel.update(sPath, oEntry, {
                        success: function () {
                            MessageToast.show("Registro " + oEntry.Id + " actualizado con éxito.");
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show("Error al actualizar el registro " + oEntry.Dni);
                            console.error(oError);
                            if (onError) onError(oError);
                        }
                    });
                };

                // Función para actualizar los registros secuencialmente
                var updateRecords = function(aData) {
                    var updateNext = function(index) {
                        if (index < aData.length) {
                            updateRecord(aData[index], function() {
                                updateNext(index + 1);
                            });
                        } else {
                            MessageToast.show("Todos los registros se han actualizado con éxito.");
                        }
                    }.bind(this);
                    updateNext(0);
                };
                updateRecords(oValor1);

            }            
            
        
            else if(operacion == "BORRAR" ) {
                // Define la función de éxito
                var onSuccessFunction = function() {
                    console.log("Operación exitosa");
                };

                // Define la función de error
                var onErrorFunction = function(error) {
                    console.error("Error:", error);
                };

                // Define la función deleteRecord
                var deleteRecord = function(dni, onSuccess, onError, additionalParameter) {
                    var sPath = "/zpruebaSet(" + id + ")";
                    oModel.remove(sPath, {
                        success: function () {
                            MessageToast.show("Registro " + id + " eliminado con éxito.");
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show("Error al eliminar el registro " + dni);
                            console.error(oError);
                            if (onError) onError(oError);
                        }
                    });
                
                    // Ejemplo de uso del parámetro adicional
                    console.log("Additional Parameter:", additionalParameter);
                };
                // Ejemplo de uso:
var dniToDelete = 3;
deleteRecord(dniToDelete, onSuccessFunction, onErrorFunction, "additionalParameter");
 
            }
        },

//******* Fin  Funciones para el CRUD  *******/   
     


_fetchAndStoreOData: function () {
    var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
    //Se leen los datos del backend y se guardan en la base local
    oModel.read("/ventiladoSet", {       
        success: function (oData) {
            var transaction = this.db.transaction(["ventilado"], "readwrite");
            var objectStore = transaction.objectStore("ventilado");

            oData.results.forEach(function (item) {
                objectStore.put(item);
            });

            console.log("Datos copiados con éxito.");
        }.bind(this),
        error: function (oError) {
            console.error("Error al leer datos del servicio OData:", oError);
        }
    });
},


onGetData: function (key,busqueda) { // busqueda =1 busca si es un producto 
                                     // busqueda =2 busca si es un codigo interno
    ctx = this;
    var result;
    var sKey = key;
    var flag = 0;
    return new Promise(function(resolve, reject) {
        var index;
        var request = indexedDB.open("ventilado", 5); // Asegúrate de usar la misma versión

        request.onsuccess = function(event) {
            var db = event.target.result;
            ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
            var transaction = db.transaction(["ventilado"], "readonly");
            var objectStore = transaction.objectStore("ventilado");
            if (busqueda == 1){
                // Verificar si el índice "Ean" existe          
                    if (!objectStore.indexNames.contains("Ean")) {
                        console.error("El índice 'Ean' no se encontró.");
                        return;
                    }
                    index = objectStore.index("Ean");
            }
            else{
                // Verificar si el índice "CodigoInterno" existe          
                if (!objectStore.indexNames.contains("CodigoInterno")) {
                    console.error("El índice 'CodigoInterno' no se encontró.");
                    return;
                }
                index = objectStore.index("CodigoInterno");
            }           
            var cursorRequest = index.openCursor(IDBKeyRange.only(sKey));           
            cursorRequest.onsuccess = function(event) {           
                var cursor = event.target.result;
                if (cursor) {
                    
                    var data = cursor.value;
                    if (data.Estado != "Completo") { // busca una linea que no este procesada
                        console.log("Registro encontrado:", data);
                        // Aquí se puede manejar el registro encontrado
                        // Accediendo a cada campo del registro
                        var id = data.Id;
                        var descripcion = data.Descricion;
                        var cantidad = data.CantidadEntrega;//aca va la cantidad
                        var ean = data.Ean;
                        var ci = data.CodigoInterno;
                        var AdicChar2=data.AdicChar2;
                        var ruta = data.LugarPDisp;// esta es la ruta
                            result = {
                            Cantidad    : cantidad, 
                            Ruta        : ruta,
                            descripcion : descripcion,
                            id          : id,
                            ean         : ean,
                            ci          : ci,
                            AdicChar2   : AdicChar2
                        };
                        flag=2;
                       
                      resolve(result); // Resuelve la promesa con un objeto que contiene los valores de cantidad y Ruta
                    
                    } else {
                        // Continuar con el siguiente registro
                        flag=1;
                        cursor.continue();
                        return;
                    }   
                } 
                if (flag<2){
                    if (flag==1 && (busqueda==1 || busqueda==2)){
                        // console.log("Es un producto pero sobra");                    
                            result = {
                                Cantidad: -2, 
                                Ruta: 0,
                                descripcion:"",
                                id :0
                            };
                            resolve(result); 
                    }
                    else if (flag==0 && busqueda==1 ){
                        // console.log("No Es un producto ");
                            result = {
                                Cantidad: -1, 
                                Ruta: 0,
                                descripcion:"",
                                id :0

                            };
                            resolve(result); 
                    }
                    else if (flag==0 && busqueda==2 ){
                        // console.log("No Es un producto ");
                            result = {
                                Cantidad: -1, 
                                Ruta: 0,
                                descripcion:"",
                                id :0
                            };
                            resolve(result); 
                        }
                }
               

                
            };
            cursorRequest.onerror = function(event) {
                console.log("Error al buscar el registro:", event.target.error);
            };
        };
        request.onerror = function(event) {
            console.log("Error al abrir la base de datos:", event.target.error);
        };
    }.bind(this));
},




 //***** Método para abrir el diálogo en caso de errores *************/
 onOpenDialog: function(msg1, msg2, msg3) {
           
    //Cargamos el Dialogo
     var oView = this.getView();            
     if (!this.byId("codeDialog")) {
      // load asynchronous XML fragment
      Fragment.load({
       id: oView.getId(),
       name: "ventilado.ventilado.view.CodeDialog",// todo el camino incluido el nombre del XML
       controller: this
     }).then(function (oDialog) {
     // connect dialog to the root view 
     //of this component (models, lifecycle)
         oView.addDependent(oDialog);
         oDialog.open();
        // Accedemos a los labels dentro del VBox
        var aContent = oDialog.getContent()[0].getItems(); // Asumimos que VBox es el primer y único contenido del diálogo

        if (aContent && aContent.length >= 3) {
            aContent[0].setText(msg1); // Primer Label
            aContent[1].setText(msg2); // Segundo Label
            aContent[2].setText(msg3); // Tercer Label
        } 
         
        });
      } else {
            var oDialog =this.byId("codeDialog");
           
            // Accedemos a los labels dentro del VBox
            var aContent = oDialog.getContent()[0].getItems(); // Asumimos que VBox es el primer y único contenido del diálogo

            if (aContent && aContent.length >= 3) {
                aContent[0].setText(msg1); // Primer Label
                aContent[1].setText(msg2); // Segundo Label
                aContent[2].setText(msg3); // Tercer Label
            } 
            oDialog.open();
         
        }
 },
      
 // Método para manejar la confirmación del valor ingresado en el diálogo del código interno
 onCodeConfirm: async function() {
     this.byId("codeDialog").close();
 },

 // Método para manejar el evento afterClose del diálogo
 onCodeInputDialogClose: function(oEvent) {
      
         // Devolver el foco al input del EAN
         var eanInput = this.byId("eanInput");
         eanInput.focus();
     
 },
//////

onDeleteData: function () {
    var transaction = this.db.transaction(["ventilado"], "readwrite");
    var objectStore = transaction.objectStore("ventilado");
    var requestDelete = objectStore.delete("1234567890");

    requestDelete.onsuccess = function (event) {
        console.log("Dato eliminado con éxito.");
    };

    requestDelete.onerror = function (event) {
        console.error("Error al eliminar el dato:", event.target.errorCode);
    };
},
/********* Función general para manejar operaciones CRUD de la BD Local y devolver una promesa *****/
manejarCRUD: function (operacion, datos, campoBusqueda = "id") {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ventilado", 5);
  
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
        if (!db.objectStoreNames.contains("ventilado")) {
          const objectStore = db.createObjectStore("ventilado", { keyPath: "id" });
          objectStore.createIndex("nombre", "nombre", { unique: false });
        }
      };
  
      request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["ventilado"], "readwrite");
        const objectStore = transaction.objectStore("ventilado");
        let req;
  
        switch (operacion) {
          case "crear":
            req = objectStore.add(datos);
            break;
  
          case "leer":
            req = campoBusqueda === "id" ? objectStore.get(datos.id) : objectStore.index(campoBusqueda).get(datos[campoBusqueda]);
            break;
  
          case "actualizar":
            if (campoBusqueda === "id") {
              req = objectStore.put(datos);
            } else {
              const getReq = objectStore.index(campoBusqueda).get(datos[campoBusqueda]);
              getReq.onsuccess = function(event) {
                const item = event.target.result;
                if (item) {
                  Object.assign(item, datos);
                  const updateReq = objectStore.put(item);
                  updateReq.onsuccess = () => resolve(updateReq.result);
                  updateReq.onerror = (event) => reject(new Error(`Error en la operación ${operacion}: ${event.target.error}`));
                } else {
                  reject(new Error("Elemento no encontrado para actualizar"));
                }
              };
              getReq.onerror = (event) => reject(new Error(`Error al buscar para actualizar: ${event.target.error}`));
              return;
            }
            break;
  
          case "eliminar":
            if (campoBusqueda === "id") {
              req = objectStore.delete(datos.id);
            } else {
              const getReq = objectStore.index(campoBusqueda).getKey(datos[campoBusqueda]);
              getReq.onsuccess = function(event) {
                const key = event.target.result;
                if (key !== undefined) {
                  const deleteReq = objectStore.delete(key);
                  deleteReq.onsuccess = () => resolve(deleteReq.result);
                  deleteReq.onerror = (event) => reject(new Error(`Error en la operación ${operacion}: ${event.target.error}`));
                } else {
                  reject(new Error("Elemento no encontrado para eliminar"));
                }
              };
              getReq.onerror = (event) => reject(new Error(`Error al buscar para eliminar: ${event.target.error}`));
              return;
            }
            break;
  
          default:
            reject(new Error("Operación no válida"));
            return;
        }
  
        req.onsuccess = function() {
          resolve(req.result);
        };
  
        req.onerror = function(event) {
          reject(new Error(`Error en la operación ${operacion}: ${event.target.error}`));
        };
      };
  
      request.onerror = function(event) {
        reject(new Error(`Error al abrir la base de datos: ${event.target.error}`));
      };
    });
  },
  
  // Ejemplo de funciones para operaciones CRUD
  crearElemento:async function (datos) {
    try {
      const resultado = await manejarCRUD("crear", datos);
      console.log("Elemento creado con éxito:", resultado);
    } catch (error) {
      console.error("Error al crear el elemento:", error);
    }
  },
  
  leerElemento:async function (campoBusqueda, valorBusqueda) {
    try {
      const resultado = await manejarCRUD("leer", { [campoBusqueda]: valorBusqueda }, campoBusqueda);
      console.log("Elemento leído:", resultado);
    } catch (error) {
      console.error("Error al leer el elemento:", error);
    }
  },
  
  actualizarElemento:async function (campoBusqueda, valorBusqueda, nuevosDatos) {
    try {
      const elemento = await manejarCRUD("leer", { [campoBusqueda]: valorBusqueda }, campoBusqueda);
      if (elemento) {
        Object.assign(elemento, nuevosDatos);
        await manejarCRUD("actualizar", elemento);
        console.log("Elemento actualizado con éxito");
      } else {
        console.log("Elemento no encontrado");
      }
    } catch (error) {
      console.error("Error al actualizar el elemento:", error);
    }
  },
  
  eliminarElemento:async function (campoBusqueda, valorBusqueda) {
    try {
      await manejarCRUD("eliminar", { [campoBusqueda]: valorBusqueda }, campoBusqueda);
      console.log("Elemento eliminado con éxito");
    } catch (error) {
      console.error("Error al eliminar el elemento:", error);
    }
  },
 /* 
  // Ejemplos de uso
  crearElemento({ id: 1, nombre: "Elemento1" });
  leerElemento("id", 1);
  actualizarElemento("nombre", "Elemento1", { nombre: "Elemento1Modificado" });
  eliminarElemento("nombre", "Elemento1Modificado");*/


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
    getFormattedDateTime: function () {
        var oDate = new Date();

        var day = String(oDate.getDate()).padStart(2, '0');
        var month = String(oDate.getMonth() + 1).padStart(2, '0'); // Enero es 0
        var year = String(oDate.getFullYear());

        var hours = String(oDate.getHours()).padStart(2, '0');
        var minutes = String(oDate.getMinutes()).padStart(2, '0');
        var seconds = String(oDate.getSeconds()).padStart(2, '0');

        return day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
    },
  

});

});