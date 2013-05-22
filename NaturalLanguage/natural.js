//-- Basic
// the code below for object inheritance was copied from a website

Function.prototype.method = function (name, func) {
    this.prototype[name] = func;
    return this;
};

Function.method('inherits', function (parent) {
    this.prototype = new parent();
    var d = {}, 
        p = this.prototype;
    this.prototype.constructor = parent; 
    this.method('uber', function uber(name) {
        if (!(name in d)) {
            d[name] = 0;
        }        
        var f, r, t = d[name], v = parent.prototype;
        if (t) {
            while (t) {
                v = v.constructor.prototype;
                t -= 1;
            }
            f = v[name];
        } else {
            f = p[name];
            if (f == this[name]) {
                f = v[name];
            }
        }
        d[name] += 1;
        r = f.apply(this, Array.prototype.slice.apply(arguments, [1]));
        d[name] -= 1;
        return r;
    });
    return this;
});

//-- Base language for inheritance (publishes basic interface)

BaseLanguage = function() {
    this.fields = {};
}

BaseLanguage.prototype.initialize = function() {
    this.dateFormats = {
        'parse_full':'DD/MM/YYYY',
        'parse_short':'DD/MM',
        'formatted_full':'DD/MMM/YYYY',
        'formatted_short':'DD/MMM'
    };
    this.timeFormats = {
        'parse':'H:mm', //'H:mma',
        'formatted':'HH:mm'
    };
    this._initialize();
}

BaseLanguage.prototype.addField = function(field) {
    /* parameter "field" must be a dictionary with keys "name", "expressions" and "parser" */
    this.fields[field.name] = field;
}

BaseLanguage.prototype.parseValue = function(value,fields) {
    if (!value) return null;

    // Parsing fields by expression
    for (var iFld=0; iFld<fields.length; iFld++) {
        var field = fields[iFld];
        var fieldInfo = this.fields[field];

        for (var iExp=0; iExp<fieldInfo.expressions.length; iExp++) {
            var exp = fieldInfo.expressions[iExp];
            var nodes = exp.exec(value);
            if (nodes)
                return fieldInfo.parser(field,value,nodes);
        }
    }

    return null;
}

//-- Command line

CommandLine = function(form, languageInterpreter){
    this.form = form;
    this.languageInterpreter = languageInterpreter;
    this.inputs = [];
}

CommandLine.prototype.initialize = function() {
}

CommandLine.prototype.resizeInput = function(input) {
    var fieldset = input.parents('fieldset');
    var container = input.parents('.inputContainer');
    var lineWidth = fieldset.width();

    // Finds the labels in the last line
    var labels = fieldset.find('.bit.label');
    var lastLine = [];
    var widthLastLine = 0;
    var minimumInput = 100;
    for (var iLbl=0; iLbl<labels.length; iLbl++) {
        widthLastLine += $(labels[iLbl]).outerWidth() + 2;
        if (lineWidth >= widthLastLine + minimumInput) {
            lastLine.push($(labels[iLbl]));
        } else {
            lastLine = [];
            widthLastLine = 0;
        }
    }
    input.width(lineWidth - widthLastLine - 12);
    container.width(lineWidth - widthLastLine);
}

CommandLine.prototype.registerInput = function(item) {
    /* parameter "item" must be a dictionary with keys "input", "fields", "afterParsed", "afterFinish" and "hints" */
    cmdLine = this;

    if (!item.hints) item.hints = [];
    cmdLine.inputs.push(item);

    // Key up event for inputs
    item.input.keyup(function(e){
        var parsed = cmdLine.languageInterpreter.parseValue($(this).val(),item.fields);
        item.input.data('parsed',parsed);

        // If no field matched, parsing hints
        if (!parsed) {
            var matchedHints = [];
            for (var iHnt=0; iHnt<item.hints.length; iHnt++) {
                if (item.hints[iHnt].indexOf(item.input.val()) == 0)
                    matchedHints.push(item.hints[iHnt]);
            }
            if (matchedHints)
                parsed = {hints:matchedHints}
        }
        
        if (item.afterParsed) item.afterParsed(item.input, parsed)
        else cmdLine.afterParsed(item.input, parsed);
    });
    item.input.keydown(function(e){
        if (e.keyCode == 13) {
            e.preventDefault();
            if (item.afterFinish) item.afterFinish(item.input, item.input.data('parsed'));
        }
    });
    item.input.blur(function(e){
        $(this).parent().find('.fieldOutput').empty();
    });

    // Resize the input on the registration
    cmdLine.resizeInput(item.input);
}

CommandLine.prototype.afterParsed = function(input, parsed) {
    console.log(parsed); // XXX
}

CommandLine.prototype.showHints = function(input, parsed) {
    var ul = $('<ul class="hints"></ul>');
    $.each(parsed.hints, function(idx,hint){
        hint = hint.replace(input.val(), '<b>'+input.val()+'</b>');
        ul.append('<li>'+hint+'</li>');
    });
    input.parent().find('.fieldOutput').html(ul);
}
