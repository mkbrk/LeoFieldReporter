
app.observation = {
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
    //this one gets the geolocation and adds it to the observation
    //hence the callback
    getDefaultObservation : function(callback) {
        var obs = this.defaultObservation();
        if(app.observation.geolocation.supported())
        {
            navigator.geolocation.getCurrentPosition(function (position) {
                obs.LocationLat = position.coords.latitude;
                obs.LocationLng = position.coords.longitude;
                if(callback)
                    callback(obs);
            }, function(error) {
                if(callback)
                    callback(obs);
            });
        }
    },
    defaultObservation : function() {
        return {
            ObservationID: null, //will be filled in once it is saved to server
            ObservationTitle: null,
            ObservationDate: moment().format("YYYY-MM-DD"),
            ObservationText: null,
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
                self.remove(self.current._ID);
                app.showPage("home");
                app.notify("Deleted your Draft.");
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
        //TODO: make this also delete files on the device
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
        app.notify("Saved Draft.");
    },
    edit : function(obs) {
        this.setCurrent(obs || this.defaultObservation());
        this.scatter();
    },
    start : function() {
        if(this.hasUnsavedDraft())
        {
            app.observation.edit(this.getUnsavedDraft());
            app.observation.show("continue-page");
            app.showPage("observation");
        }
        else
        {
            this.getDefaultObservation(
                function(o) {
                    console.log("default obs: " + JSON.stringify(o));
                    app.observation.edit(o);
                    app.observation.show("headline-page");
                    app.showPage("observation");
                }
            );
        }
    },
    dumpToConsole : function() {
        if(this.current != null)
        {
            console.log(JSON.stringify(this.current));
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
                app.observation.show('headline-page'); //go to the beginning
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
                app.observation.sender.maybeSend(); //this triggers a send immediately
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
            //runs once only
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

            //setup event handler
            $(".observation-page").find(".category-block").on("change", function(e) {
                //spin through and gather them all
                app.observation.categories.gather();
                app.observation.save();
            });
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
        console.log(this.current);

        if(this.current == null)
            this.current = this.get("UNSAVEDOBSERVATION");

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
                allowEdit : false,
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
                
                //TODO: capture geolocation and add it here
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

        setCaption : function( i, caption) {
            var self = this;
            if(app.observation.current.Photos.length > i)
            {
                app.observation.current.Photos[i].Caption = caption;
                app.observation.save();
            }
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

                        //TODO: capture geolocation and add it here
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
        setCaption : function( i, caption) {
            var self = this;
            if(app.observation.current.Videos.length > i)
            {
                app.observation.current.Videos[i].Caption = caption;
                app.observation.save();
            }
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


};