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
    this.EXP_EMAIL = new RegExp('^[\\w\\-\\+\\_]+@\\w[a-zA-Z_\\.\\-]+\\.[a-zA-Z]{2,3}$');
    this.EXP_PHONE = new RegExp('^\\+?\\d+$');
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
    if (this._initialize)
        this._initialize();
}

BaseLanguage.prototype.addField = function(field) {
    /* Adds a field to the fields dictionary
     *
     * Parameter "field" must be a dictionary with keys:
     * - name - field name string
     * - expressions - list of regular expressions to match the field value
     * - parser - a function to call for parsing the value and getting in the expected format
     */
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
            if (nodes) {
                var ret = fieldInfo.parser(field,value,nodes);
                ret.typedValue = value;
                return ret;
            }
        }
    }

    return null;
}

BaseLanguage.prototype.cleanField = function(field,value,nodes) {
    return {'field':field, 'fieldLabel':nodes[1], 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

QuickBookingFormLanguage = function() {
    this.initialize();
}
QuickBookingFormLanguage.inherits(BaseLanguage);

QuickBookingFormLanguage.prototype.cleanPassengerInfo = function(field,value,nodes) {
    if (this.EXP_EMAIL.test(value)) {
        return {'field':'customer_email', 'fieldLabel':'e-mail', 'value':{'formatted':'e-mail: '+$.trim(value), 'raw':$.trim(value)}};
    } else if (this.EXP_PHONE.test(value)) {
        return {'field':'customer_phone', 'fieldLabel':'phone', 'value':{'formatted':'phone: '+$.trim(value), 'raw':$.trim(value)}};
    } else {
        return {'field':'customer_name', 'fieldLabel':'passenger', 'value':{'formatted':'passenger: '+$.trim(value), 'raw':$.trim(value)}};
    }
}

//-- Command line

NaturalInput = function(form, languageInterpreter){
    this.form = form;
    this.languageInterpreter = languageInterpreter;
    this.inputs = [];
    this.labelTemplate = '<div id="{id}" class="bit label" rel="{field}">'+
        '<input type="hidden" name="{field}"/><span class="value"></span>'+
        '<a href="javascript:void(0)" class="close">X</a>'+
        '</div>';
}

NaturalInput.prototype.initialize = function() {
}

NaturalInput.prototype.resizeInput = function(input) {
    /* Resizes the input to fit the client width */
    var container = input.parents('.richFieldset');
    var lineWidth = container.width();

    // Finds the labels in the last line
    var labels = container.find('.bit.label');
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
    input.parents('.inputWrapper').width(lineWidth - widthLastLine);
}

NaturalInput.prototype.labelClick = function(inputInfo, label, e) {
    /* Click event for labels. This basically focus the label. */
    label.parent().find('.focused').removeClass('focused');
    label.addClass('focused');
    inputInfo.input.data('focusedBit',label.attr('id'));
    inputInfo.input.data('clickedLabel',true);
}

NaturalInput.prototype.labelEdit = function(inputInfo, label, e) {
    /* Takes the label's value for editing and hide the label in case of returning without change */
    inputInfo.input.val(label.data('parsed').typedValue);
    label.addClass('hidden').removeClass('focused');
    inputInfo.input.data('editingJustStarted',true);
    inputInfo.input.data('focusedBit',inputInfo.input.parent().attr('id'));
}

NaturalInput.prototype.addLabelToInput = function(inputInfo, parsed) {
    /* Add a label and a hidden input for the given value and respective field, in this input */
    var naturalInput = this;
    var input = inputInfo.input;
    var container = input.parents('.richFieldset');

    var label = container.find('.label[rel='+parsed.field+']')
    if (inputInfo.multipleFields.indexOf(parsed.field) >= 0 || !label.length) {
        var label = $(naturalInput.labelTemplate.replace(/{id}/g,'l'+moment().format('DDHHmmssSSS')).replace(/{field}/g,parsed.field));
        label.insertBefore(input.parent());
        label.click(function(e){
            naturalInput.labelClick(inputInfo, label, e);
        });
        label.dblclick(function(e){
            naturalInput.labelEdit(inputInfo, label, e);
        });
        label.find('.close').click(function(){
            naturalInput.removeLabelFromInput(inputInfo, $(this).parents('.label').attr('id'));
        });
    }
    label.find('.value').text(parsed.value.formatted);
    label.data('parsed',parsed);
    label.find('input[type=hidden]').val(parsed.value.raw);
}

NaturalInput.prototype.removeLabelFromInput = function(inputInfo, bitId) {
    inputInfo.input.parents('.richFieldset').find('#'+bitId).remove();
}

NaturalInput.prototype.afterFinish = function(inputInfo, parsed) {
    if (!parsed) return;
    var input = inputInfo.input;
    this.addLabelToInput(inputInfo, parsed);
    this.resizeInput(input);
    input.val('');
}

NaturalInput.prototype.registerInput = function(item) {
    /* parameter "item" must be a dictionary with keys:
     * - input - jQuery element
     * - fields - a list with included field names
     * - multipleFields - a list with field names those support multiple values
     * - afterParsed - function to call after value is parsed
     * - afterFinish - function to call after value is validated and finished
     * - hints - list with text hints to help the user
     **/
    naturalInput = this;

    if (!item.hints) item.hints = [];
    if (!item.multipleFields) item.multipleFields = [];
    naturalInput.inputs.push(item);
    var container = item.input.parents('.richFieldset');
    var fieldOutput = container.find('.fieldOutput');

    // The focused bit is to set the current piece the user is navigating now. If "input", it means the user is just
    // editing the input, if other value, it is the element ID. Necessary for the keyboard navigation to delete values
    if (!item.input.parent().attr('id'))
        item.input.parent().attr('id','c'+moment().format('DDHHmmssSSS'));
    item.input.data('focusedBit',item.input.parent().attr('id'));

    // Key up event for inputs
    item.input.keyup(function(e){
        // Parse input value
        if (e.keyCode != 38 && e.keyCode != 40) {
            var parsed = naturalInput.languageInterpreter.parseValue($.trim($(this).val()),item.fields);
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
            else naturalInput.afterParsed(item.input, parsed);
        }
    });
    item.input.keydown(function(e){
        /* Keyboard navigation */

        // Return or escape to abandon editing mode - this is important to be in a different "if" clause from the
        // others, because it needs to clean the flag for any other state
        if ((e.keyCode == 13 || e.keyCode == 27) && item.input.data('editingJustStarted')) {
            item.input.val('');
            container.find('.label.hidden').removeClass('hidden');
            e.preventDefault();
            item.input.data('editingJustStarted',false);
            return;
        }
        item.input.data('editingJustStarted',false);
        container.find('.label.hidden').remove();

        // Return to edit current bit
        if (e.keyCode == 13 && item.input.data('focusedBit').substr(0,1) == 'l') {
            naturalInput.labelEdit(item, container.find('#'+item.input.data('focusedBit')));
            e.preventDefault();
        }
        
        // Return or Tab
        else if ((e.keyCode == 13 || e.keyCode == 9)) {
            // Silence line break
            if (e.keyCode == 13 || $(this).val() != '') e.preventDefault();

            var afterFinish = item.afterFinish ? item.afterFinish : function(inputInfo, parsed){ naturalInput.afterFinish(inputInfo, parsed); };

            // If user is navigating a pick list, it returns the pick list value instead
            //else if (e.keyCode == 38 && fieldOutput.find('ul>li.focused').length) {
            if (e.keyCode == 13 && fieldOutput.find('ul>li.focused').length) {
                var current = fieldOutput.find('ul>li.focused');
                var parsed = item.input.data('parsed');

                // Parsed value
                if (parsed) {
                    parsed.value.formatted = (parsed.fieldLabel ? parsed.fieldLabel+': ' : '') + current.text();
                    parsed.value.object = current.data('object');
                    afterFinish(item, parsed);
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
                afterFinish(item, item.input.data('parsed'));
            }
        }

        // Left arrow
        else if (e.keyCode == 37 && $(this).val() == '') {
            var currentBit = container.find('#'+item.input.data('focusedBit'));
            if (currentBit.prev().length) {
                var nextBit = container.find('#'+currentBit.prev().attr('id'));
                item.input.data('focusedBit',nextBit.attr('id'));
                container.find('.bit.focused').removeClass('focused');
                nextBit.addClass('focused');
            }
        }

        // Right arrow
        else if (e.keyCode == 39 && $(this).val() == '') {
            var currentBit = container.find('#'+item.input.data('focusedBit'));
            if (currentBit.next().length) {
                container.find('.bit.focused').removeClass('focused');
                if (currentBit.next().attr('id').indexOf('c') == 0) {
                    item.input.data('focusedBit',currentBit.next().attr('id'));
                } else {
                    var nextBit = container.find('#'+currentBit.next().attr('id'));
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
            var currentBit = container.find('#'+item.input.data('focusedBit'));
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
            naturalInput.removeLabelFromInput(item, item.input.data('focusedBit'));
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
        naturalInput.resizeInput($(this));

        // Set the focused bit for that input
        if (!item.input.data('clickedLabel')) {
            item.input.data('focusedBit',item.input.parent().attr('id'));
            container.find('.focused').removeClass('focused');
        }
        item.input.data('clickedLabel',false);
    });
    item.input.blur(function(e){
        // Shrink when unfocused
        $(this).parent().find('.fieldOutput').empty();
        $(this).width(30);
    });
    container.click(function(){
        // Click event to focus input when container is clicked
        item.input.focus();
    });

    // Resize the input on the registration
    naturalInput.resizeInput(item.input);
}

NaturalInput.prototype.afterParsed = function(input, parsed) {
    console.log(parsed); // XXX
}

NaturalInput.prototype.showHints = function(input, parsed) {
    var ul = $('<ul class="hints"></ul>');
    $.each(parsed.hints, function(idx,hint){
        hint = hint.replace(input.val(), '<b>'+input.val()+'</b>');
        ul.append('<li class="hint">'+hint+'</li>');
    });
    input.parent().find('.fieldOutput').html(ul);
}
