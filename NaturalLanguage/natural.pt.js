PortugueseLanguage = function() {
    this.initialize();
}
PortugueseLanguage.inherits(BaseLanguage);

PortugueseLanguage.prototype._initialize = function() {
    var lang = this;
    this.addField({name:'pickup_location', expressions:[new RegExp('(de)[ ]+(.+);?')], parser:function(field,value,nodes){ return lang.cleanPickupLocation(field,value,nodes); }});
    this.addField({name:'dropoff_location', expressions:[new RegExp('(para)[ ]+(.+);?')], parser:function(field,value,nodes){ return lang.cleanDropoffLocation(field,value,nodes); }});
    this.addField({name:'via', expressions:[new RegExp('(to)[ ]+(.+);?')], parser:function(field,value,nodes){ return lang.cleanViaLocation(field,value,nodes); }});
    this.addField({name:'pickup_time', expressions:[
            new RegExp('(em|daqui)[ ]+(\\d+)[ ]?(min|hr|minutes|hours);?'),
            new RegExp('(\\d{1,2}/\\d{1,2}/\\d{4} |\\d{1,2}/\\d{1,2} |hoje |amanha |domingo |dom |segunda |seg |terca |ter |quarta |qua |quinta |qui |sexta |sex |sabado |sab |)(as |)(.+);?')
            ], parser:function(field,value,nodes){ return lang.cleanPickupTime(field,value,nodes); }});
}

PortugueseLanguage.prototype.cleanPickupLocation = function(field,value,nodes) {
    return {'field':field, 'fieldLabel':nodes[1], 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

PortugueseLanguage.prototype.cleanDropoffLocation = function(field,value,nodes) {
    return {'field':field, 'fieldLabel':nodes[1], 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

PortugueseLanguage.prototype.cleanViaLocation = function(field,value,nodes) {
    return {'field':field, 'fieldLabel':nodes[1], 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

PortugueseLanguage.prototype.cleanPickupTime = function(field,value,nodes) {
    //moment.lang('pt');
    var lang = this;
    if (nodes[1] == 'em' || nodes[1] == 'daqui') {
        var fieldLabel = 'daqui';
        var unit = nodes[3].indexOf('m') == 0 ? 'minuto' : 'hora';
        var intRaw = parseInt(nodes[2]);
        var formatted = nodes[2] + ' ' + unit + (intRaw > 1 ? 's' : '');
        var raw = nodes[3].indexOf('m') == 0 ? intRaw : (intRaq * 60);
    } else {
        var fieldLabel = 'as';
        var date = moment();
        var day = $.trim(nodes[1].toLowerCase());
        if (['domingo','segunda','terca','quarta','quinta','sexta','sabado'].indexOf(day) >= 0)
            day = day.substr(0,3);
        if (day == 'amanha') {
            date.add('days',1);
        } else if (['dom','seg','ter','qua','qui','sex','sab'].indexOf(day) >= 0) {
            while (date.format('ddd').toLowerCase() != day)
                date.add('days',1);
        } else if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(day)) {
            date = moment(day,lang.dateFormats.parse_full);
        } else if (day.match(/\d{1,2}\/\d{1,2}/)) {
            date = moment(day+'/'+moment().year(),lang.dateFormats.parse_full);
        }
        var format = (date.year() == moment().year()) ? lang.dateFormats.formatted_short : lang.dateFormats.formatted_full;
        var formatted = ((nodes[1] && day != 'hoje') ? (moment(date).format(format)+' ') : '') + nodes[3];
        var raw = nodes[3];
    }
    return {'field':field, 'value':{'formatted':fieldLabel+': '+formatted, 'raw':raw}};
}

