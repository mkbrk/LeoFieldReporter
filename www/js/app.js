
var app = {
    notify : function(message) {
        new $.nd2Toast({ 
            message : message
        });
    },

    dateTimeReviver : function (key, value) {
        var a;
        if (typeof value === 'string') {
            a = /\/Date\((\d*)\)\//.exec(value);
            if (a) {
                return new Date(+a[1]);
            }
        }
        return value;
    },

    //some stuff to get posts from LEO - maybe useful elsewhere
    latest : {
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
                $.get(app.getRemoteUrl("/en/fieldreporter/latest"), null, function(res) {
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
    },

    resources : {
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
    },

    //this should be useful on other apps
    settings : {
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
                var s = "<span class='status-badge' style='background-color:" + this.statuses[this.current._STATUS].color + "'>" + this.statuses[this.current._STATUS].name + "</span>"
                if(this.current.ObservationTitle)      
                    $("#current-observation-title").html(s + " " + this.current.ObservationTitle);
                else
                    $("#current-observation-title").html(s);
            }
            else
            {
                $("#current-observation-title").html("");
            }
        },
        
        //statuses:
        //1. unsaved draft
        //2. draft (once saved as a draft or edited while waiting to send)
        //3. waiting to send (once moved to the outbox)
        //4. sending (once the send loop has it) - this is multipart process including all attachments, etc.
        //5. sent (once the sending process is done)

        statuses : {
            "U" : {
                name : "Unsaved Draft", 
                color: "#607D8B",
                next: ["D","W"],
                key : "UNSAVEDOBSERVATION"
            },
            "D" : {
                name : "Draft",
                color: "#03A9F4",
                next : ["W"],
                key : "DRAFT_#"
            },
            "W" : {
                name : "Waiting to Send",
                color: "#673AB7",
                next: ["D", "P"],
                key : "PENDING_#"
            },
            "P" : {
                name : "Sending",
                color: "#FF5722",
                next: ["S", "E"],
                key : "PENDING_#"
            },
            "E" : {
                name: "Send Error",
                color: "#E91E63",
                next: ["P"],
                key : "PENDING_#"
            },
            "S" : {
                name : "Sent",
                color : "#4CAF50",
                next: [],
                key : "SENT_#"
            }
        },
        setStatus : function(status, obj) {
            if(!obj || obj == null)
                obj = app.observation.current;

            if(obj._STATUS != status) //only if the status has changed
            {
                var curr = this.statuses[obj._STATUS];
                var next = this.statuses[status];
                if(curr != null && next != null)
                {
                    if(curr.next.indexOf(status) >= 0)
                    {
                        var oldID = obj._ID; //will save over the old one

                        //get a new ID for it
                        var rand = 1000 * Math.random();
                        var newID = next.key.replace("#", rand);

                        obj._ID = newID;
                        obj._STATUS = status;
                        obj.Status = next;

                        app.observation.save(obj);
                        app.observation.remove(oldID);

                        return true;
                    }
                    else
                        return false;
                }
                else
                    return false;
            }
            else
            {
                return true;
            }

        },
        defaultObservation : function() {
            return {
                ObservationID: null, //will be filled in once it is saved to server
                ObservationTitle: null,
                ObservationDate: moment().format("YYYY-MM-DD"),
                ObservationDescription: null,
                LocationLat: null,
                LocationLng: null,
                LocationDescription : null,
                Categories: [],
                Photos: [],
                Videos: [],
                AudioRecordings: [],
                Files: [],
                //metadata fields
                _ID : "UNSAVEDOBSERVATION",
                _CURRENTSTEP:"headline-page",
                _STATUS: "U",
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
            {
                var o = JSON.parse(c);
                o.Status = app.observation.statuses[o._STATUS];

                return o;
            }
            else
                return null;
        },
        list : function(prefix) {
            //this should be the only place we do an access like this
            var d = [];
            for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                if (key.indexOf(prefix) == 0) {
                    d.push(JSON.parse(window.localStorage.getItem(key)));
                }
            }

            //merges the status info into the objects
            d.forEach(function(val) {
                val.Status = app.observation.statuses[val._STATUS];
            });

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
            app.observation.setStatus("D"); //saves internally
            app.showPage("saved-draft-confirmation");
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
        sendNext : function() {
            var ob = app.observation.outbox.list();
            for(var i = 0; i < ob.length; i++)
            {
                if(ob[i]._STATUS == "W") //waiting to send
                {
                    this.send(ob[i]._ID);
                }
            }
        },
        //sends a single one by key
        send : function (key)
        {
            if (app.isSignedIn() && navigator.onLine) {
                var obj = app.observation.outbox.get(key);
                if(obj && obj != null)
                {
                    if(obj._STATUS == "P" || app.observation.setStatus("P", obj)) //already sending or can send
                    {
                        obj._ERROR = null; //clear this out so that it can be reset if an error happens
                        app.observation.save(obj);

                        if(obj.ObservationID && obj.ObservationID != null)
                        {
                            console.log("Already sent observation...sending attachments now");
                            //if already have the ObservationID - just save the attachments
                            app.observation.sendAttachments(obj);
                        }
                        else
                        {
                            console.log("Sending observation.");
                            //otherwise, need to save this to the server first
                            $.ajax({
                                url: app.getRemoteUrl("/en/fieldreporter/send"),
                                method: "POST",
                                contentType: 'application/json; charset=utf-8',
                                dataType: "json",
                                data: JSON.stringify(obj),
                                headers: {
                                    "x-leo-header": app.getToken()
                                }, 
                                success : function (res) {
                                    if(res.Status == "OK")
                                    {
                                        console.log("Saved observation with ID " + res.ObservationID);
                                        obj.ObservationID = res.ObservationID;
                                        app.observation.save(obj);
                                        app.observation.sendAttachments(obj);
                                    }
                                    else
                                    {
                                        console.log("error from the server: " + res.Message);
                                        obj._ERROR = res.Message;   
                                        app.observation.setStatus("E", obj);
                                    }
                                },
                                error : function(jqr, status) {
                                    console.log("error at the network level:" + status);
                                    obj._ERROR = status;   
                                    app.observation.setStatus("E", obj);
                                }
                            });
                        }
                    }
                    else    
                        console.log("Can't be sent in that state - must be in status P or W.");   
                }
                else
                    console.log("Invalid object key.");   
            }
            else
            {
                console.log("You are either not online or not signed in.");   
            }
        },
        sendAttachments : function(obj) {
            if(navigator.onLine)
            {
                if(obj && obj != null)
                {
                    if(obj._STATUS == "P") //"Sending"
                    {
                        if(obj.ObservationID && obj.ObservationID != null)
                        {
                            console.log("Sending photos");
                            var sendMe = [];
                            
                            for(var i = 0; i < obj.Photos.length; i++)
                            {
                                if(!obj.Photos[i].AttachmentID || obj.Photos[i].AttachmentID == null)
                                    sendMe.push(obj.Photos[i]);
                            }

                            for(var i = 0; i < obj.Videos.length; i++)
                            {
                                if(!obj.Videos[i].AttachmentID || obj.Videos[i].AttachmentID == null)
                                    sendMe.push(obj.Videos[i]);
                            }


                            for(var i = 0; i < sendMe.length; i++)
                            {
                                var clone = JSON.parse(JSON.stringify(sendMe[i]));
                                window.resolveLocalFileSystemURL(clone.Data, function(fileEntry) {
                                    fileEntry.file(function(file) {
                                        console.log("About to read file: " + file.name);
                                        console.log(file.size);
                                        var reader = new FileReader();
                                 
                                        reader.onloadend = function() {
                                            console.log("Read file, ready to send it");

                                            clone.Data = this.result;

                                            $.ajax({
                                                url: app.getRemoteUrl("/en/fieldreporter/attach/" + obj.ObservationID),
                                                method: "POST",
                                                contentType: 'application/json; charset=utf-8',
                                                dataType: "json",
                                                data: JSON.stringify(clone),

                                                success : function (res) {
                                                    console.log("Success sending attachment");
                                                    console.log(JSON.stringify(res));

                                                    if(res.Status == "OK")
                                                    {
                                                        sendMe[i]._STATUS = "sent";
                                                        sendMe[i].AttachmentID = res.AttachmentID;
                                                    }
                                                    else
                                                    {
                                                        sendMe[i]._STATUS = "error";
                                                        sendMe[i]._MESSAGE = res.Message;   
                                                    }
                                                    app.observation.save(obj);
                                                },
                                                error : function(jqr, status) {
                                                    console.log(status);
                                                    sendMe[i]._STATUS = "error";
                                                    sendMe[i]._MESSAGE = status;   
                                                    app.observation.save(obj);
                                                }
                                            });
                                        };
                                 
                                        reader.readAsDataURL(file);
                                     }, function(err) {
                                         console.log(err);
                                     });
                                });
                            }
                        }
                        else
                        {
                            console.log("ObservationID not present...can't send attachments.");
                        }
                    }
                    else
                    {
                        console.log("Can only send attachments while sending is in progress...");
                    }
                }
                else
                    console.log("No data provided for observation.");
            }
            else
            {
                console.log("Not online.")
            }
        },
        addAttachmentData : function(att) {

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
                    app.observation.setStatus("W");
                    app.observation.startOver();
                    app.showPage("sent-draft-confirmation");
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
                    app.observation.setStatus("D", obs);
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
                self.videos.scatter();
                self.geolocation.scatter();
            }

            this.setTitle();
        },
        geolocation : {
            supported : function() {
                return ("geolocation" in navigator);
            },
            getCurrent : function() {
                var self = this;
                if(this.supported())
                {
                    navigator.geolocation.getCurrentPosition(function (position) {
                        app.observation.current.LocationLat = position.coords.latitude;
                        app.observation.current.LocationLng = position.coords.longitude;
                        app.observation.save();
                        self.scatter();
                        app.notify("Got your current location.");
                    }, function(error) {
                        app.notify(error.message + " (code " + error.code + ")");
                    });
                }
            },
            scatter : function() {
                $("#location-page input[name='LocationLat']").val(app.observation.current.LocationLat);
                $("#location-page input[name='LocationLng']").val(app.observation.current.LocationLng);
                $("#location-page input[name='LocationDescription']").val(app.observation.current.LocationDescription);

                if(app.observation.current.LocationLat != null && app.observation.current.LocationLng != null)
                {
                    $("#location-page .nonefound").html("" + app.observation.current.LocationLat + "," + app.observation.current.LocationLng);
                }
                else
                {
                    $("#location-page .nonefound").html("Location Unknown");
                }

                //TODO: probably make some changes to the page - i.e. show the lat/lng
            }
        },
        categories : {
            saveToCache : function(categories) {
                if(categories != null)
                    window.localStorage.setItem("CATEGORIES", JSON.stringify(categories));
            },
            getFromCache : function(callback) {
                var c = window.localStorage.getItem("CATEGORIES");
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
                    console.log("got categories from server");
                    $.get(app.getRemoteUrl("/en/fieldreporter/categories"), null, function(res) {
                        self.saveToCache(res);
                        if(callback)    
                            callback(res);
                    }, "json");
                }    
            },
            getFromBundle : function(callback) {
                $.get("data/categories.json", null, function(res) {
                    if(callback)    
                        callback(res);
                }, "json");
            },
            refresh : function() {
                var self = this;
                this.getFromCache(function(res) {
                    self.setup(res);
                    self.getFromServer(function(res) {
                        self.saveToCache(res);
                        self.setup(res);
                    });
                });
            },
            setup : function(res) {
                var template = $("#category-block-template").html();
                Mustache.parse(template);

                var groups = {
                    NATURAL:[],
                    HUMAN:[],
                    EVENT:[]
                }
                for (var i = 0; i < res.length; i++) {
                    if(res[i].GroupID && res[i].GroupID != null)
                    {
                        var h = Mustache.render(template, res[i]);
                        groups[res[i].GroupID].push(h);
                    }
                };

                $("#categories_NATURAL").html(groups.NATURAL.join(""));
                $("#categories_EVENT").html(groups.EVENT.join(""));
                $("#categories_HUMAN").html(groups.HUMAN.join(""));

                for (var i = 0; i < res.length; i++) {
                    //this is important for getting it to scale properly
                    $("#categoryblock-" + res[i].CategoryID).find("svg").attr("width", "60").attr("height", "60");
                };

                //does language replacements
                app.resources.replaceAll(document.getElementById("categories_NATURAL"));
                app.resources.replaceAll(document.getElementById("categories_EVENT"));
                app.resources.replaceAll(document.getElementById("categories_HUMAN"));
            },
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
            var showme = $("#" + id);

            //pages can control the navigation a little bit
            if(showme.attr("show-next") == "false")
                $(".next").hide();
            else
                $(".next").show();

            if(showme.attr("show-previous") == "false")
                $(".previous").hide();
            else
                $(".previous").show();

			showme.fadeIn();
        },
        photos : {
            scatter : function() {
                var tmp = $("#photo-thumbnail-template").html();
                $("#photos-page .thumbnails").html("");
                var h = "";
                var current = app.observation.current;
                for(var i = 0; i < current.Photos.length; i++)
                {
                    current.Photos[i].Index = i; //needed for the template
                    h += Mustache.render(tmp, current.Photos[i]);
                }
                $("#photos-page .thumbnails").html(h);
            },
            add : function(srcType) {
                var self = this;
                if(!srcType || srcType == null)
                    srcType = Camera.PictureSourceType.CAMERA;
                var current = app.observation.current;
                var opts = {
                    quality : 50,
                    destinationType : Camera.DestinationType.FILE_URI,
                    sourceType : srcType,
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
                        Caption: null,
                        Attribution : null,
                        ContentType : "image/jpg"
                    }
    
                    current.Photos.push(att);
                    app.observation.save();

                    self.scatter();
                        
                }, function(errorMsg) {
                    app.notify(errorMsg);
                }, opts);
            },
    
            remove : function(i) {
                //TODO: might want to cleanup the cache library...
                var self = this;
                if(app.observation.current.Photos.length > i)
                {
                    navigator.notification.confirm("Are you sure?", function(btn) {
                        if(btn == 1)
                        {
                            app.observation.current.Photos.splice(i, 1);
                            app.observation.save();
                            self.scatter();
                            app.notify("Deleted your photo.");
                        }
                    });

                }
            }
        },
        videos : {
            scatter : function() {
                var tmp = $("#video-thumbnail-template").html();
                $("#videos-page .thumbnails").html("");
                var h = "";
                var current = app.observation.current;
                for(var i = 0; i < current.Videos.length; i++)
                {
                    current.Videos[i].Index = i; //needed for the template
                    h += Mustache.render(tmp, current.Videos[i]);
                }
                $("#videos-page .thumbnails").html(h);
            },
            record : function() {
                var self = this;
                var current = app.observation.current;

                navigator.device.capture.captureVideo(function(mediaFiles) {
                    if(mediaFiles.length > 0)
                    {
                        mediaFiles[0].getFormatData(function(mediaFileData) {

                            var att = {
                                Data: mediaFiles[0].fullPath,
                                Type : mediaFiles[0].type,
                                Size : mediaFiles[0].size,
                                Duration : mediaFileData.duration,
                                Caption: null
                            }
    
                            current.Videos.push(att);
                            app.observation.save();
        
                            self.scatter();
                        });

                    }

                }, function(error) {
                    app.notify(error.message);
                }, {limit:1, duration: 30});
            },
            choose : function() {
                var self = this;
                var current = app.observation.current;
                var opts = {
                    destinationType : Camera.DestinationType.FILE_URI,
                    sourceType : Camera.PictureSourceType.SAVEDPHOTOALBUM,
                    mediaType: Camera.MediaType.VIDEO,
                    popoverOptions : null //IOS thing
                };
    
                navigator.camera.getPicture(function(imgData) {
                    
                    var att = {
                        Data: imgData,
                        Caption: null
                    }

                    current.Videos.push(att);
                    app.observation.save();

                    self.scatter();
                        
                }, function(errorMsg) {
                    app.notify(errorMsg);
                }, opts);
            },
    
            remove : function(i) {
                var self = this;
                //TODO: might want to cleanup cached files
                if(app.observation.current.Videos.length > i)
                {
                    navigator.notification.confirm("Are you sure?", function(btn) {
                        if(btn == 1)
                        {
                            app.observation.current.Videos.splice(i, 1);
                            app.observation.save();
                            self.scatter();
                            app.notify("Deleted your video.");
                        }
                    });

                }
            }
        },
        audio : {
            scatter : function() {
                var tmp = $("#audio-thumbnail-template").html();
                $("#audio-page .thumbnails").html("");
                var h = "";
                var current = app.observation.current;
                for(var i = 0; i < current.AudioRecordings.length; i++)
                {
                    current.AudioRecordings[i].Index = i; //needed for the template
                    h += Mustache.render(tmp, current.AudioRecordings[i]);
                }
                $("#audio-page .thumbnails").html(h);
            },
            record : function() {
                var self = this;
                var current = app.observation.current;

                navigator.device.capture.captureAudio(function(mediaFiles) {
                    if(mediaFiles.length > 0)
                    {
                        mediaFiles[0].getFormatData(function(mediaFileData) {

                            var att = {
                                Data: mediaFiles[0].fullPath,
                                Type : mediaFiles[0].type,
                                Size : mediaFiles[0].size,
                                Duration : mediaFileData.duration,
                                Caption: null
                            }
    
                            current.AudioRecordings.push(att);
                            app.observation.save();
        
                            self.scatter();
                        });

                    }

                }, function(error) {
                    app.notify(error);
                }, {limit:1});
            },
    
            remove : function(i) {
                var self = this;
                //TODO: might want to cleanup cached files
                if(app.observation.current.AudioRecordings.length > i)
                {
                    navigator.notification.confirm("Are you sure?", function(btn) {
                        if(btn == 1)
                        {
                            app.observation.current.AudioRecordings.splice(i, 1);
                            app.observation.save();
                            self.scatter();
                            app.notify("Deleted your recording.");
                        }
                    });

                }
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
        else if(id == "sign-in")
        {
            $el.find("[name=LoginName]").val(window.localStorage.getItem("LOGIN"));
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
                $el.find(".ui-content").html("<h3 class='nonefound'>No Drafts</h3>");
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
        else if(id == "sent")
        {
            var drafts = this.observation.sent.list();
            if(drafts.length > 0)
            {

                var template = $("#sent-template").html();
                h = Mustache.render(template, {drafts:drafts});
                $el.find(".ui-content").html(h);
                $el.find(".ui-content ul").listview();
            }
            else
            {
                $el.find(".ui-content").html("<h3 class='nonefound'>No Sent Observations</h3>");
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
    signedInAs : function() {
        var storage = window.localStorage;
        return storage.getItem("LOGIN");
    },
    signIn : function() {
        app.showPage("sign-in");
    },
    signOut : function() {
        var storage = window.localStorage;
        storage.removeItem("TOKEN");  
        app.notify("You have been signed out.");
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
                storage.setItem("LOGIN", email); 
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
