define(["dijit/Tooltip", "dojo/dom-class"],
function(Tooltip, domClass) {
    var identifiers = {};
    
    var generateId = function(aroundNode, containerId) {
        return (aroundNode.id || aroundNode.name) + containerId;
    };

    dijit.showTooltip = function(innerHTML, aroundNode, position, rtl, textDir, containerId) {
        var identifier = generateId(aroundNode, containerId),
        tt = identifiers[identifier];

        if (!tt) {
            tt = new dijit._MasterTooltip();
            domClass.add(tt.containerNode, "tooltipErrorContainer");
            domClass.add(tt.connectorNode, "tooltipErrorConnector");
            identifiers[identifier] = tt;
        }
        
        tt.show(innerHTML, aroundNode, position, rtl, textDir);
        
        return tt;
    };

    dijit.hideTooltip = function(aroundNode, containerId) {
        var tt = identifiers[generateId(aroundNode, containerId)];

        if (tt) {
            tt.hide(aroundNode);
        }
        
        return tt;
    };

    return Tooltip;
});