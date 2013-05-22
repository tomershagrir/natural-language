EnglishLanguage = function() {
    this.initialize();
}
EnglishLanguage.inherits(BaseLanguage);

EnglishLanguage.prototype._initialize = function() {
    var lang = this;
    this.addField({name:'pickup_location', expressions:[new RegExp('(from)[ ]+(.+);?')], parser:function(field,value,nodes){ return lang.cleanPickupLocation(field,value,nodes); }});
    this.addField({name:'dropoff_location', expressions:[new RegExp('(to)[ ]+(.+);?')], parser:function(field,value,nodes){ return lang.cleanDropoffLocation(field,value,nodes); }});
    this.addField({name:'via', expressions:[new RegExp('(to)[ ]+(.+);?')], parser:function(field,value,nodes){ return lang.cleanViaLocation(field,value,nodes); }});
    this.addField({name:'pickup_time', expressions:[
            new RegExp('(in)[ ]+(\\d+)[ ]?(min|hr|minutes|hours);?'),
            new RegExp('(\\d{1,2}/\\d{1,2}/\\d{4} |\\d{1,2}/\\d{1,2} |today |tomorrow |sunday |sun |monday |mon |tuesday |tue |wednesday |wed |thursday |thu |friday |fri |saturday |sat |)(at |)(\\d{1,2}:?\\d{0,2}(am|pm|));?')
            ], parser:function(field,value,nodes){ return lang.cleanPickupTime(field,value,nodes); }});
}

EnglishLanguage.prototype.cleanPickupLocation = function(field,value,nodes) {
    return {'field':field, 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

EnglishLanguage.prototype.cleanDropoffLocation = function(field,value,nodes) {
    return {'field':field, 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

EnglishLanguage.prototype.cleanViaLocation = function(field,value,nodes) {
    return {'field':field, 'value':{'formatted':nodes[1]+': '+nodes[2], 'raw':nodes[2]}};
}

EnglishLanguage.prototype.cleanPickupTime = function(field,value,nodes) {
    //moment.lang('en');
    var lang = this;
    if (nodes[1] == 'in') {
        var fieldLabel = 'in';
        var unit = nodes[3].indexOf('m') == 0 ? 'minute' : 'hour';
        var intRaw = parseInt(nodes[2]);
        var formatted = nodes[2] + ' ' + unit + (intRaw > 1 ? 's' : '');
        var raw = nodes[3].indexOf('m') == 0 ? intRaw : (intRaq * 60);
    } else {
        var fieldLabel = 'at';
        var date = moment();
        var day = $.trim(nodes[1].toLowerCase());
        if (['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(day) >= 0)
            day = day.substr(0,3);
        if (day == 'tomorrow') {
            date.add('days',1);
        } else if (['sun','mon','tue','wed','thu','fri','sat'].indexOf(day) >= 0) {
            while (date.format('ddd').toLowerCase() != day)
                date.add('days',1);
        } else if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(day)) {
            date = moment(day,lang.dateFormats.parse_full);
        } else if (day.match(/\d{1,2}\/\d{1,2}/)) {
            date = moment(day+'/'+moment().year(),lang.dateFormats.parse_full);
        }
        var dateFormat = (date.year() == moment().year()) ? lang.dateFormats.formatted_short : lang.dateFormats.formatted_full;
        var datetime = moment(date.format('YYYY-MM-DD')+nodes[3], 'YYYY-MM-DD '+lang.timeFormats.parse);
        var formatted = ((nodes[1] && day != 'today') ? (datetime.format(dateFormat)+' ') : '') + datetime.format(lang.timeFormats.formatted);
        var raw = datetime.format('YYYY-MM-DD HH:mm');
    }
    return {'field':field, 'value':{'formatted':fieldLabel+': '+formatted, 'raw':raw}};
}

