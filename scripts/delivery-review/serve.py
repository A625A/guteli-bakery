"""Loopback-only, read-only map review. No database, keys or external requests."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
UI = ROOT / 'scripts/delivery-review/ui'
DATA = ROOT / 'data/delivery-review'
FILES = {
    '/': (UI / 'index.html', 'text/html'),
    '/review.js': (UI / 'review.js', 'text/javascript'),
    '/model.mjs': (UI / 'model.mjs', 'text/javascript'),
    '/review.css': (UI / 'review.css', 'text/css'),
    '/leaflet.js': (ROOT / 'node_modules/leaflet/dist/leaflet.js', 'text/javascript'),
    '/leaflet.css': (ROOT / 'node_modules/leaflet/dist/leaflet.css', 'text/css'),
}
for name in ['areas.geojson','references.geojson','roads.geojson','manifest.json','validation.json']:
    FILES['/data/'+name] = (DATA / name, 'application/json')
FILES['/data/context.geojson'] = (DATA / 'sources/municipal-context.geojson','application/json')

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args): pass
    def do_GET(self):
        origin = f'http://127.0.0.1:{self.server.server_port}'
        if self.headers.get('Host') != f'127.0.0.1:{self.server.server_port}' or self.headers.get('Origin',origin) != origin:
            self.send_error(403); return
        item = FILES.get(urlsplit(self.path).path)
        if not item or not item[0].is_file():
            self.send_error(404); return
        raw = item[0].read_bytes()
        self.send_response(200)
        self.send_header('Content-Type',item[1]+'; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('X-Frame-Options','DENY')
        self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        self.end_headers(); self.wfile.write(raw)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=3140)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535: parser.error('Use port 1024–65535')
    if not FILES['/leaflet.js'][0].is_file(): parser.error('Install the existing lockfile with npm ci first.')
    server = ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'Güteli · revisión local: http://127.0.0.1:{args.port}/ — Ctrl+C para cerrar',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
