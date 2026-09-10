ObjC.import("Cocoa");
ObjC.import("stdlib");

// Test 1: visibleFrame
var scr = $.NSScreen.mainScreen;
var vf = scr.visibleFrame;
var fr = scr.frame;

var log = "";
log += "frame: " + fr.origin.x + "," + fr.origin.y + " " + fr.size.width + "x" + fr.size.height + "\n";
log += "visibleFrame: " + vf.origin.x + "," + vf.origin.y + " " + vf.size.width + "x" + vf.size.height + "\n";

var sa = Application.currentApplication();
sa.includeStandardAdditions = true;

var nsApp = $.NSApplication.sharedApplication;
nsApp.setActivationPolicy($.NSApplicationActivationPolicyRegular);

ObjC.registerSubclass({
  name:"TestDel",superclass:"NSObject",protocols:["NSApplicationDelegate"],
  methods:{
    "applicationShouldTerminateAfterLastWindowClosed:":{types:["bool",["id"]],implementation:function(s){
      log += "DELEGATE: shouldTerminateAfterLastWindowClosed FIRED\n";
      return true;
    }},
    "applicationShouldTerminate:":{types:["unsigned long",["id"]],implementation:function(s){
      log += "DELEGATE: shouldTerminate FIRED\n";
      // Scrivi il log su file
      try {
        var str = $.NSString.alloc.initWithUTF8String(log);
        str.writeToFileAtomicallyEncodingError("/Users/enricoiacobucci/Desktop/Portfolio AEI/test-log.txt", true, $.NSUTF8StringEncoding, null);
      } catch(e) {}
      $.exit(0);
      return 1;
    }}
  }
});
nsApp.delegate = $.TestDel.alloc.init;

// Menu
var mb = $.NSMenu.alloc.init;
var appMi = $.NSMenuItem.alloc.init;
mb.addItem(appMi);
var appMenu = $.NSMenu.alloc.initWithTitle("Test");
appMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Esci","terminate:","q"));
appMi.submenu = appMenu;
nsApp.mainMenu = mb;

// Window piccola
var st = $.NSTitledWindowMask|$.NSClosableWindowMask|$.NSResizableWindowMask|$.NSMiniaturizableWindowMask;
var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(100,100,400,300),st,$.NSBackingStoreBuffered,false);
win.title = "TEST — Chiudi dal Dock per testare quit";

// Test 2: setFrameDisplay
log += "PRIMA setFrameDisplay — winFrame: " + win.frame.size.width + "x" + win.frame.size.height + "\n";
win.setFrameDisplay(vf, true);
log += "DOPO setFrameDisplay — winFrame: " + win.frame.size.width + "x" + win.frame.size.height + "\n";

// Test 3: zoom
win.makeKeyAndOrderFront(null);
log += "PRIMA zoom — winFrame: " + win.frame.size.width + "x" + win.frame.size.height + "\n";
win.zoom(null);
log += "DOPO zoom — winFrame: " + win.frame.size.width + "x" + win.frame.size.height + "\n";

// Scrivi log intermedio
try {
  var str = $.NSString.alloc.initWithUTF8String(log);
  str.writeToFileAtomicallyEncodingError("/Users/enricoiacobucci/Desktop/Portfolio AEI/test-log.txt", true, $.NSUTF8StringEncoding, null);
} catch(e) {}

nsApp.activateIgnoringOtherApps(true);
nsApp.run;
