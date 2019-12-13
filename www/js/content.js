app.content = {
    saveToCache : function(data) {
        if(data != null)
            window.localStorage.setItem("PAGES", JSON.stringify(data));
    },
    getFromCache : function(callback) {
        var c = window.localStorage.getItem("PAGES");
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
            $.get(app.getRemoteUrl("/en/fieldreporter/pages"), null, function(res) {
                self.saveToCache(res);
                if(callback)    
                    callback(res);
            }, "json");
        }

    },
    getFromBundle : function(callback) {
        $.get("data/pages.json", null, function(res) {
            if(callback)    
                callback(res);
        }, "json");
    },
    show : function(id) {
        $("#page-container .ui-content").find("div.article").hide();
        $("#page-container .ui-content").find("#article-" + id).show();

        app.showPage("page-container");
    },
    scatter : function(res) {
        var list = $("#pages-list");
        list.html("");

        if(res != null)
        {
            var h = "";
            var pages = "";
            var culture = app.settings.get("Language", "en");
            var tmp = $("#article-template").html();
            var wtmp = $("#welcome-template").html();
            Mustache.parse(tmp);

            for(var i = 0; i < res.length; i++)
            {
                var localization = null;
                for(var j = 0; j < res[i].Localizations.length; j++)
                {
                    if(res[i].Localizations[j].Culture == culture)
                    {
                        localization = res[i].Localizations[j];
                        break;
                    }
                }
                if(localization == null)
                {
                    if(res[i].Title != "Welcome")
                    {
                        h +=  "<li><a href=\"javascript:app.content.show('" + res[i].ArticleID + "');\">" + res[i].TitleHtml + "</a></li>";
                        pages += Mustache.render(tmp, res[i]);    
                    }
                    else
                    {
                        res[i].Attachments.sort(() => Math.random() - 0.5);
                        var welcome = Mustache.render(wtmp, res[i]);
                        $("#welcome .ui-content").html(welcome);
                    }
                }
                else
                {
                    //got to fix this up so that the localized attachments have the actual attachment data
                    //these make the template work
                    localization.ArticleID = res[i].ArticleID;
                    if(localization.Attachments != null)
                    {
                        for(var j = 0; j < localization.Attachments.length; j++)
                        {
                            var raw = null;
                            for(var k = 0; k < res[i].Attachments.length; k++)
                            {
                                if(res[i].Attachments[k].AttachmentID == localization.Attachments[j].AttachmentID)
                                    raw = res[i].Attachments[k].Base64Data;
                            }
                            localization.Attachments[j].Base64Data = raw;
                        }
                    }
                    if(res[i].Title != "Welcome")
                    {
                        h +=  "<li><a href=\"javascript:app.content.show('" + res[i].ArticleID + "');\">" + localization.TitleHtml + "</a></li>";
                        pages += Mustache.render(tmp, localization);
                    }
                    else
                    {
                        localization.Attachments.sort(() => Math.random() - 0.5);
                        var welcome = Mustache.render(wtmp, localization);
                        $("#welcome .ui-content").html(welcome);
                    }
                }
            }

            $("#page-container .ui-content").html(pages);
            list.html(h);
        }

        list.listview("refresh");
    },
    refresh : function() {
        this.getFromCache(function(res) {
            //immediately load from cache/bundle
            console.log("showing PAGES from the cache/bundle");
            app.content.scatter(res);

            //once that's done, try loading from server
            app.content.getFromServer(function(res) {
                //this saves to cache internally
                console.log("showing PAGES from the server");
                app.content.scatter(res);
            });
        });   
    }
};