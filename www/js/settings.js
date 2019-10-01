 //this should be useful on other apps
 app.settings = {
    _values : {
        RootUrl : "https://staging.leonetwork.org",
        Language:"en"
    },
    get : function(key, defaultValue) {
        if(this._values.hasOwnProperty(key))
            return this._values[key];
        else
            return defaultValue || null;
    },
    set : function(key, value) {
        this._values[key] = value;
    },
    load : function() {
        var storage = window.localStorage;
        var s = storage.getItem("SETTINGS");
        if(s != null && s.length > 0)
        {
            this._values = JSON.parse(s);
        }  
    },
    save : function() {
        var storage = window.localStorage;
        var s = JSON.stringify(this._values);
        storage.setItem("SETTINGS", s);
        location.reload(); //if settings changed, assume we need to rerun all start up things...
    },
    scatter : function() {
        var wrapper = $("#settings");
        for (var key in this._values) {
            if (this._values.hasOwnProperty(key)) {
                wrapper.find("[name=" + key + "]").val(this._values[key]);                    
            }
        }
    },
    gather : function() {
        var self = this;
        $("#settings").find("input,select,textarea").each(function() {
            var n = $(this).attr("name");
            var v = $(this).val();
            self._values[n] = v;
        });
        this.save();
    },
};