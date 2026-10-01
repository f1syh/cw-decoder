#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import json,datetime,re
LOG=Path('/var/log/cw-decoder'); LOG.mkdir(parents=True,exist_ok=True)
def safe(s): return re.sub(r'[^A-Za-z0-9_-]','_',str(s))[:80] or 'unknown'
class H(BaseHTTPRequestHandler):
 def do_POST(self):
  if self.path!='/api/debug': self.send_error(404); return
  try:
   n=int(self.headers.get('Content-Length','0')); data=json.loads(self.rfile.read(n) or b'{}'); sid=safe(data.get('session','unknown')); data['server_ts']=datetime.datetime.now(datetime.timezone.utc).isoformat(); line=json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n';
   with (LOG/f'{sid}.jsonl').open('a',encoding='utf-8') as f:f.write(line)
   (LOG/'current.jsonl').unlink(missing_ok=True); (LOG/'current.jsonl').symlink_to(LOG/f'{sid}.jsonl')
   self.send_response(204); self.end_headers()
  except Exception as e:self.send_error(400,str(e))
 def log_message(self,fmt,*args): print('%s - %s'%(self.address_string(),fmt%args),flush=True)
ThreadingHTTPServer(('127.0.0.1',8079),H).serve_forever()
