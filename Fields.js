/*
 * Fields.js v0.1
 * AMD module for use with the Dojo Toolkit (dojotoolkit.org)
 * github.com/pags/dojo-fields.js
 * Copyright 2013 Justin Pagano
 */
define(["dojo/_base/declare", "dijit/_WidgetBase", "./Tooltip", "./ConfirmationDialog", "dojo/_base/lang", "dojo/on", "dojo/i18n!FieldsJs/nls/resources", "dojo/dom-construct", "dojo/dom-attr", "dojo/dom-class", "dojo/query", "dojo/NodeList-dom"],
function(declare, _WidgetBase, Tooltip, Dialog, lang, on, i18n, domConstruct, domAttr, domClass, query) {
    var module = declare("FieldsJsForm", [_WidgetBase], {
        options : null,
        fields : null,
        tooltips : null,
        eventHandlers : null,
        unsavedChangesDialog : null,
        unsavedChanges : null,

        constructor : function(options) {
            this.options = lang.mixin(FieldsJsForm.DEFAULTS, options);
            this.fields = {};
            this.tooltips = {};
            this.eventHandlers = [];
            this.unsavedChanges = false;

            this.initialize();
        },

        initialize : function(element) {
            var fieldProcessor = lang.hitch(this, "registerField");

            query("input", this.domNode).forEach(fieldProcessor);
            query("select", this.domNode).forEach(fieldProcessor);
            query("textarea", this.domNode).forEach(fieldProcessor);
        },

        registerField : function(node) {
            var nodeType = domAttr.get(node, "type");
            
            if ("submit" === nodeType) {
                this.own(on(node, "click", lang.hitch(this, "save")));
            } else if ("reset" === nodeType) {
                this.own(on(node, "click", lang.hitch(this, "_clear")));
            } else {
                var fieldName = domAttr.get(node, "name");

                if (fieldName) {
                    var self = this;
                    
                    if ("aggressive" === this.options.validation) {
                        this.own(on(node, "blur", function(event) {
                            self._validateField(this);
                        }));
                    }

                    if ( fieldName in this.fields) {
                        this.fields[fieldName].push(node);
                    } else {
                        this.fields[fieldName] = [node];
                    }
                    
                    this.own(on(node, "change", function(event) {
                        if (!self.initialData) {
                            self.unsavedChanges = true;
                        }
                    }));

                    var labelPosition = this.options.labels,
                    fieldLabel = domAttr.get(node, "data-fieldsjs-label");

                    if (fieldLabel) {
                        var labelHTML = "<label for='" + fieldName + "'>" + fieldLabel + " </label>";
                        
                        switch (labelPosition) {
                            case "top":
                                domClass.add(node, FieldsJsForm.CSS_CLASSES.LABEL_TOP);
                            case "left":
                                domConstruct.place(labelHTML, node, "before");
                                break;
                            case "bottom":
                                domClass.add(node, FieldsJsForm.CSS_CLASSES.LABEL_BOTTOM);
                            case "right":
                                domConstruct.place(labelHTML, node, "after");
                                break;
                        }
                    }

                    if (domAttr.get(node, "required")) {
                        query("label[for='" + fieldName + "']", this.domNode).forEach(function(node) {
                            domConstruct.place(FieldsJsForm.FRAGMENTS.REQUIRED, node, "after");
                        });
                    }
                }
            }
        },
        
        _setFieldValue : function(fieldName, value) {
            var fieldArray = this.fields[fieldName];

            if (fieldArray) {
                var l = fieldArray.length;

                if (l > 1) {
                    for (var i = 0; i < l; i++) {
                        var field = fieldArray[i];

                        domAttr.set(field, "checked", domAttr.get(field, "value") === value);
                    }
                } else {
                    domAttr.set(fieldArray[0], "value", value);
                }
            }
        },

        _getFieldValue : function(fieldName) {
            var fieldArray = this.fields[fieldName],
            fieldValue = null;

            if (fieldArray) {
                var l = fieldArray.length;

                if (l > 1) {
                    for (var i = 0; i < l; i++) {
                        var field = fieldArray[i];

                        if (domAttr.get(field, "checked")) {
                            fieldValue = domAttr.get(field, "value");
                        }
                    }
                } else {
                    fieldValue = domAttr.get(fieldArray[0], "value");
                }
            }

            return fieldValue;
        },

        _clear : function(force, data) {
            if (!force && this.options.promptUnsavedChanges && this._hasUnsavedChanges()) {
                if (!this.unsavedChangesDialog) {
                    var self = this,
                    data = this.data;
                    
                    this.unsavedChangesDialog = new Dialog();
                    
                    this.eventHandlers.push(on(this.unsavedChangesDialog.proceedButton, "click", function(event) {
                        self._clear(true);
                        
                        if (data) {
                            self.populate(data);
                        }
                    }));
                }
                
                this.unsavedChangesDialog.show();

                return false;
            } else {
                query("." + FieldsJsForm.CSS_CLASSES.VALIDATION_FAILURE, this.domNode).removeClass(FieldsJsForm.CSS_CLASSES.VALIDATION_FAILURE);
                
                for (var i = 0, l = this.eventHandlers.length; i < l; i++) {
                    this.eventHandlers[i].remove();
                }
                
                for (var name in this.tooltips) {
                    var tooltip = this.tooltips[name];
                    
                    tooltip.destroy();
                    delete tooltips[name];
                }
                
                if (this.unsavedChangesDialog) {
                    this.unsavedChangesDialog = null;
                }

                for (var fieldName in this.fields) {
                    this._setFieldValue(fieldName, null);
                }

                this.initialData = null;
                this.unsavedChanges = false;

                return true;
            }
        },

        _validateField : function(field, initial) {
            var value = this._getFieldValue(domAttr.get(field, "name")),
            valid = true,
            title = null;

            if (!value) {
                if (domAttr.get(field, "required")) {
                    valid = false;
                    title = i18n.validationRequired;
                }
            } else {
                var maxLength = domAttr.get(field, "maxlength");
                
                if (maxLength && value.length > maxLength) {
                    valid = false;
                    title = i18n.validationLength;
                } else {
                    var pattern = domAttr.get(field, "pattern");

                    if (pattern && new RegExp(pattern).test(value)) {
                        valid = false;
                        title = i18n.validationPattern;
                    } else {
                        var testFunction = FieldsJsForm.VALIDATORS[domAttr.get(field, "type")];

                        if (testFunction && !testFunction.apply(field)) {
                            valid = false;
                            title = i18n.validationType;
                        }
                    }
                }
            }

            if (!valid) {
                domClass.add(field, FieldsJsForm.CSS_CLASSES.VALIDATION_FAILURE);
                this._showTooltip(field, title);
                
                if (initial && "assertive" === this.options.validation) {
                    var self = this;
                    
                    this.eventHandlers.push(on(field, "change", function(event) {
                        self._validateField(this);
                    }));
                }
            } else {
                domClass.remove(field, FieldsJsForm.CSS_CLASSES.VALIDATION_FAILURE);
                this._hideTooltip(field);
            }

            return valid;
        },
        
        _hasUnsavedChanges : function() {
            var initialData = this.initialData;

            if (!initialData) {
                return this.unsavedChanges;
            } else {
                for (var fieldName in this.fields) {
                    if (fieldName in initialData) {
                        var dataFieldValue = initialData[fieldName],
                        formFieldValue = this._getFieldValue(fieldName);

                        if ((!dataFieldValue && formFieldValue) || (dataFieldValue && !formFieldValue) || (dataFieldValue && formFieldValue && dataFieldValue.toString() !== formFieldValue)) {
                            return true;
                        }
                    }
                }

                return false;
            }
        },
        
        _showTooltip : function(field, message) {
            this.tooltips[field.name] = dijit.showTooltip(message, field, null, null, null, this.id);
        },

        _hideTooltip : function(field) {
            dijit.hideTooltip(field, this.id);
        },
        
        populate : function(data) {
            if (this._clear(false, data)) {
                this.initialData = data;

                for (var dataFieldName in data) {
                    this._setFieldValue(dataFieldName, data[dataFieldName]);
                }
            }
        },
        
        clear : function(force) {
            return this._clear(force, null);
        },
        
        harvest : function(delta) {
            var product,
            fields = this.fields,
            initialData = this.initialData;

            if (initialData) {
                if (delta) {
                    product = {};

                    for (var fieldName in this.fields) {
                        var fieldValue = this._getFieldValue(fieldName);

                        if (fieldValue !== initialData[fieldName]) {
                            product[fieldName] = fieldValue;
                        }
                    }
                } else {
                    product = this.initialData;

                    for (var fieldName in this.fields) {
                        product[fieldName] = this._getFieldValue(fieldName);
                    }
                }
            } else {
                product = {};

                for (var fieldName in this.fields) {
                    product[fieldName] = this._getFieldValue(fieldName);
                }
            }

            return product;
        },
        
        save : function() {
            var valid = true;

            for (var fieldName in this.fields) {
                if (!this._validateField(this.fields[fieldName][0], true)) {
                    valid = false;
                }
            }

            if (valid) {
                this.unsavedChanges = false;
                this.initialData = this.harvest();
            }

            return valid;
        }
    });
    
    FieldsJsForm.DEFAULTS = {
        promptUnsavedChanges : true,
        labels : "top",
        validation : "assertive"
    };

    FieldsJsForm.FRAGMENTS = {
        REQUIRED : "<span class='fieldsjs-required'> " + i18n.required + " </span>",
    }

    FieldsJsForm.CSS_CLASSES = {
        VALIDATION_FAILURE : "fieldsjs-validation-failure",
        LABEL_TOP : "fieldsjs-label-top",
        LABEL_BOTTOM : "fieldsjs-label-bottom"
    };

    FieldsJsForm.VALIDATORS = {
        "email" : function() {
            var addresses = domAttr.get(this, "value").split(",");

            for (var i = 0, l = addresses.length; i < l; i++) {
                if (!/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(addresses[i])) {
                    return false;
                }
            }

            return true;
        },
        "date" : function() {
            return FieldsJsForm.VALIDATE_RFC3339_DATE(domAttr.get(this, "value"), domAttr.get(this, "min"), domAttr.get(this, "max"), false, true);
        },
        "datetime" : function() {
            return FieldsJsForm.VALIDATE_RFC3339_DATE_TIME(domAttr.get(this, "value"), domAttr.get(this, "min"), domAttr.get(this, "max"), false);
        },
        "datetime-local" : function() {
            return FieldsJsForm.VALIDATE_RFC3339_DATE_TIME(domAttr.get(this, "value"), domAttr.get(this, "min"), domAttr.get(this, "max"), true);
        },
        "month" : function() {
            return FieldsJsForm.VALIDATE_RFC3339_DATE(domAttr.get(this, "value"), domAttr.get(this, "min"), domAttr.get(this, "max"), false, false);
        },
        "number" : function() {
            var number = parseFloat(domAttr.get(this, "value"));

            return !isNaN(parseFloat(number)) && !(number < domAttr.get(this, "min")) && !(number > domAttr.get(this, "max"));
        },
        "time" : function() {
            return FieldsJsForm.VALIDATE_RFC3339_TIME(domAttr.get(this, "value"), domAttr.get(this, "min"), domAttr.get(this, "max"), true);
        },
        "url" : function() {
            return /^\s*[a-z](?:[-a-z0-9\+\.])*:(?:\/\/(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:])*@)?(?:\[(?:(?:(?:[0-9a-f]{1,4}:){6}(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|::(?:[0-9a-f]{1,4}:){5}(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|(?:[0-9a-f]{1,4}:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3})|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|v[0-9a-f]+[-a-z0-9\._~!\$&\'\(\)\*\+,;=:]+)\]|(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:\.(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3}|(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=@])*)(?::[0-9]*)?(?:\/(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@]))*)*|\/(?:(?:(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@]))+)(?:\/(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@]))*)*)?|(?:(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@]))+)(?:\/(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@]))*)*|(?!(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@])))(?:\?(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@])|[\uE000-\uF8FF\uF0000-\uFFFFD|\u100000-\u10FFFD\/\?])*)?(?:\#(?:(?:%[0-9a-f][0-9a-f]|[-a-z0-9\._~\uA0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\u10000-\u1FFFD\u20000-\u2FFFD\u30000-\u3FFFD\u40000-\u4FFFD\u50000-\u5FFFD\u60000-\u6FFFD\u70000-\u7FFFD\u80000-\u8FFFD\u90000-\u9FFFD\uA0000-\uAFFFD\uB0000-\uBFFFD\uC0000-\uCFFFD\uD0000-\uDFFFD\uE1000-\uEFFFD!\$&\'\(\)\*\+,;=:@])|[\/\?])*)?\s*$/i.test(domAttr.get(this, "value"));
        },
        "week" : function() {
            return FieldsJsForm.VALIDATE_RFC3339_DATE(domAttr.get(this, "value"), domAttr.get(this, "min"), domAttr.get(this, "max"), true, false);
        }
    };

    FieldsJsForm.VALIDATE_RFC3339_DATE = function(value, min, max, hasWeek, hasDay) {
        return FieldsJsForm.PARSE_RFC3339_DATE(value, hasWeek, hasDay) && !(value < FieldsJsForm.PARSE_RFC3339_DATE(min, hasWeek, hasDay)) && !(value > FieldsJsForm.PARSE_RFC3339_DATE(max, hasWeek, hasDay));
    };

    FieldsJsForm.VALIDATE_RFC3339_TIME = function(value, min, max, local) {
        return FieldsJsForm.PARSE_RFC3339_TIME(value, local) && !(value < FieldsJsForm.PARSE_RFC3339_TIME(min, local)) && !(value > FieldsJsForm.PARSE_RFC3339_TIME(max, local));
    };

    FieldsJsForm.VALIDATE_RFC3339_DATE_TIME = function(value, min, max, local) {
        return FieldsJsForm.PARSE_RFC3339_DATE_TIME(value, local) && !(value < FieldsJsForm.PARSE_RFC3339_DATE_TIME(min, local)) && !(value > FieldsJsForm.PARSE_RFC3339_DATE_TIME(max, local));
    };

    FieldsJsForm.PARSE_RFC3339_DATE = function(dateString, hasWeek, hasDay) {
        if (!dateString) {
            return;
        }

        var tokens = dateString.split("-");

        if (tokens.length !== (hasDay ? 3 : 2)) {
            return;
        }

        var year = tokens[0];

        if (isNaN(parseInt(year)) || year.length !== 4 || year < 0) {
            return;
        }

        var monthOrWeek = tokens[1],
        maxValue = 12;

        if (hasWeek) {
            if (monthOrWeek.charAt(0) !== "W") {
                return;
            } else {
                monthOrWeek = monthOrWeek.substring(1, monthOrWeek.length);
                maxValue = 53;
            }
        }

        if (isNaN(parseInt(monthOrWeek)) || monthOrWeek.length !== 2 || monthOrWeek < 1 || monthOrWeek > maxValue) {
            return;
        }

        if (hasDay) {
            var day = tokens[2];

            if (isNaN(parseInt(day)) || day.length !== 2 || day < 1 || day > 31) {
                return;
            }
            
            var testDayDate = new Date(year, monthOrWeek-1, day);
                
            if (testDayDate.getFullYear() != year || testDayDate.getMonth() != (monthOrWeek)-1 || testDayDate.getDate() != day) {
                return;
            }
        }

        return dateString;
    };

    FieldsJsForm.PARSE_RFC3339_TIME = function(timeString, local) {
        if (!timeString) {
            return;
        }

        var timeTokens = timeString.split(/[\+\-]/),
        tokens = timeTokens[0].split(":");

        if (tokens.length !== 3 || (local && timeTokens.length !== 1)) {
            return;
        }

        var hour = tokens[0];

        if (isNaN(parseInt(hour)) || hour.length !== 2 || hour < 0 || hour > 23) {
            return;
        }

        var minute = tokens[1];

        if (isNaN(parseInt(minute)) || minute.length !== 2 || minute < 0 || minute > 59) {
            return;
        }

        var lastTokens = tokens[2];

        if (!local) {
            if (lastTokens.charAt(lastTokens.length - 1) === "Z") {
                lastTokens = lastTokens.substring(0, lastTokens.length - 1);
            } else {
                if (timeTokens.length !== 2) {
                    return;
                }

                var numoffsetTokens = timeTokens[1].split(":");

                if (numoffsetTokens.length !== 2) {
                    return;
                }

                var hour = numoffsetTokens[0];

                if (isNaN(parseInt(hour)) || hour.length !== 2 || hour < 0 || hour > 23) {
                    return;
                }

                var minute = numoffsetTokens[1];

                if (isNaN(parseInt(minute)) || minute.length !== 2 || minute < 0 || minute > 59) {
                    return;
                }
            }
        }

        var secondTokens = lastTokens.split("."),
        second = secondTokens[0];

        if (isNaN(parseInt(second)) || second.length !== 2 || second < 0 || second > 60) {
            return;
        }

        if (secondTokens.length > 1) {
            var secfrac = secondTokens[1];

            if (isNaN(parseInt(secfrac)) || secfrac.length > 3 || secfrac < 0) {
                return;
            }
        }

        return timeString;
    };
    
    FieldsJsForm.PARSE_RFC3339_DATE_TIME = function(dateTimeString, local) {
        if (!dateTimeString) {
            return;
        }
        
        var tokens = dateTimeString.split("T");
        
        if (tokens.length !== 2) {
            return;
        }

        if (!FieldsJsForm.PARSE_RFC3339_DATE(tokens[0], false, true)) {
            return;
        }
        
        if (!FieldsJsForm.PARSE_RFC3339_TIME(tokens[1], local)) {
            return;
        }
        
        return dateTimeString;
    };
    
    return module;
});