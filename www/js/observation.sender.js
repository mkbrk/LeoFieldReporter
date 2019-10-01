app.observation.sender = {
    _sending : null, //will contain a key for the obs currently sending
    _sendLoopHandle : null,

    startSendLoop : function() {
        app.observation.sender._sendLoopHandle = window.setInterval(app.observation.sender.maybeSend, 1000 * 60);
    },

    stopSendLoop : function() {
        if(app.observation.sender._sendLoopHandle != null)
            window.clearInterval(app.observation.sender._sendLoopHandle);
    },

    maybeSend : function() {
        console.log("checking for observations to send");
        if(app.isSignedIn() && navigator.onLine && !app.observation.sender.isSending())
            app.observation.sender.sendNext();
        else
            console.log("Nothing to send");
    },

    isSending : function() {
        return app.observation.sender._sending != null;
    },

    sendNext : function() {
        var ob = app.observation.outbox.list();
        for(var i = 0; i < ob.length; i++)
        {
            if(ob[i]._STATUS == "W") //waiting to send
            {
                console.log("will try to send " + ob[i]._ID);
                app.observation.sender.send(ob[i]._ID);
            }
        }
    },

    //sends a single one by key
    send : function (key)
    {
        if(app.observation.sender.isSending())
        {
            console.log("Already sending an observation.");  
        }
        else
        {
            if (app.isSignedIn() && navigator.onLine) {
                var obj = app.observation.outbox.get(key);
                if(obj && obj != null)
                {
                    if(obj._STATUS == "P" || app.observation.setStatus("P", obj)) //already sending or can send 
                    {
                        console.log("about to send " + key);
                        app.observation.sender._sending = key; //marks this one as being sent

                        app.observation.sender._sendingAttachments = []; //queue up the attachments
                        for(var i = 0; i < obj.Photos.length; i++)
                        {
                            if(!obj.Photos[i].AttachmentID || obj.Photos[i].AttachmentID == null)
                                app.observation.sender._sendingAttachments.push(obj.Photos[i]);
                        }

                        for(var i = 0; i < obj.Videos.length; i++)
                        {
                            if(!obj.Videos[i].AttachmentID || obj.Videos[i].AttachmentID == null)
                                app.observation.sender._sendingAttachments.push(obj.Videos[i]);
                        }

                        obj._ERROR = null; //clear this out so that it can be reset if an error happens
                        app.observation.save(obj);
    
                        if(obj.ObservationID && obj.ObservationID != null)
                        {
                            console.log("Already sent observation...sending attachments now");
                            //if already have the ObservationID - just save the attachments
                            app.observation.sender.sendAttachments(obj);
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
                                        app.observation.sender.sendAttachments(obj);
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
                        console.log("Sending photos & videos");
                        var sendMe = null;
                        
                        for(var i = 0; i < obj.Photos.length; i++)
                        {
                            if(!obj.Photos[i].AttachmentID || obj.Photos[i].AttachmentID == null)
                            {
                                sendMe = obj.Photos[i];
                                break;
                            }
                        }

                        if(sendMe == null)
                        {
                            for(var i = 0; i < obj.Videos.length; i++)
                            {
                                if(!obj.Videos[i].AttachmentID || obj.Videos[i].AttachmentID == null)
                                {
                                    sendMe = obj.Videos[i];
                                    break;
                                }
                            }
                        }

                        if(sendMe != null)
                        {
                            var clone = JSON.parse(JSON.stringify(sendMe));
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
                                                    sendMe._STATUS = "sent";
                                                    sendMe.AttachmentID = res.AttachmentID;
                                                }
                                                else
                                                {
                                                    sendMe._STATUS = "error";
                                                    sendMe._MESSAGE = res.Message;   
                                                }
                                                app.observation.save(obj);
                                                app.observation.sender.sendAttachments(obj); //do it again
                                            },
                                            error : function(jqr, status) {
                                                console.log(status);
                                                sendMe._STATUS = "error";
                                                sendMe._MESSAGE = status;   
                                                app.observation.save(obj);
                                                app.observation.sender.sendAttachments(obj); //do it again
                                            }
                                        });
                                    };
                                
                                    reader.readAsDataURL(file);
                                    }, function(err) {
                                        console.log(err);
                                    });
                            });
                        }
                        else //no attachments left to send - finish this send 
                        {
                            app.observation.sender.finish(obj);
                            return;
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

    finish : function(obj) {
        $.ajax({
            url: app.getRemoteUrl("/en/fieldreporter/submit/" + obj.ObservationID + "?HubID=DEMO"),
            method: "POST",
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            data: null,
            headers: {
                "x-leo-header": app.getToken()
            }, 
            success : function (res) {
                if(res.Status == "OK")
                {
                    console.log("Submitted observation " + obj.ObservationID);
                    app.observation.setStatus("S", obj);
                    app.observation.sender._sending = null;
                }
                else
                {
                    console.log("error from the server: " + res.Message);
                    obj._ERROR = res.Message;   
                    app.observation.setStatus("E", obj);
                    app.observation.sender._sending = null;
                }
            },
            error : function(jqr, status) {
                console.log("error at the network level:" + status);
                obj._ERROR = status;   
                app.observation.setStatus("E", obj);
                app.observation.sender._sending = null;
            }
        });

        

    }
};