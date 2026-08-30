ObjC.import("Cocoa");
ObjC.import("WebKit");

var sa = Application.currentApplication();
sa.includeStandardAdditions = true;
try { sa.doShellScript("lsof -ti :8471 | xargs kill -9 2>/dev/null; true"); } catch(e) {}

var pyCode = "import http.server,socketserver,os,urllib.parse,webbrowser,signal,sys\nos.chdir('/Users/enricoiacobucci/Desktop/Portfolio AEI')\nsignal.signal(signal.SIGHUP,lambda s,f:sys.exit(0))\nsignal.signal(signal.SIGTERM,lambda s,f:sys.exit(0))\nclass H(http.server.SimpleHTTPRequestHandler):\n def do_GET(self):\n  if self.path.startswith('/open-url?'):\n   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)\n   url=q.get('url',[''])[0]\n   if url:webbrowser.open(url)\n   self.send_response(200)\n   self.end_headers()\n   self.wfile.write(b'ok')\n  else:super().do_GET()\n def log_message(self,*a):pass\n def end_headers(self):\n  self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')\n  self.send_header('Pragma','no-cache')\n  self.send_header('Expires','0')\n  super().end_headers()\nsocketserver.TCPServer.allow_reuse_address=True\nhttpd=socketserver.TCPServer(('127.0.0.1',8471),H)\nhttpd.serve_forever()";

var task = $.NSTask.alloc.init;
task.launchPath = "/usr/bin/python3";
task.arguments = $(["-c", pyCode]);
task.standardOutput = $.NSPipe.pipe;
task.standardError = $.NSPipe.pipe;
task.launch;

delay(2);

var nsApp = $.NSApplication.sharedApplication;
nsApp.setActivationPolicy($.NSApplicationActivationPolicyRegular);

ObjC.registerSubclass({
  name:"MPDel8",superclass:"NSObject",protocols:["NSApplicationDelegate"],
  methods:{
    "applicationShouldTerminateAfterLastWindowClosed:":{types:["bool",["id"]],implementation:function(s){return true;}},
    "applicationShouldTerminate:":{types:["unsigned long",["id"]],implementation:function(s){
      try { task.terminate; } catch(e) {}
      try { sa.doShellScript("lsof -ti :8471 | xargs kill -9 2>/dev/null; true"); } catch(e) {}
      return 1; /* NSTerminateNow */
    }}
  }
});
nsApp.delegate = $.MPDel8.alloc.init;

// Menu bar with App menu + Edit menu
var mb = $.NSMenu.alloc.init;
var appMi = $.NSMenuItem.alloc.init;
mb.addItem(appMi);
var appMenu = $.NSMenu.alloc.initWithTitle("Manager Portfolio");
appMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Esci da Manager Portfolio","terminate:","q"));
appMi.submenu = appMenu;
var editMi = $.NSMenuItem.alloc.init;
mb.addItem(editMi);
var editMenu = $.NSMenu.alloc.initWithTitle("Modifica");
editMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Annulla","undo:","z"));
editMenu.addItem($.NSMenuItem.separatorItem);
editMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Taglia","cut:","x"));
editMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Copia","copy:","c"));
editMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Incolla","paste:","v"));
editMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Seleziona tutto","selectAll:","a"));
editMi.submenu = editMenu;
nsApp.mainMenu = mb;

// Window (88% of screen, centered)
var sc = $.NSScreen.mainScreen.frame;
var w = Math.floor(sc.size.width*0.88), h = Math.floor(sc.size.height*0.88);
var r = $.NSMakeRect(Math.floor((sc.size.width-w)/2),Math.floor((sc.size.height-h)/2),w,h);
var st = $.NSTitledWindowMask|$.NSClosableWindowMask|$.NSResizableWindowMask|$.NSMiniaturizableWindowMask;
var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(r,st,$.NSBackingStoreBuffered,false);
win.title = "Manager Portfolio";
win.setTitlebarAppearsTransparent(true);

// WKWebView with no cache + injected JS overrides
var cfg = $.WKWebViewConfiguration.alloc.init;
var injectCode = "window.confirm=function(){return true};window.alert=function(msg){var t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;font-size:13px;border:1px solid #444;max-width:500px;text-align:center;';document.body.appendChild(t);setTimeout(function(){t.remove();},4000)};document.addEventListener('click',function(e){var a=e.target.closest('a[target=_blank]');if(a&&a.href){e.preventDefault();e.stopPropagation();fetch('/open-url?url='+encodeURIComponent(a.href))}},true);document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();var btn=document.getElementById('btnSave');if(btn)btn.click();}if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();document.execCommand('undo');}},true);";
var userScript = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(injectCode, $.WKUserScriptInjectionTimeAtDocumentStart, true);
cfg.userContentController.addUserScript(userScript);

var wv = $.WKWebView.alloc.initWithFrameConfiguration(win.contentView.bounds,cfg);
wv.autoresizingMask = $.NSViewWidthSizable|$.NSViewHeightSizable;
win.contentView.addSubview(wv);
win.makeFirstResponder(wv);
var pageURL = $.NSURL.URLWithString("http://127.0.0.1:8471/.Manager%20Portfolio.html");
var req = $.NSMutableURLRequest.requestWithURL(pageURL);
req.cachePolicy = 1;
wv.loadRequest(req);

win.makeKeyAndOrderFront(null);
nsApp.activateIgnoringOtherApps(true);
nsApp.run;

// Cleanup dopo la chiusura dell'app (nsApp.run ritorna qui)
try { task.terminate; } catch(e) {}
try { sa.doShellScript("lsof -ti :8471 | xargs kill -9 2>/dev/null; true"); } catch(e) {}
