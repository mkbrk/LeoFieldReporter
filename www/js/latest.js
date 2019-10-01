app.latest = {
    saveToCache : function(posts) {
        if(posts != null)
            window.localStorage.setItem("LATESTPOSTS", JSON.stringify(posts));
    },
    getFromCache : function(callback) {
        var c = window.localStorage.getItem("LATESTPOSTS");
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
        if(navigator.connection.type == Connection.NONE)
        {
            self.getFromCache(callback);
        }
        else
        {
            $.get(app.getRemoteUrl("/en/fieldreporter/latest?mapzoom=1&imageSize=small&take=10"), null, function(res) {
                self.saveToCache(res);
                if(callback)    
                    callback(res);
            }, "json");
        }

    },
    getFromBundle : function(callback) {
        $.get("data/latest.json", null, function(res) {
            if(callback)    
                callback(res);
        }, "json");
    },
    scatter : function(res) {
        if(res != null && res.length > 0)
        {
            var tmp = $("#post-card").html();
            var h = "";
            for(var i = 0; i < res.length; i++)
            {
                var d = app.dateTimeReviver(null, res[i].ObservationDate);
                res[i].ObservationDateFriendly = moment(d).format("MMM Do, YYYY");
                h += Mustache.render(tmp, res[i]);
            }
            $("#latest").html(h);
        }
        else
        {
            $("#latest").html("<h3 class='nonefound'>Unable to get latest posts from the LEO Network.</h3>");
        }
    },
    refresh : function() {
        this.getFromCache(function(res) {
            //immediately load from cache/bundle
            console.log("showing latest from the cache/bundle");
            app.latest.scatter(res);

            //once that's done, try loading from server
            app.latest.getFromServer(function(res) {
                //this saves to cache internally
                console.log("showing latest from the server");
                app.latest.scatter(res);
            });
        });

        
    }
};