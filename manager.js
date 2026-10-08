ObjC.import("Cocoa");
ObjC.import("WebKit");

var sa = Application.currentApplication();
sa.includeStandardAdditions = true;
try { sa.doShellScript("lsof -ti :8471 | xargs kill -9 2>/dev/null; true"); } catch(e) {}

var pyCode = `import http.server,socketserver,os,urllib.parse,webbrowser,signal,sys,json,base64,pathlib,subprocess,threading,shutil,tempfile,time,re,uuid
_ROOTS=['/Volumes/Alfredo Enrico Iacobucci/Portfolio AEI','/Users/enricoiacobucci/Desktop/Portfolio AEI']
_root=next((p for p in _ROOTS if os.path.isdir(os.path.join(p,'codice-sorgente'))),None)
if not _root:
 sys.stderr.write('Cartella progetto non trovata. Collega l SSD "Alfredo Enrico Iacobucci".\\n');sys.exit(1)
os.chdir(_root)
def git_sync(msg="auto: media update"):
 def run():
  try:
   cwd=os.path.join(os.getcwd(),'codice-sorgente')
   subprocess.run(['git','add','-A'],cwd=cwd,capture_output=True,timeout=10)
   subprocess.run(['git','commit','-m',msg],cwd=cwd,capture_output=True,timeout=10)
   r=subprocess.run(['git','pull','--rebase'],cwd=cwd,capture_output=True,timeout=30)
   if r.returncode!=0:sys.stderr.write('git pull failed: '+r.stderr.decode(errors='replace')+'\\n')
   r=subprocess.run(['git','push'],cwd=cwd,capture_output=True,timeout=30)
   if r.returncode!=0:sys.stderr.write('git push failed: '+r.stderr.decode(errors='replace')+'\\n')
  except Exception as e:sys.stderr.write('git_sync error: '+str(e)+'\\n')
 threading.Thread(target=run,daemon=True).start()
# ---- Video del banner: accorciati a 25 s, senza audio, alleggeriti ----
_jobs={}
def find_ffmpeg():
 for p in [shutil.which('ffmpeg'),'/opt/homebrew/bin/ffmpeg','/usr/local/bin/ffmpeg']:
  if p and os.path.isfile(p):return p
 return None
def compress_video(src,dst):
 ff=find_ffmpeg()
 if ff:
  cmd=[ff,'-y','-i',src,'-t','25','-an','-vf','scale=min(1920\\\\,iw):-2,fps=30','-c:v','libx264','-preset','medium','-crf','27','-maxrate','2500k','-bufsize','5000k','-pix_fmt','yuv420p','-movflags','+faststart',dst]
  r=subprocess.run(cmd,capture_output=True,timeout=900)
  if r.returncode==0 and os.path.isfile(dst):return True,''
  return False,'ffmpeg: '+r.stderr.decode(errors='replace')[-300:]
 if os.path.isfile('/usr/bin/avconvert'):
  r=subprocess.run(['/usr/bin/avconvert','--source',src,'--output',dst,'--preset','Preset1280x720','--duration','25','--replace'],capture_output=True,timeout=900)
  if r.returncode==0 and os.path.isfile(dst):return True,''
  return False,'avconvert: '+(r.stderr or r.stdout).decode(errors='replace')[-300:]
 return False,'manca un programma per comprimere i video (ffmpeg)'
def video_job(jid,src,dst,rel):
 try:
  ok,err=compress_video(src,dst)
  if ok:_jobs[jid]={'state':'done','saved':rel,'size':os.path.getsize(dst)}
  else:
   _jobs[jid]={'state':'error','error':err}
   try:os.remove(dst)
   except Exception:pass
 except Exception as e:_jobs[jid]={'state':'error','error':str(e)}
 finally:
  try:os.remove(src)
  except Exception:pass
signal.signal(signal.SIGHUP,lambda s,f:sys.exit(0))
signal.signal(signal.SIGTERM,lambda s,f:sys.exit(0))
class H(http.server.SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.startswith('/open-url?'):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
   url=q.get('url',[''])[0]
   if url:webbrowser.open(url)
   self.send_response(200);self.end_headers();self.wfile.write(b'ok')
  elif self.path.startswith('/list-files?'):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
   folder=q.get('folder',[''])[0]
   safe=os.path.normpath(os.path.join(os.getcwd(),folder))
   base=os.path.normpath(os.path.join(os.getcwd(),'codice-sorgente','contenuti'))
   if not safe.startswith(base):
    self.send_response(403);self.end_headers();self.wfile.write(b'[]');return
   files=[]
   if os.path.isdir(safe):
    for f in sorted(os.listdir(safe)):
     fp=os.path.join(safe,f)
     if os.path.isfile(fp) and f.lower().split('.')[-1] in ('jpg','jpeg','png','webp','gif','mp4','mov'):
      files.append(f)
   self.send_response(200);self.end_headers()
   self.wfile.write(json.dumps(files).encode())
  elif self.path.startswith('/video-status?'):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
   j=_jobs.get(q.get('id',[''])[0],{'state':'error','error':'lavoro non trovato'})
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers()
   self.wfile.write(json.dumps(j).encode())
  elif self.path.startswith('/local-photo/'):
   # Serve foto locali: /local-photo/codice-sorgente/contenuti/...
   rel=urllib.parse.unquote(self.path[len('/local-photo/'):])
   safe=os.path.normpath(os.path.join(os.getcwd(),rel))
   base=os.path.normpath(os.path.join(os.getcwd(),'codice-sorgente','contenuti'))
   if not safe.startswith(base) or not os.path.isfile(safe):
    self.send_response(404);self.end_headers();return
   ext=safe.rsplit('.',1)[-1].lower()
   ct={'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','gif':'image/gif','mp4':'video/mp4','mov':'video/quicktime'}.get(ext,'application/octet-stream')
   fsize=os.path.getsize(safe)
   rng=self.headers.get('Range','')
   start,end=0,fsize-1
   if rng.startswith('bytes='):
    try:
     a,b=rng[6:].split(',')[0].split('-')
     if a:start=int(a);end=int(b) if b else fsize-1
     else:start=max(0,fsize-int(b))
     end=min(end,fsize-1)
    except Exception:start,end=0,fsize-1
    self.send_response(206);self.send_header('Content-Range','bytes %d-%d/%d'%(start,end,fsize))
   else:self.send_response(200)
   n=max(0,end-start+1)
   self.send_header('Content-Type',ct);self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(n));self.end_headers()
   try:
    with open(safe,'rb') as fp:
     fp.seek(start)
     while n>0:
      chunk=fp.read(min(65536,n))
      if not chunk:break
      self.wfile.write(chunk);n-=len(chunk)
   except (BrokenPipeError,ConnectionResetError):pass
  else:super().do_GET()
 def do_POST(self):
  if self.path=='/upload':
   length=int(self.headers.get('Content-Length',0))
   body=json.loads(self.rfile.read(length))
   folder=body.get('folder','')
   files=body.get('files',[])
   if not folder or not files:
    self.send_response(400);self.end_headers();self.wfile.write(b'{"error":"missing folder or files"}');return
   # Security: folder must be under codice-sorgente/contenuti/
   safe=os.path.normpath(os.path.join(os.getcwd(),folder))
   base=os.path.normpath(os.path.join(os.getcwd(),'codice-sorgente','contenuti'))
   if not safe.startswith(base):
    self.send_response(403);self.end_headers();self.wfile.write(b'{"error":"forbidden path"}');return
   os.makedirs(safe,exist_ok=True)
   saved=[]
   for f in files:
    name=os.path.basename(f['name'])
    data=base64.b64decode(f['data'])
    filepath=os.path.join(safe,name)
    with open(filepath,'wb') as fp:fp.write(data)
    saved.append(name)
   self.send_response(200);self.end_headers()
   self.wfile.write(json.dumps({"saved":saved}).encode())
  elif self.path.startswith('/upload-video?'):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
   folder=q.get('folder',[''])[0];name=os.path.basename(q.get('name',['video'])[0])
   safe=os.path.normpath(os.path.join(os.getcwd(),folder))
   base=os.path.normpath(os.path.join(os.getcwd(),'codice-sorgente','contenuti'))
   if not folder or not safe.startswith(base+os.sep):
    self.send_response(403);self.end_headers();self.wfile.write(b'{"error":"percorso non valido"}');return
   length=int(self.headers.get('Content-Length',0))
   ext=os.path.splitext(name)[1].lower() or '.mov'
   fd,tmp=tempfile.mkstemp(suffix=ext)
   with os.fdopen(fd,'wb') as fp:
    left=length
    while left>0:
     chunk=self.rfile.read(min(1048576,left))
     if not chunk:break
     fp.write(chunk);left-=len(chunk)
   stem=re.sub('[^a-z0-9]+','-',os.path.splitext(name)[0].lower()).strip('-')[:40] or 'video'
   out=stem+'-'+time.strftime('%Y%m%d-%H%M%S')+'.mp4'
   vdir=os.path.join(safe,'video');os.makedirs(vdir,exist_ok=True)
   jid=uuid.uuid4().hex
   _jobs[jid]={'state':'working'}
   threading.Thread(target=video_job,args=(jid,tmp,os.path.join(vdir,out),'video/'+out),daemon=True).start()
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers()
   self.wfile.write(json.dumps({'job':jid}).encode())
  elif self.path=='/git-sync':
   length=int(self.headers.get('Content-Length',0))
   body=json.loads(self.rfile.read(length)) if length else {}
   msg=body.get('message','auto: media update')
   git_sync(msg)
   self.send_response(200);self.end_headers()
   self.wfile.write(b'{"ok":true}')
  elif self.path=='/delete-file':
   length=int(self.headers.get('Content-Length',0))
   body=json.loads(self.rfile.read(length))
   filepath=body.get('path','')
   safe=os.path.normpath(os.path.join(os.getcwd(),filepath))
   base=os.path.normpath(os.path.join(os.getcwd(),'codice-sorgente','contenuti'))
   if not safe.startswith(base) or not os.path.isfile(safe):
    self.send_response(403);self.end_headers();self.wfile.write(b'{"error":"forbidden"}');return
   os.remove(safe)
   self.send_response(200);self.end_headers()
   fname=os.path.basename(safe)
   self.wfile.write(json.dumps({"deleted":fname}).encode())
   git_sync("auto: delete "+fname)
  else:
   self.send_response(404);self.end_headers()
 def log_message(self,*a):pass
 def end_headers(self):
  self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
  self.send_header('Pragma','no-cache')
  self.send_header('Expires','0')
  super().end_headers()
socketserver.ThreadingTCPServer.allow_reuse_address=True
socketserver.ThreadingTCPServer.daemon_threads=True
httpd=socketserver.ThreadingTCPServer(('127.0.0.1',8471),H)
httpd.serve_forever()`;

