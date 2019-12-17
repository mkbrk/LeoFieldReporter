app.posts = {
    defaultOptions : function() {
        return {
            mapzoom : 1,
            mapwidth: 200,
            mapheight: 200,
            skip : 0,
            take : 10,
            imageSize : "small",
            includeArticles : true 
        };
    },
    _mode : "recent",
    _query : null,
    setMode : function(mode) {
        app.posts._mode = mode;
        app.posts.search(this._query);
    },
    search : function(query) {
        app.posts._query = query;
        var options = this.defaultOptions();
        options.query = query || "*";

        var url = "/en/fieldreporter/search";
        if(app.posts._mode == "recent")
            url = "/en/fieldreporter/search";
        else if(app.posts._mode == "nearby")
        {
            url = "/en/fieldreporter/near";
            options.latitude = app.geolocation.latitude;
            options.longitude = app.geolocation.longitude;
            options.radius = 100;
        }
        else if(app.posts._mode == "latitude")
        {
            url = "/en/fieldreporter/latitude";
            options.latitude = app.geolocation.latitude;
            options.degrees = 10;
        }
        
        app.working("Getting posts...");
        $.get(app.getRemoteUrl(url), options, function(res) {
            app.working(false);
            app.posts.scatter(res);
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
};

app.posts.latest = {
    saveToCache : function(p) {
        if(p != null)
            window.localStorage.setItem("LATESTPOSTS", JSON.stringify(p));
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
        var mosaic = "";
        var mosaicHolder = $("#photo-mosaic");
        var mwidth = ($(document).width() / 2) - 4;

        if(res != null && res.length > 0)
        {
            var tmp = $("#post-card").html();
            var mtemp = $("#mosaic-template").html();
            var h = "";
            for(var i = 0; i < res.length; i++)
            {
                var d = app.dateTimeReviver(null, res[i].ObservationDate);
                res[i].ObservationDateFriendly = moment(d).format("MMM Do, YYYY");
                h += Mustache.render(tmp, res[i]);
                res[i].MosaicWidth = mwidth;
                res[i].MosaicHeight = mwidth;
                mosaic += Mustache.render(mtemp, res[i]);
            }
            $("#latest").html(h);
        }
        else
        {
            $("#latest").html("<h3 class='nonefound'>Unable to get latest posts from the LEO Network.</h3>");
        }

        mosaicHolder.html(mosaic);
    },
    refresh : function() {
        this.getFromCache(function(res) {
            //immediately load from cache/bundle
            console.log("showing latest from the cache/bundle");
            app.posts.latest.scatter(res);

            //once that's done, try loading from server
            app.posts.latest.getFromServer(function(res) {
                //this saves to cache internally
                console.log("showing latest from the server");
                app.posts.latest.scatter(res);
            });
        });

        
    }
};