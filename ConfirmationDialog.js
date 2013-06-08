define(["dojo/_base/declare", "dijit/Dialog", "dijit/form/Button", "dojo/dom-construct", "dojo/i18n!./nls/resources"],
function(declare, Dialog, Button, domConstruct, i18n) {
    return declare([Dialog], {
        proceedButton : null,
        cancelButton : null,
        
        constructor : function(args) {
            declare.safeMixin(this, args);
            
            this.title = i18n.discardChanges;
        },
        
        postCreate : function() {
            this.inherited(arguments);

            var actionBar = domConstruct.create("div", {
                className : "dijitDialogPaneActionBar"
            }, this.containerNode);
            
            var self = this;
            
            this.proceedButton = new Button({
                label : i18n.yes,
                onClick : function(event) {
                    self.destroy();
                }
            }).placeAt(actionBar);

            this.cancelButton = new Button({
                label : i18n.no,
                onClick : function(event) {
                    self.hide();
                }
            }).placeAt(actionBar);
        },
        
        startup : function() {
            this.inherited(arguments);
            
            this.proceedButton.startup();
            this.cancelButton.startup();
        }
    });
});
