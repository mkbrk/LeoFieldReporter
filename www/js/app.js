
var app = {
    notify : function(message) {
        new $.nd2Toast({ 
            message : message
        });
    },

    //this should be useful on other apps
    settings : {
        _values : {
            RootUrl : "https://leonetwork-staging.azurewebsites.net",
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
    },

    observation : {
        current : null,
        initialize : function() {

            this.current = this.defaultObservation();

            var self = this;
            $(".observation-page").find("input,textarea").on("change", function(e) {
                var n = $(this).attr("name");
                if(self.current == null)
                    self.current = self.defaultObservation();

                self.current[n] = $(this).val();
                
                if(n == "ObservationTitle")
                    self.setTitle();
                self.save();
            });

            $(".observation-page").find(".category-block").on("change", function(e) {
                //spin through and gather them all
                self.categories.gather();
                self.save();
            });

        },
        setCurrent : function(data) {
            this.current = data;
            //note that this doesn't save it - 
            //that doesn't happen until some of the data are changed
            //this is to prevent overly chatty "continue editing?" messages
        },
        hasUnsavedDraft : function() {
            return this.getUnsavedDraft() != null;
        },

        getUnsavedDraft : function() {
            return this.get("UNSAVEDOBSERVATION");
        },
        setTitle : function() {
            if(this.current != null)
            {
                if(this.current.ObservationTitle)      
                    $("#current-observation-title").html(this.current.ObservationTitle);
                else
                    $("#current-observation-title").html("");
            }
            else
            {
                $("#current-observation-title").html("");
            }
        },
        defaultObservation : function() {
            return {
                ObservationTitle: null,
                ObservationDate: moment().format("YYYY-MM-DD"),
                ObservationDescription: null,
                LocationLat: null,
                LocationLng: null,
                Categories: [],
                Photos: [],
                Videos: [],
                AudioRecordings: [],
                Files: [],
                //metadata fields
                _ID : "UNSAVEDOBSERVATION",
                _CURRENTSTEP:"headline-page",
                _STATUS: "current",
                _CREATED: moment().format("YYYY-MM-DD"),
                _UPDATED: moment().format("YYYY-MM-DD")
            };
        },
        abandon : function() {
            var self = this;
            navigator.notification.confirm("Are you sure?", function(btn) {
                if(btn == 1)
                {
                    self.startOver();
                    app.notify("Deleted your observation.");
                }
            });
        },
        getKey : function(prefix) {
            var rand = 1000 * Math.random();
            return prefix + "_" + rand;
        },
        get : function(id) {
            var c = window.localStorage.getItem(id);
            if(c != null)
                return JSON.parse(c);
            else
                return null;
        },
        list : function(prefix) {
            var d = [];
            for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                if (key.indexOf(prefix) == 0) {
                    d.push(JSON.parse(window.localStorage.getItem(key)));
                }
            }
            return d;
        },
        count : function(prefix) {
            var c = 0;
            for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                if (key.indexOf(prefix) == 0) {
                    c++;
                }
            }
            return c;
        },
        remove : function(id) {
            window.localStorage.removeItem(id);
        },
        save : function(obs) {
            if(!obs || obs == null)
            {
                if(this.current != null)
                {
                    this.save(this.current);
                }
            }
            else
            {
                if(!obs._ID || obs._ID == null)
                obs._ID = "UNSAVEDOBSERVATION";

                obs._UPDATED = moment().format("YYYY-MM-DD");
                window.localStorage.setItem(obs._ID, JSON.stringify(obs));
            }
        },
        saveAsDraft : function() {
            //takes the current observation and stashes it in a draft
            this.current._STATUS = "draft";
            var doStartOver = false;
            if(this.current._ID == null || this.current._ID == "UNSAVEDOBSERVATION")
            {
                doStartOver = true;
                this.current._ID = this.getKey("DRAFT");
            }

            window.localStorage.setItem(this.current._ID, JSON.stringify(this.current));
            if(doStartOver)
            {
                //only start over if an unsaved observation was saved
                this.startOver();
                app.notify("Saved your draft. It's available in your Drafts area.");
            }
            else
            {
                app.notify("Saved your draft.");
            }

        },
        edit : function(obs) {
            this.setCurrent(obs || this.defaultObservation());
            this.scatter();
        },
        start : function() {
            if(this.hasUnsavedDraft())
            {
                this.edit(this.getUnsavedDraft());
                this.show("continue-page");
            }
            else
            {
                this.edit();
                this.show("headline-page");
            }
        },
        dumpToConsole : function() {
            if(this.current != null)
            {
                console.log(JSON.stringify(this.current));
            }
        },
        drafts : {
            get : function(id) {
                return app.observation.get(id);
            },
            list : function() {
                return app.observation.list("DRAFT");
            } ,
            count : function() {
                return app.observation.count("DRAFT");
            },
            edit : function(id) {
                var d = this.get(id);
                if(d != null)
                {
                    app.observation.edit(d);
                }
                else
                {
                    app.notify("Can't find your draft.");
                }
            },
            send : function(id) {
                //moves the given draft to the outbox
                var obs = app.observation.current;

                if(id && id != null)
                    obs = app.observation.get(id);

                var deleteMe = obs._ID;

                if(obs != null)
                {
                    obs._ID = app.observation.getKey("PENDING");
                    obs._STATUS = "waiting to send";
                    app.observation.save(obs);
                    app.observation.remove(deleteMe);
                    app.observation.startOver();
                    app.notify("Your draft was queued for sending. You can still access it in your Outbox.");
                    app.showPage("observation");
                }
            }
        },
        outbox : {
            get : function(id) {
                return app.observation.get(id);
            },
            list : function() {
                return app.observation.list("PENDING");
            },
            count : function() {
                return app.observation.count("PENDING");
            }  ,
            edit : function(id) {
                //takes this draft out of the outbox, puts it back in drafts, and opens it for editing
                var obs = app.observation.get(id);
                if(obs != null)
                {
                    obs._ID = app.observation.getKey("DRAFT");
                    obs._STATUS = "draft";
                    app.observation.save(obs);
                    app.observation.remove(id);
                    app.observation.drafts.edit(obs._ID);
                    app.showPage("observation");
                }
            }
        },
        sent : {
            get : function(id) {
                return app.observation.get(id);
            },
            list : function() {
                return app.observation.list("SENT");
            }  ,
            count : function() {
                return app.observation.count("SENT");
            }
        },
        scatter : function() {
            if(this.current != null)
            {

                //scatters variables into editing fields
                var self = this;

                //text/textarea
                $(".observation-page input,textarea").each(function() {
                    var n = $(this).attr("name");
                    if(self.current.hasOwnProperty(n))
                        $(this).val(self.current[n]);
                    else
                        $(this).val("");
                });

                self.categories.scatter();
                self.photos.scatter();
            }

            this.setTitle();
        },
        categories : {
            scatter : function() {
                var current = app.observation.current;

                //checkers
                $(".observation-page .category-block").each(function () {
                    var val = $(this).attr("category");
                    $(this).removeClass("selected");
                    if (current.Categories != null && current.Categories.length > 0)
                    {
                        for (var i = 0; i < current.Categories.length; i++) {
                            if(val == current.Categories[i])
                                $(this).addClass("selected");
                        }
                    }                    
                });
            },
            gather : function() {
                app.observation.current.Categories = [];
                $(".observation-page .category-block").each(function() {
                    if($(this).hasClass("selected"))
                        app.observation.current.Categories.push($(this).attr("category"));
                });

            }
        },        
        deleteDraft : function() {
            if(this.current != null)
            {
                var self = this;
                navigator.notification.confirm("Are you sure?", function(btn) {
                    if(btn == 1)
                    {
                        self.remove(self.current._ID);
                        self.startOver();
                        app.notify("Deleted your draft.");        
                    }
                });
            }
        },
        startOver : function() {
            this.remove("UNSAVEDOBSERVATION");
            this.edit();
            this.show("headline-page");
        },
        //navigation functions
        next : function() {
            var pages = $(".observation-page");
            for (var i = 0; i < pages.length - 1; i++) {
                if($(pages[i]).is(":visible"))
                {
                    this.show($(pages[i+1]).attr("id"));
                    break;
                }
            }
        },
        previous : function() {
            var pages = $(".observation-page");
            for (var i = 1; i < pages.length; i++) {
                if($(pages[i]).is(":visible"))
                {
                    this.show($(pages[i-1]).attr("id"));
                    break;
                }
            }
        },
        continueEditing : function() {
            if(this.current != null)
            {
                if(this.current._CURRENTSTEP != null)
                    this.show(this.current._CURRENTSTEP);
                else
                    this.next();
            }
        },
        show : function (id) {
            $(".observation-page").hide();
            if(id != "continue-page" && this.current != null)
            {
                this.current._CURRENTSTEP = id;
            }
			$("#" + id).fadeIn();
        },
        photos : {
            scatter : function() {
                var tmp = $("#photo-thumbnail-template").html();
                $("#photo-thumbnails").html("");
                var h = "";
                var current = app.observation.current;
                for(var i = 0; i < current.Photos.length; i++)
                {
                    current.Photos[i].Index = i; //needed for the template
                    h += Mustache.render(tmp, current.Photos[i]);
                }
                $("#photo-thumbnails").html(h);
            },
            add : function() {
                var self = this;
                var current = app.observation.current;
                var opts = {
                    quality : 50,
                    destinationType : Camera.DestinationType.FILE_URI,
                    sourceType : Camera.PictureSourceType.CAMERA,
                    allowEdit : true,
                    encodingType: Camera.EncodingType.JPEG,
                    targetWidth: 1000,
                    targetHeight: 1000,
                    mediaType: Camera.MediaType.PICTURE,
                    correctOrientation: true,
                    saveToPhotoAlbum : false, //could make this an option later
                    popoverOptions : null, //IOS thing
                    cameraDirection : Camera.Direction.BACK //could make this an option too
                };
    
                navigator.camera.getPicture(function(imgData) {
                    
                    var att = {
                        Data: imgData,
                        Caption: null
                    }
    
                    current.Photos.push(att);
                    app.observation.save();

                    self.scatter();
                        
                }, function(errorMsg) {
                    navigator.notification.alert(errorMsg, null, "Error", "OK");
                }, opts);
            },
    
            remove : function(i) {
                
            }
        }

    },

    
    initialize: function() {
        
    },

    showingPage : function(id) {
        //use this to run some code upon showing a page
        var $el = $("#" + id);
        if(id == "settings")
        {
            app.settings.scatter();
        } 
        else if(id == "drafts")
        {
            var drafts = this.observation.drafts.list();
            if(drafts.length > 0)
            {
                var template = $("#drafts-template").html();
                h = Mustache.render(template, {drafts:drafts});
                $el.find(".ui-content").html(h);
                $el.find(".ui-content ul").listview();
            }
            else
            {
                $el.find(".ui-content").html("<h3 class='nonefound'>No drafts</h3>");
            }
        }
        else if(id == "outbox")
        {
            var drafts = this.observation.outbox.list();
            if(drafts.length > 0)
            {
                var template = $("#outbox-template").html();
                h = Mustache.render(template, {drafts:drafts});
                $el.find(".ui-content").html(h);
                $el.find(".ui-content ul").listview();
            }
            else
            {
                $el.find(".ui-content").html("<h3 class='nonefound'>Nothing in your Outbox</h3>");
            }
        }
        else if(id == "observation")
        {
        }
    },
    getRemoteUrl : function(path) {
        //TODO: get the URL root from config file
        //return "https://www.leonetwork.org" + path;
        return app.settings.get("RootUrl") + path; //maybe a cert issue? - nope
    },
    showPage: function(id)
    {
        app.showingPage(id);
        $.mobile.changePage("#" + id);
        //$.mobile.navigate("#" + id);
        $('#leftpanel').panel('close'); //make sure this is closed
    },
    getToken : function() {
        var storage = window.localStorage;
        return storage.getItem("TOKEN");  
    },
    isSignedIn : function() {
        var storage = window.localStorage;
        var token = storage.getItem("TOKEN");  
        if(token && token != null)
            return true;
        else
            return false;
    },
    signIn : function() {
        app.showPage("sign-in");
    },
    signOut : function() {
        var storage = window.localStorage;
        var token = storage.removeItem("TOKEN");  
        app.showPage("home");
    },
    postJson : function(url, data, callback) {
        var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
        xmlhttp.addEventListener("load", function() {
            if(callback)
                callback(JSON.parse(this.responseText));
        });
        xmlhttp.open("POST", url);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.send(JSON.stringify(data));
    },
    doSignIn: function() {
        var email = $("#sign-in").find("[name=LoginName]").val();
        var pwd = $("#sign-in").find("[name=Password]").val();

        var postMe = JSON.stringify({LoginName:email, Password:pwd});

        $.post(app.getRemoteUrl("/en/fieldreporter/signin"), postMe, function(res) {
            if(res.Status == "OK")
            {
                var token = res.Token;
                var storage = window.localStorage;
                storage.setItem("TOKEN", token);    
                app.showPage("home");        
                app.notify("Signed in.");
            }
            else
            {
                $("#sign-in").find("[name=Password]").val("");
                navigator.notification.alert(res.Message, null, "Error", "OK");
            }
        }, "json");

        return;

        app.postJson(app.getRemoteUrl("/en/fieldreporter/signin"), {LoginName:email, Password:pwd}, function(res) {
            if(res.Status == "OK")
            {
                var token = res.Token;
                var storage = window.localStorage;
                storage.setItem("TOKEN", token);    
                app.showPage("make-observation-page");        
            }
            else
            {
                $("#sign-in-page").find("[name=Password]").val("");
                navigator.notification.alert(res.Message, null, "Error", "OK");
            }
        });

        return;

        

        //$.ajax({
        //    type: "POST",
        //    url: app.getRemoteUrl("/en/members/remoteauth"),
        //    dataType: "json",
        //    data: JSON.stringify({LoginName:email, Password:pwd}),
        //    success: function(data) {
        //        console.log(data);
        //        res = JSON.parse(data);

        //        var token = res.Token;
        //        var storage = window.localStorage;
        //        storage.setItem("TOKEN", token);    
        //        app.showPage("make-observation-page");    
        //    },
        //    error: function(e) {
        //        $("#sign-in-page").find("[name=Password]").val("");
        //        navigator.notification.alert(e.Message, null, "Error", "OK");
        //    }
        // });

        
    }
};
