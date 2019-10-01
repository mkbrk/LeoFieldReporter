app.observation.quick = {
    current : function() {
        return app.observation.get("QUICK");
    },
    start : function () {
        var obs = app.observation.defaultObservation();
        obs._ID = "QUICK";

        //add a single photo
        var opts = {
            quality : 50,
            destinationType : Camera.DestinationType.FILE_URI,
            sourceType : Camera.PictureSourceType.CAMERA,
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
            
            var att = {
                Data: imgData,
                Caption: null,
                Attribution : null,
                ContentType : "image/jpg"
            }

            obs.Photos.push(att);
        
            //add geolocation
            if(("geolocation" in navigator))
            {
                navigator.geolocation.getCurrentPosition(function (position) {
                    obs.LocationLat = position.coords.latitude;
                    obs.LocationLng = position.coords.longitude;

                    app.observation.save(obs);
                    app.showPage("finish-quick");

                }, function(err) {
                    app.observation.save(obs);
                    app.showPage("finish-quick");
                });
            }
            else
            {
                app.observation.save(obs);
                app.showPage("finish-quick");
            }

            

        }, function(errorMsg) {
            console.log(errorMsg);
        }, opts);
        
    },
    setTitle : function(t) {
        var c = this.current();
        if(c != null)
        {
            c.ObservationTitle = t;
            app.observation.save(c);
        }
    },  
    saveAsDraft : function() {
        var obj = this.current();
        if(obj != null)
        {
            app.observation.setStatus("D", obj); //saves internally as draft
        }

        app.notify("Saved Draft.");
        app.showPage('home');
    },
    continueEditing : function() {
        var obj = this.current();
        if(obj != null)
        {
            app.observation.setStatus("D", obj); //saves internally as draft
            app.showPage('observation');
            app.observation.drafts.edit(obj._ID);
            app.observation.show('headline-page'); //make sure it goes to teh beginning
        }
        else
        {
            console.log("No current quick observation.");
        }
    },
    send : function() {
        var obj = current();
        if(obj != null)
        {
            app.observation.setStatus("W", obj); //saves internally - W = "Waiting to send"
            app.observation.startOver();
            app.showPage("sent-draft-confirmation");
            app.observation.sender.maybeSend();
        }
        else
        {
            navigator.notification.alert("No current observation.", null, "Error", "OK");
            app.showPage("home");
        }
    },
    abandon : function() {
        app.observation.remove("QUICK");
        app.showPage("home");
    }
};