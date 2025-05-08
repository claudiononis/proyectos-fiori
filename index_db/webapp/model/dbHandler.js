sap.ui.define([], function () {
    "use strict";
  
    const dbHandler = {
      _dbConnections: [],
      _initializeDbConfig: function (config) {
        this._dbConfig = {
          name: config.name || "miBase",
          version: config.version || 1,
          store: config.store || "miStore",
          keyPath: config.keyPath || "id",
          indices: config.indices || [],
          staticData: config.staticData || []
        };
      },
      _fetchAndStoreOData: function (callback) {
        var ctx = this;
        var request = indexedDB.deleteDatabase(ctx._dbConfig.name);
        request.onerror = function (event) {
          console.error("Error al borrar la base de datos:", event.target.errorCode);
        };
        request.onsuccess = function () {
          var openRequest = indexedDB.open(ctx._dbConfig.name, ctx._dbConfig.version);
          openRequest.onupgradeneeded = function (event) {
            var db = event.target.result;
            var objectStore = db.createObjectStore(ctx._dbConfig.store, { keyPath: ctx._dbConfig.keyPath });
            ctx._dbConfig.indices.forEach(index => objectStore.createIndex(index, index, { unique: false }));
          };
          openRequest.onsuccess = function (event) {
            ctx.db = event.target.result;
            ctx._dbConnections.push(ctx.db);
            var transaction = ctx.db.transaction([ctx._dbConfig.store], "readwrite");
            var objectStore = transaction.objectStore(ctx._dbConfig.store);
            var data = ctx._dbConfig.staticData.slice();
            data.sort(function (a, b) {
              if (a.CodigoInterno === b.CodigoInterno) {
                return parseInt(a.LugarPDisp, 10) - parseInt(b.LugarPDisp, 10);
              }
              return a.CodigoInterno.localeCompare(b.CodigoInterno);
            });
            data.forEach(function (item) {
              item.LugarPDisp = (item.LugarPDisp || '').replace(/^0+/, '');
              objectStore.put(item);
            });
            transaction.oncomplete = function () {
              if (typeof callback === "function") {
                callback();
              }
            };
          };
        };
      },
      readAllData: function (callback) {
        var transaction = this.db.transaction([this._dbConfig.store], "readonly");
        var objectStore = transaction.objectStore(this._dbConfig.store);
        var request = objectStore.getAll();
        request.onsuccess = function (event) {
          callback(event.target.result); // Devolvemos todos los datos
        };
      },

    

    };
  
    return dbHandler;
  });
  