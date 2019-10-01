
var app = {
    notify : function(message, hideAfterSeconds) {
        var l = $("#notification");
        if(message == false)
        {
            l.removeClass("fadeInDown").addClass("fadeOutUp");
            //l.hide();
        }
        else
        {
            l.find("div").html(message);
            l.removeClass("fadeOutUp").addClass("fadeInDown");
            l.show();

            if(!hideAfterSeconds)
                hideAfterSeconds = 3;

            window.setTimeout(function() {
                app.notify(false);
            }, hideAfterSeconds * 1000);
        }
        //new $.nd2Toast({ 
        //    message : message
        //});
    },

    working : function(msg) {
        var l = $("#loading");
        if(msg == false)
        {
            l.removeClass("fadeInDown").addClass("fadeOutUp");
            l.hide();
        }
        else
        {
            l.find("div").html(msg);
            l.removeClass("fadeOutUp").addClass("fadeInDown");
            l.show();
        }
    },

    checkEmail : function(email, callback) {
        $.post(app.getRemoteUrl("/en/fieldreporter/checkenrollment"), "EmailAddress=" + email, function(res) {
            app.working(false);
            if(res.Status == "OK")
            {
                window.open("https://www.leonetwork.org/en/enroll?EmailAddress=" + email, "_system");
            }
            else if(res.Status == "ENROLLED")
            {
                navigator.notification.alert("You are already enrolled in the LEO Network. Please sign in." , null, "Already Enrolled", "OK");
                app.showPage("sign-in");
            }
            else
            {
                navigator.notification.alert(res.Message, null, "Error", "OK");
            }
        }, "json");
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
        else if(id == "home")
        {
            if(app.observation.hasUnsavedDraft())
                $("#continueEditingArea").show();
            else
            $("#continueEditingArea").hide();
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
        else if(id == "finish-quick")
        {
            var c = app.observation.quick.current();
            $("#Quick_Photo").attr("src", "");
            $("#Quick_Headline").val("");

            if(c != null)
            {
                if(c.Photos.length > 0)
                {
                    $("#Quick_Photo").attr("src", c.Photos[0].Data);
                }
                $("#Quick_Headline").val(c.ObservationTitle);
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
        var showme = $("#" + id);

        if(app.isSignedIn())
        {
            showme.find(".auth-only").show();
            showme.find(".unauth-only").hide();
        }
        else
        {
            showme.find(".auth-only").hide();
            showme.find(".unauth-only").show();
        }

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
    doSignIn: function(containerSelector, showPageOnSignIn) {
        containerSelector = containerSelector || "#sign-in";
        var email = $(containerSelector).find("[name=LoginName]").val();
        var pwd = $(containerSelector).find("[name=Password]").val();

        var postMe = JSON.stringify({LoginName:email, Password:pwd});

        $.post(app.getRemoteUrl("/en/fieldreporter/signin"), postMe, function(res) {
            if(res.Status == "OK")
            {
                var token = res.Token;
                var storage = window.localStorage;
                storage.setItem("TOKEN", token);   
                storage.setItem("LOGIN", email); 
                app.showPage(showPageOnSignIn || "home");        
                app.notify("Signed in.");
            }
            else
            {
                $(containerSelector).find("[name=Password]").val("");
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