var task = $.NSTask.alloc.init;
task.launchPath = "/usr/bin/python3";
task.arguments = $(["-c", pyCode]);
task.standardOutput = $.NSPipe.pipe;
task.standardError = $.NSPipe.pipe;
task.launch;

delay(2);

var nsApp = $.NSApplication.sharedApplication;
nsApp.setActivationPolicy($.NSApplicationActivationPolicyRegular);

ObjC.import("stdlib");

// ---- Chiusura: Cmd+Q, "Esci" dal Dock e chiusura finestra terminano davvero l'app ----
// L'app è uno script (applet): il gestore "quit" standard aspetta la fine dello script,
// che però resta fermo in nsApp.run, e il server Python avviato con NSTask resterebbe acceso.
var mpQuitting = false;
function mpQuitNow() {
  if (mpQuitting) return;
  mpQuitting = true;
  try { task.terminate; } catch (e) {}
  try { sa.doShellScript("lsof -ti :8471 | xargs kill -9 2>/dev/null; true"); } catch (e) {}
  $.exit(0);
}
var AE_CORE = 0x61657674; // 'aevt'
var AE_QUIT = 0x71756974; // 'quit'
ObjC.registerSubclass({
  name:"MPDel9",superclass:"NSObject",protocols:["NSApplicationDelegate","NSWindowDelegate"],
  methods:{
    "applicationShouldTerminateAfterLastWindowClosed:":{types:["bool",["id"]],implementation:function(s){return true;}},
    "windowWillClose:":{types:["void",["id"]],implementation:function(n){ mpQuitNow(); }},
    "mpQuit:":{types:["void",["id"]],implementation:function(sender){ mpQuitNow(); }},
    "mpHandleQuit:withReply:":{types:["void",["id","id"]],implementation:function(ev,reply){ mpQuitNow(); }},
    "mpInstallQuit:":{types:["void",["id"]],implementation:function(t){ mpInstallQuitHandler(); }}
  }
});
var mpDel = $.MPDel9.alloc.init;
nsApp.delegate = mpDel;
function mpInstallQuitHandler() {
  $.NSAppleEventManager.sharedAppleEventManager.setEventHandlerAndSelectorForEventClassAndEventID(mpDel, "mpHandleQuit:withReply:", AE_CORE, AE_QUIT);
}
mpInstallQuitHandler();
// Reinstalla dopo l'avvio del ciclo dell'app, che potrebbe ripristinare il gestore standard
$.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(1.0, mpDel, "mpInstallQuit:", null, false);
$.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(4.0, mpDel, "mpInstallQuit:", null, false);

