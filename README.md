Fields.js
==============

Fields.js is an AMD module for use with the Dojo toolkit (dojotoolkit.org) that offers standard boilerplate functionality for dealing with HTML forms:

* Validation of form fields.
* Prompting for discard of unsaved field changes.
* Bi-directional data binding.
* Field label generation.

Although Fields.js works with the HTML `<form>` tag and standard form submittal functionality, it can just as easily treat any element as a form.

# Installation

## Dependencies

* Dojo (tested against v1.8)
* Dijit

This module is a Dijit widget, and as such all associated Dojo and Dijit core dependencies are required.

Also be sure to include the "fields.css" stylesheet.

# Usage

Simply require this module and apply to any DOM node as you would any standard Dijit widget, for example:

<pre>
require(["FieldsJs/Fields"], function(FieldsJsForm) {
    FieldsJsForm({}, someStringIdOrDomRefHere);
});
</pre>

This will return an initialized FieldsJsForm object.

Fields.js tears through your selected element and processes all input, select, and textarea child elements it finds.  Note that your selected element does not have to be a `<form>` tag!

Each field found will be validated based on its "required", "pattern", and "maxlength" attributes.  `<input>` elements are validated based on their type, and all HTML5 input types are supported, including validation of "min" and "max" values. 

Fields.js can also automatically generate field labels for you - simply add a "data-fieldsjs-label" attribute and corresponding label value to each field you'd like a label for.

## Options

The FieldsJs() constructor takes an options object with the following properties:

* `promptUnsavedChanges` - (true|false) - Whether or not to prompt for confirmation before clearing an unsaved form.  Defaults to true.
* `labels` - ("top"|"bottom"|"left"|"right") - Placement of auto-generated labels with respect to their corresponding input fields.  Defaults to "top".
* `validation` - ("passive"|"assertive"|"aggressive") - Validation trigger behavior: "passive" triggers when saving a form, "assertive" when saving and then on field changes after initial save, "aggressive" on field changes from the get-go.  Defaults to "assertive".

## Methods

With a handle to a FieldsJsForm form object, the following methods are available:

* `populate(Object)` - Populate the form based on some object.  All form field names which match some attribute name in the given object will be populated.
* `clear(boolean)` - Clears all form data.  Takes a boolean value to determine whether or not to force clearing of the form when `promptUnsavedChanges` is turned on.  This function is automatically hooked into any "reset" input type found.  Returns a boolean value based on success of call.
* `harvest(boolean)` - Return an object representation of the form data.  If the form has backing data, this will return that data with all form data bound to it.  Takes a boolean value to determine whether or not to return only values that have been changed.  This argument has no effect for forms that have no backing data. 
* `save()` - Returns true or false based on successful validation of the form.  This function is automatically hooked into any "submit" input type found.  Alternatively, the following pattern may be used for scenarios outside of standard HTML form submittal:

<pre>
if(myFieldsJsForm.save()) {
	var myFieldDataObject = myFieldsJsForm.harvest();
	// Do whatever, probably xhr.post({ postData : myFieldDataObject })
}
</pre>

# i18n

All canned text displayed by this module can be fully customized and internationalized using standard Dojo i18n support (please see dojotoolkit.org/reference-guide/1.8/quickstart/internationalization/index.html).  Resource bundles may be located in the `/nls/` directory.

# Future Improvements

* Support for other native Dijit widgets within forms.
* Better validation of RFC-3339 fields - Currently date\time fields are validated based on highest acceptable values (ex: "31" for day-of-month values).  Obviously this is not accurate in all cases.