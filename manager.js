ObjC.import("Cocoa");
ObjC.import("WebKit");

var sa = Application.currentApplication();
sa.includeStandardAdditions = true;
try { sa.doShellScript("lsof -ti :8471 | xargs kill -9 2>/dev/null; true"); } catch(e) {}

var pyCode = `import http.server,socketserver,os,urllib.parse,webbrowser,signal,sys,json,base64,pathlib,subprocess,threading,shutil,tempfile,time,re,uuid,hashlib,datetime
_ROOTS=['/Volumes/Alfredo Enrico Iacobucci/Portfolio AEI','/Users/enricoiacobucci/Desktop/Portfolio AEI']
# Senza SSD il server parte lo stesso: serve la copia della pagina che sta
# dentro l'app e aspetta. Appena l'SSD compare usa la cartella del progetto.
BUNDLE_HTML=sys.argv[1] if len(sys.argv)>1 else ''
_ready=False
def _find_root():
 return next((p for p in _ROOTS if os.path.isdir(os.path.join(p,'codice-sorgente'))),None)
def _wait_root():
 global _ready
 while not _ready:
  r=_find_root()
  if r:
   os.chdir(r);_ready=True;break
  time.sleep(1)
_r=_find_root()
if _r:
 os.chdir(_r);_ready=True
else:
 threading.Thread(target=_wait_root,daemon=True).start()
_git_lock=threading.Lock()
_quit={'req':False,'ack':False}
CONT_FILE='codice-sorgente/contenuti/contenuti.json'
# contenuti=False: foto, video e versioni vanno online, ma contenuti.json no:
# quello lo pubblica solo il tasto "Pubblica" (il tasto "Salva" lo scrive e basta)
def git_sync(msg="auto: media update",wait=False,contenuti=False):
 def run():
  with _git_lock:
   try:
    cwd=os.getcwd()
    def g(args,t=30):return subprocess.run(['git']+args,cwd=cwd,capture_output=True,timeout=t)
    spec=['--',':/'] if contenuti else ['--',':/',':(top,exclude)'+CONT_FILE]
    g(['add','-A']+spec)
    before=g(['rev-parse','@{u}']).stdout.decode().strip()
    g(['commit','-m',msg])
    r=g(['pull','--rebase','--autostash'],60)
    if r.returncode!=0:sys.stderr.write('git pull failed: '+r.stderr.decode(errors='replace')+'\\n')
    r=g(['push'],60)
    if r.returncode!=0:
     sys.stderr.write('git push failed: '+r.stderr.decode(errors='replace')+'\\n')
     return {'ok':False,'error':r.stderr.decode(errors='replace')[-200:]}
    after=g(['rev-parse','HEAD']).stdout.decode().strip()
    return {'ok':True,'sha':after,'nuovo':after!=before}
   except Exception as e:
    sys.stderr.write('git_sync error: '+str(e)+'\\n');return {'ok':False,'error':str(e)}
 if wait:return run()
 threading.Thread(target=run,daemon=True).start()
 return {'ok':True}
def contenuti_locale():
 with open(CONT_FILE,encoding='utf-8') as fp:c=json.load(fp)
 cwd=os.getcwd()
 diff=subprocess.run(['git','diff','--quiet','HEAD','--',CONT_FILE],cwd=cwd,capture_output=True).returncode!=0
 ahead=subprocess.run(['git','rev-list','--count','@{u}..HEAD','--',CONT_FILE],cwd=cwd,capture_output=True).stdout.decode().strip()
 return {'contenuti':c,'daPubblicare':diff or (ahead not in ('','0'))}
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
# ---- Versioni: contenuti, sito e Manager ----
SITE_PATHS=['codice-sorgente/src','codice-sorgente/scripts','codice-sorgente/public','codice-sorgente/package.json','codice-sorgente/next.config.js','codice-sorgente/tailwind.config.js','codice-sorgente/postcss.config.js','codice-sorgente/jsconfig.json','vercel.json']
MANAGER_PATHS=['.Manager Portfolio.html','manager.js','manager-assets','aggiorna-app.sh']
KIND_PATHS={'sito':SITE_PATHS,'manager':MANAGER_PATHS}
CONT_PATH='codice-sorgente/contenuti/contenuti.json'
VDIR=os.path.join('versioni','contenuti')
def _names_file(kind):
 return os.path.join('versioni',kind+'.json')
def _git(args,timeout=30):
 return subprocess.run(['git']+args,cwd=os.getcwd(),capture_output=True,timeout=timeout)
def _is_sha(s):
 return bool(re.fullmatch('[0-9a-f]{7,40}',s or ''))
def _log(paths,n=80,skip_auto=False):
 r=_git(['log','-n',str(n*2 if skip_auto else n),'--format=%H%x09%cI%x09%s','--']+paths)
 out=[]
 for line in r.stdout.decode(errors='replace').splitlines():
  parts=line.split(chr(9),2)
  if len(parts)!=3:continue
  if skip_auto and re.match('(editor|auto|versioni):',parts[2]):continue
  out.append({'sha':parts[0],'data':parts[1],'msg':parts[2]})
 return out[:n]
def _fp(sha,paths):
 r=_git(['ls-tree','-r',sha,'--']+paths)
 return hashlib.sha1(r.stdout).hexdigest()
def _names(kind):
 try:
  with open(_names_file(kind),encoding='utf-8') as fp:return json.load(fp)
 except Exception:return {}
def _storia(kind):
 paths=KIND_PATHS[kind]
 storia=_log(paths,60,True)
 names=_names(kind)
 cur=_fp('HEAD',paths)
 for s in storia:
  s['nome']=names.get(s['sha'],'')
  s['inUso']=(_fp(s['sha'],paths)==cur)
  # un Manager senza la sezione Versioni non permetterebbe di tornare indietro
  s['ripristinabile']=True if kind=='sito' else (_git(['grep','-q','function renderVersioni',s['sha'],'--','.Manager Portfolio.html']).returncode==0)
 return storia
def versioni_elenco():
 salvate=[]
 if os.path.isdir(VDIR):
  for f in os.listdir(VDIR):
   if not f.endswith('.json'):continue
   try:
    with open(os.path.join(VDIR,f),encoding='utf-8') as fp:d=json.load(fp)
    c=d.get('contenuti') or {}
    salvate.append({'id':f[:-5],'nome':d.get('nome',''),'data':d.get('data',''),'progetti':len(c.get('projects') or [])})
   except Exception:pass
 salvate.sort(key=lambda x:x['data'],reverse=True)
 return {'contenuti':{'salvate':salvate,'pubblicate':_log([CONT_PATH])},'sito':{'storia':_storia('sito')},'manager':{'storia':_storia('manager')}}
def versioni_leggi(vid,sha):
 if vid:
  if not re.fullmatch('[A-Za-z0-9_-]+',vid):return None
  with open(os.path.join(VDIR,vid+'.json'),encoding='utf-8') as fp:return json.load(fp).get('contenuti')
 if _is_sha(sha):
  r=_git(['show',sha+':'+CONT_PATH])
  if r.returncode==0:return json.loads(r.stdout.decode('utf-8'))
 return None
def versioni_dettaglio(kind,sha):
 if kind not in KIND_PATHS or not _is_sha(sha):return None
 body=_git(['show','-s','--format=%b',sha]).stdout.decode(errors='replace')
 files=[l for l in _git(['show','--name-only','--format=',sha,'--']+KIND_PATHS[kind]).stdout.decode(errors='replace').splitlines() if l.strip()]
 return {'body':body,'files':files}
def versioni_salva(nome,contenuti):
 os.makedirs(VDIR,exist_ok=True)
 vid=time.strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:4]
 with open(os.path.join(VDIR,vid+'.json'),'w',encoding='utf-8') as fp:
  json.dump({'nome':nome,'data':datetime.datetime.now().astimezone().isoformat(timespec='seconds'),'contenuti':contenuti},fp,ensure_ascii=False,indent=1)
 git_sync('versioni: salvata "'+nome[:60]+'"')
 return vid
def versioni_elimina(vid):
 if not re.fullmatch('[A-Za-z0-9_-]+',vid or ''):return False
 p=os.path.join(VDIR,vid+'.json')
 if os.path.isfile(p):os.remove(p)
 git_sync('versioni: eliminata '+vid)
 return True
def versioni_nome(kind,sha,nome):
 if kind not in KIND_PATHS or not _is_sha(sha):return False
 names=_names(kind)
 if nome:names[sha]=nome[:80]
 else:names.pop(sha,None)
 os.makedirs('versioni',exist_ok=True)
 with open(_names_file(kind),'w',encoding='utf-8') as fp:json.dump(names,fp,ensure_ascii=False,indent=1)
 git_sync('versioni: nome '+kind+' '+sha[:7])
 return True
def versioni_ripristina(kind,sha):
 if kind not in KIND_PATHS or not _is_sha(sha):return {'ok':False,'error':'versione non valida'}
 paths=KIND_PATHS[kind]
 with _git_lock:
  r=_git(['pull','--rebase','--autostash'],60)
  if r.returncode!=0:return {'ok':False,'error':'non riesco ad aggiornare dal server: '+r.stderr.decode(errors='replace')[-200:]}
  app_cambia=_git(['diff','--quiet',sha,'HEAD','--','manager.js']).returncode!=0
  # file nati dopo quella versione: vanno tolti, il resto torna com'era
  r=_git(['diff','--name-only','--diff-filter=A',sha,'HEAD','--']+paths)
  nuovi=[l for l in r.stdout.decode(errors='replace').splitlines() if l.strip()]
  if nuovi:_git(['rm','-q','--']+nuovi)
  esistenti=[p for p in paths if _git(['cat-file','-e',sha+':'+p]).returncode==0]
  r=_git(['checkout',sha,'--']+esistenti)
  if r.returncode!=0:return {'ok':False,'error':r.stderr.decode(errors='replace')[-200:]}
  d=_git(['log','-1','--format=%cd','--date=format:%d/%m/%Y %H:%M',sha]).stdout.decode().strip()
  cosa='la grafica del sito' if kind=='sito' else 'il Manager'
  r=_git(['commit','-m','Ripristinato '+cosa+' alla versione del '+d+' ('+sha[:7]+')'])
  if r.returncode!=0:return {'ok':True,'uguale':True}
  r=_git(['push'],60)
  if r.returncode!=0:return {'ok':False,'error':'ripristinato sul Mac ma non pubblicato: '+r.stderr.decode(errors='replace')[-200:]}
  head=_git(['rev-parse','HEAD']).stdout.decode().strip()
  return {'ok':True,'sha':head,'appCambiata':(kind=='manager' and app_cambia)}
signal.signal(signal.SIGHUP,lambda s,f:sys.exit(0))
signal.signal(signal.SIGTERM,lambda s,f:sys.exit(0))
class H(http.server.SimpleHTTPRequestHandler):
 def do_GET(self):
  p0=self.path.split('?')[0]
  if p0=='/quit-request':
   _quit['req']=True;_quit['ack']=False;self._json({'ok':True});return
  if p0=='/quit-poll':
   if _quit['req']:_quit['ack']=True
   self._json({'req':_quit['req']});return
  if p0=='/quit-cancel':
   _quit['req']=False;self._json({'ok':True});return
  if p0=='/quit-acked':
   self._json({'ack':_quit['ack']});return
  if not _ready:
   p=self.path.split('?')[0]
   if p=='/ssd-status':self._json({'ok':False});return
   if p=='/quit-app':
    self._json({'ok':True})
    def bye0():
     time.sleep(0.3)
     try:os.kill(os.getppid(),signal.SIGTERM)
     except Exception:pass
     os._exit(0)
    threading.Thread(target=bye0,daemon=True).start();return
   if p in ('/','/.Manager%20Portfolio.html','/.Manager Portfolio.html') and BUNDLE_HTML and os.path.isfile(BUNDLE_HTML):
    with open(BUNDLE_HTML,'rb') as fp:data=fp.read()
    self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers()
    self.wfile.write(data);return
   self.send_response(503);self.end_headers();return
  if self.path=='/ssd-status':
   self._json({'ok':True})
  elif self.path=='/contenuti-locale':
   try:self._json(contenuti_locale())
   except Exception as e:self._json({'error':str(e)},500)
  elif self.path.startswith('/open-url?'):
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
  elif self.path=='/versioni/elenco':
   self._json(versioni_elenco())
  elif self.path.startswith('/versioni/dettaglio?'):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
   d=versioni_dettaglio(q.get('tipo',[''])[0],q.get('sha',[''])[0])
   if d is None:self._json({'error':'non trovato'},404)
   else:self._json(d)
  elif self.path.startswith('/versioni/contenuti?'):
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
   try:c=versioni_leggi(q.get('id',[''])[0],q.get('sha',[''])[0])
   except Exception as e:c=None
   if c is None:self._json({'error':'versione non trovata'},404)
   else:self._json(c)
  elif self.path=='/quit-app':
   # riserva: se la pagina non riesce a parlare con l'app, la chiude da qui
   self.send_response(200);self.end_headers();self.wfile.write(b'ok')
   def bye():
    time.sleep(0.3)
    try:os.kill(os.getppid(),signal.SIGTERM)
    except Exception:pass
    os._exit(0)
   threading.Thread(target=bye,daemon=True).start()
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
  if not _ready:
   self.send_response(503);self.end_headers();return
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
  elif self.path.startswith('/versioni/'):
   length=int(self.headers.get('Content-Length',0))
   body=json.loads(self.rfile.read(length)) if length else {}
   try:
    if self.path=='/versioni/salva':
     nome=str(body.get('nome','')).strip()[:80] or 'Senza nome'
     self._json({'ok':True,'id':versioni_salva(nome,body.get('contenuti') or {})})
    elif self.path=='/versioni/elimina':self._json({'ok':versioni_elimina(body.get('id',''))})
    elif self.path=='/versioni/nome':self._json({'ok':versioni_nome(body.get('tipo',''),body.get('sha',''),str(body.get('nome','')).strip())})
    elif self.path=='/versioni/ripristina':self._json(versioni_ripristina(body.get('tipo',''),body.get('sha','')))
    else:self._json({'error':'sconosciuto'},404)
   except Exception as e:self._json({'ok':False,'error':str(e)},500)
  elif self.path=='/git-sync':
   length=int(self.headers.get('Content-Length',0))
   body=json.loads(self.rfile.read(length)) if length else {}
   msg=body.get('message','auto: media update')
   self._json(git_sync(msg,bool(body.get('wait'))))
  elif self.path=='/publish':
   length=int(self.headers.get('Content-Length',0))
   body=json.loads(self.rfile.read(length)) if length else {}
   self._json(git_sync(body.get('message','editor: aggiorna contenuti.json'),True,True))
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
 def _json(self,obj,code=200):
  data=json.dumps(obj,ensure_ascii=False).encode('utf-8')
  self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers()
  self.wfile.write(data)
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
// copia della pagina dentro l'app (la mette lì aggiorna-app.sh): serve
// quando l'SSD non è collegato
var bundleHtml = "";
try { bundleHtml = ObjC.unwrap($.NSBundle.mainBundle.resourcePath) + "/manager.html"; } catch (e) {}
task.arguments = $(["-c", pyCode, bundleHtml]);
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
// Chiedere di uscire passa dalla pagina, attraverso il server locale:
// l'app segna la richiesta, la pagina la vede (controlla ogni 400 ms),
// mostra l'avviso se ci sono modifiche non salvate e poi chiede al server
// di chiudere l'app. Così l'app non esce mai dentro una chiamata di WebKit
// (era quello a provocare la "chiusura inattesa" a ogni uscita).
var wv = null;
var mpQuitAsks = [];
function mpCurl(path) {
  try { return ObjC.unwrap(sa.doShellScript("curl -s -m 1 http://127.0.0.1:8471" + path + " 2>/dev/null; true")) || ""; }
  catch (e) { return ""; }
}
function mpRequestQuit() {
  if (mpQuitting) return;
  if (!wv || wv.isLoading) { mpQuitNow(); return; }
  // via di fuga: tre richieste in 4 secondi (es. pagina bloccata) chiudono comunque
  var now = Date.now();
  mpQuitAsks = mpQuitAsks.filter(function (t) { return now - t < 4000; });
  mpQuitAsks.push(now);
  if (mpQuitAsks.length >= 3) { mpQuitNow(); return; }
  mpCurl("/quit-request");
  // se la pagina non risponde entro 3 secondi, si chiude comunque
  $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(3.0, mpDel, "mpQuitCheck:", null, false);
}
var AE_CORE = 0x61657674; // 'aevt'
var AE_QUIT = 0x71756974; // 'quit'
ObjC.registerSubclass({
  name:"MPDel9",superclass:"NSObject",protocols:["NSApplicationDelegate","NSWindowDelegate"],
  methods:{
    "applicationShouldTerminateAfterLastWindowClosed:":{types:["bool",["id"]],implementation:function(s){return true;}},
    "windowShouldClose:":{types:["bool",["id"]],implementation:function(w){ mpRequestQuit(); return false; }},
    "windowWillClose:":{types:["void",["id"]],implementation:function(n){ mpQuitNow(); }},
    "mpQuitCheck:":{types:["void",["id"]],implementation:function(t){ if (mpCurl("/quit-acked").indexOf("true") < 0) mpQuitNow(); }},
    "mpQuit:":{types:["void",["id"]],implementation:function(sender){ mpRequestQuit(); }},
    "mpHandleQuit:withReply:":{types:["void",["id","id"]],implementation:function(ev,reply){ mpRequestQuit(); }},
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
var injectCode = "(function(){var s=document.createElement('style');s.textContent='html,body{background:#1c1c1c!important}';document.documentElement.appendChild(s)})();window.confirm=function(msg){return new Promise(function(resolve){var bg=document.createElement('div');bg.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99998;display:flex;align-items:center;justify-content:center;';var box=document.createElement('div');box.style.cssText='background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:24px;max-width:420px;width:90%;color:#fff;font-size:14px;font-family:Inter,system-ui,sans-serif;';box.innerHTML='<div style=\"margin-bottom:16px;line-height:1.5;\">'+msg.replace(/\\n/g,'<br>')+'</div><div style=\"display:flex;gap:8px;justify-content:flex-end;\"><button id=\"_cfNo\" style=\"padding:8px 16px;background:transparent;border:1px solid #444;color:#aaa;border-radius:4px;cursor:pointer;font-size:12px;\">Annulla</button><button id=\"_cfYes\" style=\"padding:8px 16px;background:#c8102e;border:1px solid #c8102e;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;\">Conferma</button></div>';bg.appendChild(box);document.body.appendChild(bg);document.getElementById('_cfYes').onclick=function(){bg.remove();resolve(true);};document.getElementById('_cfNo').onclick=function(){bg.remove();resolve(false);};bg.onclick=function(e){if(e.target===bg){bg.remove();resolve(false);}};})};window.alert=function(msg){var t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;font-size:13px;border:1px solid #444;max-width:500px;text-align:center;';document.body.appendChild(t);setTimeout(function(){t.remove();},4000)};document.addEventListener('click',function(e){var a=e.target.closest('a[target=_blank]');if(a&&a.href){e.preventDefault();e.stopPropagation();fetch('/open-url?url='+encodeURIComponent(a.href))}},true);document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();var btn=document.getElementById('btnSave');if(btn)btn.click();}if((e.metaKey||e.ctrlKey)&&(e.key==='z'||e.key==='Z')){e.preventDefault();if(e.shiftKey){if(window.__mpRedo)window.__mpRedo();else document.execCommand('redo');}else{if(window.__mpUndo)window.__mpUndo();else document.execCommand('undo');}}},true);window.__mpKeysInjected=true;";
var userScript = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(injectCode, $.WKUserScriptInjectionTimeAtDocumentStart, true);
cfg.userContentController.addUserScript(userScript);

wv = $.WKWebView.alloc.initWithFrameConfiguration(win.contentView.bounds,cfg);
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
