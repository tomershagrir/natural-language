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
    var fieldset = item.input.parents('fieldset');
    var fieldOutput = fieldset.find('.fieldOutput');

    // The focused bit is to set the current piece the user is navigating now. If "input", it means the user is just
    // editing the input, if other value, it is the element ID. Necessary for the keyboard navigation to delete values
    if (!item.input.parent().attr('id'))
        item.input.parent().attr('id','c'+moment().format('DDHHmmssSSS'));
    item.input.data('focusedBit',item.input.parent().attr('id'));

    // Key up event for inputs
    item.input.keyup(function(e){
        // Parse input value
        if (e.keyCode != 38 && e.keyCode != 40) {
            var parsed = cmdLine.languageInterpreter.parseValue($.trim($(this).val()),item.fields);
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
            
            // Callback functions
            if (item.afterParsed) item.afterParsed(item.input, parsed)
            else cmdLine.afterParsed(item.input, parsed);
        }
    });
    item.input.keydown(function(e){
        /* Keyboard navigation */

        // Return or Tab
        if ((e.keyCode == 13 || e.keyCode == 9)) {
            // Silence line break
            if (e.keyCode == 13 || $(this).val() != '') e.preventDefault();

            if (!item.afterFinish)
                return;

            // If user is navigating a pick list, it returns the pick list value instead
            //else if (e.keyCode == 38 && fieldOutput.find('ul>li.focused').length) {
            if (e.keyCode == 13 && fieldOutput.find('ul>li.focused').length) {
                var current = fieldOutput.find('ul>li.focused');
                var parsed = item.input.data('parsed');

                // Parsed value
                if (parsed) {
                    parsed.value.formatted = (parsed.fieldLabel ? parsed.fieldLabel+': ' : '') + current.text();
                    parsed.value.object = current.data('object');
                    item.afterFinish(item.input, parsed);
                }
                
                // Parsed hint
                else if (current.is('.hint')) {
                    var hint = current.text();
                    if (hint.indexOf('{') >= 0)
                        hint = hint.substr(0,hint.indexOf('{'));
                    item.input.val(hint);
                    fieldOutput.empty();
                }
            }

            // Event after finish for value concluding
            else {
                item.afterFinish(item.input, item.input.data('parsed'));
            }
        }

        // Left arrow
        else if (e.keyCode == 37 && $(this).val() == '') {
            var currentBit = $('#'+item.input.data('focusedBit'));
            if (currentBit.prev().length) {
                var nextBit = $('#'+currentBit.prev().attr('id'));
                item.input.data('focusedBit',nextBit.attr('id'));
                fieldset.find('.bit.focused').removeClass('focused');
                nextBit.addClass('focused');
            }
        }

        // Right arrow
        else if (e.keyCode == 39 && $(this).val() == '') {
            var currentBit = $('#'+item.input.data('focusedBit'));
            if (currentBit.next().length) {
                fieldset.find('.bit.focused').removeClass('focused');
                if (currentBit.next().attr('id').indexOf('c') == 0) {
                    item.input.data('focusedBit',currentBit.next().attr('id'));
                } else {
                    var nextBit = $('#'+currentBit.next().attr('id'));
                    item.input.data('focusedBit',nextBit.attr('id'));
                    nextBit.addClass('focused');
                }
            }
        }

        // Up arrow
        else if (e.keyCode == 38 && item.input.data('focusedBit').substr(0,1) == 'c' && fieldOutput.find('ul>li').length) {
            var currentItem = fieldOutput.find('ul>li.focused');
            if (!currentItem.length) {
                fieldOutput.find('ul>li:last').addClass('focused');
            } else if (currentItem.prev().length) {
                currentItem.prev().addClass('focused');
                currentItem.removeClass('focused');
            }
        }

        // Down arrow
        else if (e.keyCode == 40 && item.input.data('focusedBit').substr(0,1) == 'c' && fieldOutput.find('ul>li').length) {
            var currentItem = fieldOutput.find('ul>li.focused');
            if (!currentItem.length) {
                fieldOutput.find('ul>li:first').addClass('focused');
            } else if (currentItem.next().length) {
                currentItem.next().addClass('focused');
                currentItem.removeClass('focused');
            }
        }

        // Backspace
        else if (e.keyCode == 8 && $(this).val() == '') {
            var currentBit = $('#'+item.input.data('focusedBit'));
            if (item.input.data('focusedBit').substr(0,1) == 'c') {
                if (currentBit.prev().length)
                    currentBit.prev().remove();
            } else {
                currentBit.remove();
                item.input.data('focusedBit',item.input.parent().attr('id'));
            }
        }

        // Delete
        else if (e.keyCode == 46 && $(this).val() == '' && item.input.data('focusedBit').substr(0,1) != 'c') {
            var currentBit = $('#'+item.input.data('focusedBit'));
            currentBit.remove();
            item.input.data('focusedBit',item.input.parent().attr('id'));
        }

        // Any key, with a label focused
        else if (item.input.data('focusedBit').substr(0,1) != 'c') {
            // Block typing when any label is focused
            e.preventDefault();
        }

        // Any key pressed with normal input focused
        else {
            item.input.data('focusedBit',item.input.parent().attr('id'));
        }
    });
    item.input.focus(function(e){
        // Expand when focused
        cmdLine.resizeInput($(this));

        // Set the focused bit for that input
        item.input.data('focusedBit',item.input.parent().attr('id'));
    });
    item.input.blur(function(e){
        // Shrink when unfocused
        $(this).parent().find('.fieldOutput').empty();
        $(this).width(30);
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
        ul.append('<li class="hint">'+hint+'</li>');
    });
    input.parent().find('.fieldOutput').html(ul);
}
