# LEO Field Reporter

Getting a Phonegap project to work is difficult. Here are some of the tricks I used to get this one working.

- Make sure Node and NPM are up to date. (sudo npm install -g npm)
- Make sure Phonegap and Cordova are up to date via NPM. (sudo npm update -g  phonegap)
- Serve app via (sudo phonegap serve)
- Browser vs. emulator vs. deployed app behave differently in some ways. One important one is in HTTP calls, where cross-domain issues crop up (emulator proxies HTTP calls to the *phonegap serve* instance, so cross-domain issues may be masked). If you have a remote endpoint, **make sure the CORS headers are set properly**, or else you might get invisible errors when the app is deployed (this only happened with POSTs for me). (Using requestbin probably would have been a smart thing to try.) 
- Refreshing the app (on Android at least) sometimes results in "App not installed" errors. Removing the app and waiting seems to get around this.
- Make sure config.xml has <preference name="phonegap-version" value="cli-9.0.0" /> 
- Make sure the app ID in config.xml is something new/unique - i.e. not helloworld
- Content-Security-Policy feels like voodoo. The one in index.html seems to work.
- If using jQuery/JQM, don't forget $.support.cors = true and $.mobile.allowCrossDomainPages = true
- Creating a new version of index.html seems problematic with *phonegap serve*, probably due to some artifact pointing to the old version. The only way I could get around this was to do a fresh app with *phonegap create* and then move files into it.
- 

### Basic setup steps

- Create fresh Phonegap app with *phonegap create*
- Add .gitignore to it
- Change phonegap-version preference in config.xml
- Add plugins to config.xml
- Update Content-Security-Policy in index.html
- Create repo on Github
- Create local repo using the app directory
- Add a remote to the local repo pointing to the Github repo
- Commit and push to remote
- Setup a new app at build.phonegap.com, pulling from Github repo
- Pull code and build
- Deploy to devices

### Secrets

- Phonegap Build can pull/build from public Github repos, so make sure there aren't any secrets in the code!

### jQuery Mobile Tips


### Still TBD

- Best way to handle icons
- Signing key management
- Deployment to app stores