// Menu bar with App menu + Edit menu
var mb = $.NSMenu.alloc.init;
var appMi = $.NSMenuItem.alloc.init;
mb.addItem(appMi);
var appMenu = $.NSMenu.alloc.initWithTitle("Manager Portfolio");
var quitItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("Esci da Manager Portfolio","mpQuit:","q");
quitItem.target = mpDel;
appMenu.addItem(quitItem);
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

// Window — piccola iniziale, poi setFrame alla visibleFrame intera
var st = $.NSTitledWindowMask|$.NSClosableWindowMask|$.NSResizableWindowMask|$.NSMiniaturizableWindowMask;
var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(0,0,800,600),st,$.NSBackingStoreBuffered,false);
win.title = "Manager Portfolio";
win.delegate = mpDel;
win.setTitlebarAppearsTransparent(true);
win.backgroundColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(0.11, 0.11, 0.11, 1.0);
// Imposta il FRAME (non content rect) alla zona visibile intera
var vf = $.NSScreen.mainScreen.visibleFrame;
win.setFrameDisplay(vf, true);

// WKWebView with no cache + injected JS overrides
var cfg = $.WKWebViewConfiguration.alloc.init;
var injectCode = "(function(){var s=document.createElement('style');s.textContent='html,body{background:#1c1c1c!important}';document.documentElement.appendChild(s)})();window.confirm=function(msg){return new Promise(function(resolve){var bg=document.createElement('div');bg.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99998;display:flex;align-items:center;justify-content:center;';var box=document.createElement('div');box.style.cssText='background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:24px;max-width:420px;width:90%;color:#fff;font-size:14px;font-family:Inter,system-ui,sans-serif;';box.innerHTML='<div style=\"margin-bottom:16px;line-height:1.5;\">'+msg.replace(/\\n/g,'<br>')+'</div><div style=\"display:flex;gap:8px;justify-content:flex-end;\"><button id=\"_cfNo\" style=\"padding:8px 16px;background:transparent;border:1px solid #444;color:#aaa;border-radius:4px;cursor:pointer;font-size:12px;\">Annulla</button><button id=\"_cfYes\" style=\"padding:8px 16px;background:#c8102e;border:1px solid #c8102e;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;\">Conferma</button></div>';bg.appendChild(box);document.body.appendChild(bg);document.getElementById('_cfYes').onclick=function(){bg.remove();resolve(true);};document.getElementById('_cfNo').onclick=function(){bg.remove();resolve(false);};bg.onclick=function(e){if(e.target===bg){bg.remove();resolve(false);}};})};window.alert=function(msg){var t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;font-size:13px;border:1px solid #444;max-width:500px;text-align:center;';document.body.appendChild(t);setTimeout(function(){t.remove();},4000)};document.addEventListener('click',function(e){var a=e.target.closest('a[target=_blank]');if(a&&a.href){e.preventDefault();e.stopPropagation();fetch('/open-url?url='+encodeURIComponent(a.href))}},true);document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();var btn=document.getElementById('btnSave');if(btn)btn.click();}if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();document.execCommand('undo');}},true);";
var userScript = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(injectCode, $.WKUserScriptInjectionTimeAtDocumentStart, true);
cfg.userContentController.addUserScript(userScript);

var wv = $.WKWebView.alloc.initWithFrameConfiguration(win.contentView.bounds,cfg);
wv.setOpaque(false);
wv.autoresizingMask = $.NSViewWidthSizable|$.NSViewHeightSizable;
win.contentView.addSubview(wv);
win.makeFirstResponder(wv);

// Mostra la finestra SOLO quando la pagina è caricata (no flash bianca)
ObjC.registerSubclass({
  name:"NavDel",superclass:"NSObject",protocols:["WKNavigationDelegate"],
  methods:{
    "webView:didFinishNavigation:":{types:["void",["id","id"]],implementation:function(w,n){
      win.makeKeyAndOrderFront(null);
      nsApp.activateIgnoringOtherApps(true);
    }}
  }
});
wv.navigationDelegate = $.NavDel.alloc.init;

var pageURL = $.NSURL.URLWithString("http://127.0.0.1:8471/.Manager%20Portfolio.html");
var req = $.NSMutableURLRequest.requestWithURL(pageURL);
req.cachePolicy = 1;
wv.loadRequest(req);

nsApp.run;
