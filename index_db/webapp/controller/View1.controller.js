sap.ui.define(
  ["sap/ui/core/mvc/Controller"],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (Controller) {
    "use strict";

    return Controller.extend("indexdb.controller.View1", {
      onInit: function () {
        const dbHandler = this.getOwnerComponent().dbHandler;
        dbHandler._fetchAndStoreOData(() => {
          dbHandler.readAllData((data) => {
            const oList = this.byId("list");
            data.forEach((item) => {
              oList.addItem(
                new sap.m.StandardListItem({
                  title:
                    item.id +
                    " - " +
                    item.CodigoInterno +
                    " - " +
                    item.LugarPDisp,
                  description: item.OtroCampo,
                })
              );
            });
          });
        });
      },

      onCreate: function () {
        var oInputCodigoInterno = this.byId("inputCodigoInterno");
        var oInputLugarPDisp = this.byId("inputLugarPDisp");
        var oInputOtroCampo = this.byId("inputOtroCampo");

        var newItem = {
          CodigoInterno: oInputCodigoInterno.getValue(),
          LugarPDisp: oInputLugarPDisp.getValue(),
          OtroCampo: oInputOtroCampo.getValue(),
        };

        // Validamos los campos
        if (
          !newItem.CodigoInterno ||
          !newItem.LugarPDisp ||
          !newItem.OtroCampo
        ) {
          sap.m.MessageToast.show("Por favor ingrese todos los campos");
          return;
        }

        var dbHandler = this.getOwnerComponent().dbHandler;
        var transaction = dbHandler.db.transaction(
          [dbHandler._dbConfig.store],
          "readwrite"
        );
        var objectStore = transaction.objectStore(dbHandler._dbConfig.store);

        // Insertamos el nuevo registro
        objectStore.put(newItem);

        transaction.oncomplete = function () {
          sap.m.MessageToast.show("Elemento creado correctamente");
          oInputCodigoInterno.setValue("");
          oInputLugarPDisp.setValue("");
          oInputOtroCampo.setValue("");
          this._refreshList();
        }.bind(this);

        transaction.onerror = function () {
          sap.m.MessageToast.show("Error al crear el elemento");
        };
      },

      onUpdate: function () {
        var oInputId = this.byId("id");
        var oInputCodigoInterno = this.byId("inputCodigoInterno");
        var oInputLugarPDisp = this.byId("inputLugarPDisp");
        var oInputOtroCampo = this.byId("inputOtroCampo");

        var updatedItem = {
          id :  oInputId.getValue(),
          CodigoInterno: oInputCodigoInterno.getValue(),
          LugarPDisp: oInputLugarPDisp.getValue(),
          OtroCampo: oInputOtroCampo.getValue(),
        };

        if (
            !updatedItem.id ||
          !updatedItem.CodigoInterno ||
          !updatedItem.LugarPDisp ||
          !updatedItem.OtroCampo
        ) {
          sap.m.MessageToast.show("Por favor ingrese todos los campos");
          return;
        }

        var dbHandler = this.getOwnerComponent().dbHandler;
        var transaction = dbHandler.db.transaction(
          [dbHandler._dbConfig.store],
          "readwrite"
        );
        var objectStore = transaction.objectStore(dbHandler._dbConfig.store);

        // Suponemos que el ID del registro a actualizar es el que está en el input 'CodigoInterno'
        var request = objectStore.get(parseInt(updatedItem.id));

        request.onsuccess = function (event) {
          var data = event.target.result;
          data.LugarPDisp = updatedItem.LugarPDisp;
          data.OtroCampo = updatedItem.OtroCampo;

          objectStore.put(data);
        };

        transaction.oncomplete = function () {
          sap.m.MessageToast.show("Elemento actualizado correctamente");
          this._refreshList();
        }.bind(this);

        transaction.onerror = function () {
          sap.m.MessageToast.show("Error al actualizar el elemento");
        };
      },

      onDelete: function () {
        var oInputId = this.byId("id");

        var dbHandler = this.getOwnerComponent().dbHandler;
        var transaction = dbHandler.db.transaction(
          [dbHandler._dbConfig.store],
          "readwrite"
        );
        var objectStore = transaction.objectStore(dbHandler._dbConfig.store);

        // Suponemos que el ID del registro a eliminar está en el input 'CodigoInterno'
        var request = objectStore.delete(parseInt(oInputId.getValue()));

        request.onsuccess = function () {
          sap.m.MessageToast.show("Elemento eliminado correctamente");
          this._refreshList();
        }.bind(this);

        request.onerror = function () {
          sap.m.MessageToast.show("Error al eliminar el elemento");
        };
      },
      _refreshList: function () {
        var oList = this.byId("list");
        oList.removeAllItems();

        var dbHandler = this.getOwnerComponent().dbHandler;
        dbHandler.readAllData(function (data) {
          data.forEach(function (item) {
            oList.addItem(
              new sap.m.StandardListItem({
                title: item.CodigoInterno + " - " + item.LugarPDisp,
                description: item.OtroCampo,
              })
            );
          });
        });
      },
    });
  }
);
