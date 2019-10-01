app.resources = {
    _resources : null,
    _re : /@([A-Z][a-zA-Z]*\.[A-Z][A-Za-z_]+)/g,
    //expects text like @Button.Cancel
    replace : function(text, culture) {
        if(text && text.length > 0)
        {
            return text.replace(app.resources._re, function(x) {
                return app.resources.get(x, culture); // app.resources.get(match);
            });
        }   
        else
            return text;         
    },
    //el is an HTML node 
    //this does token replacements all the way down the tree
    replaceAll : function(el, culture) {
        var allTextNodes = this._getTextNodes(el);
        for(var i = 0; i < allTextNodes.length; i++)
        {
            allTextNodes[i].textContent = app.resources.replace(allTextNodes[i].textContent, culture);
        }
    },
    _getTextNodes : function(node) {
        var textNodes  = [];
        if (node.nodeType == 3) {
            textNodes.push(node);
        } else {
            for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                 var t = app.resources._getTextNodes(node.childNodes[i]);
                 for(var tt = 0 ; tt < t.length; tt++)
                    textNodes.push(t[tt]);
            }
        }
        return textNodes;
    },
    getCultures : function() {
        if(this._resources != null)
            return Object.keys(this._resources);
        else
            return [];
    },
    //expects an individual token 
    get : function(token, culture) {
        if(token.indexOf("@") == 0)
            token = token.replace("@","");

        if(!culture || culture == null)
            culture = app.settings.get("Language", "en");

        if(this._resources != null)
        {
            if(this._resources.hasOwnProperty(culture))
            {
                //this is so that a case-insensitive search will work
                //would be better to returns a case-insensitive dataset I guess
                var lcToken = token.toLowerCase();
                var keys = Object.keys(this._resources[culture]);
                for(var i = 0; i < keys.length; i++)
                {
                    if(keys[i].toLowerCase() == lcToken)
                        return this._resources[culture][keys[i]];
                }
            }
        }

        return this._defaultValue(token);
    },
    getAll : function(token) {
        //returns array of language/name pairs
        var cultures = this.getCultures();
        var t = [];
        for(var i = 0; i < cultures.length; i++)
        {
            t.push([cultures[i], this.get(token, cultures[i])]);
        }
        return t;
    },
    _defaultValue : function(token) {
        if(token && token != null)
        {
            var parts = token.split(".");
            var t = token;
            if(parts.length > 1)
                t = parts[1]; //second half

            var re = /([A-Z]+[a-z]+)/g;
            t = t.replace(re, " $1");
            return t.trim();
        }
        else
            return "";
    },
    load : function(onLoadedCallback) {
        var self = this;
        console.log("loaded resources from cache/bundle");
        this.getFromCache(function(res) {
            self._resources = res;
            
            //this would be used to process tokens
            if(onLoadedCallback)
                onLoadedCallback();

            self.getFromServer(function(rr) {
                console.log("refreshed resources from server");
                self._resources = rr;
            });
        });
    },
    saveToCache : function(res) {
        if(res != null)
            window.localStorage.setItem("RESOURCES", JSON.stringify(res));
    },
    getFromCache : function(callback) {
        var c = window.localStorage.getItem("RESOURCES");
        if(c != null)
        {
            if(callback)
                callback(JSON.parse(c));
        }
        else
        {
            //if not already in cache,
            //get from bundle, store in cache, and call callback
            var self = this;
            this.getFromBundle(function(data) {
                self.saveToCache(data);
                if(callback)
                    callback(data);
            })
        }
    },
    getFromServer : function(callback) {
        var self = this;
        if(navigator.connection.type != Connection.NONE)
        {
            $.get(app.getRemoteUrl("/en/fieldreporter/resourcestrings"), null, function(res) {
                self.saveToCache(res);
                if(callback)    
                    callback(res);
            }, "json");
        }

    },
    getFromBundle : function(callback) {
        $.get("data/resources.json", null, function(res) {
            if(callback)    
                callback(res);
        }, "json");
    }
};