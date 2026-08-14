#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Serveur local Coolblue Second Chance.

- Sert l'application web (index.html, app.js, ...)
- /api/proxy      : recupere une page coolblue.be (contourne le CORS du navigateur)
- /api/save-json  : enregistre les donnees scrapees (second_chance_offers.json)
- /api/rebuild-apk: recompile l'APK Android (build_apk.bat)
- /api/status     : etat des donnees et de l'APK

Usage : python server.py   (puis ouvrir http://localhost:8000)
"""

import json
import os
import re
import subprocess
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE_DIR, "second_chance_offers.json")
APK_FILE = os.path.join(BASE_DIR, "coolblue-second-chance.apk")
BUILD_BAT = os.path.join(BASE_DIR, "build_apk.bat")
HOST, PORT = "127.0.0.1", 8000

COOLBLUE_HOST = "www.coolblue.be"
PROXY_ALLOWED = re.compile(r"^https://www\.coolblue\.be/(en|fr)/.+")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8",
}

BUILD_ENV = os.environ.copy()
BUILD_ENV.update({
    "JAVA_HOME": r"C:\android-build\jdk17\jdk-17.0.20+8",
    "ANDROID_HOME": r"C:\android-build\sdk",
})

_build_result = {"running": False, "ok": None, "finished": None, "error": None}


def run_build_worker():
    """Lance la compilation APK dans un thread dedie et met a jour _build_result."""
    global _build_result
    try:
        proc = subprocess.Popen(
            ["cmd", "/c", "build_apk.bat", "/nopause"],
            cwd=BASE_DIR,
            env=BUILD_ENV,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        proc.wait(timeout=900)
        _build_result = {
            "running": False,
            "ok": proc.returncode == 0,
            "finished": time.strftime("%Y-%m-%d %H:%M:%S"),
            "error": None if proc.returncode == 0 else f"exit {proc.returncode}",
        }
    except Exception as exc:
        _build_result = {
            "running": False,
            "ok": False,
            "finished": time.strftime("%Y-%m-%d %H:%M:%S"),
            "error": str(exc),
        }


def read_json():
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def proxy_fetch(url):
    """Recupere une page coolblue.be avec retry/backoff sur 503/429."""
    for attempt in range(4):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 200:
                return {"status": 200, "body": r.text}
            if r.status_code in (503, 429):
                time.sleep(5 + attempt * 5)
                continue
            return {"status": r.status_code, "body": ""}
        except requests.RequestException as exc:
            if attempt == 3:
                return {"status": 0, "body": f"error: {exc}"}
            time.sleep(3 + attempt * 3)
    return {"status": 0, "body": "error: retries exhausted"}


class Handler(SimpleHTTPRequestHandler):
    # Bonne détection MIME pour les fichiers PWA
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".webmanifest": "application/manifest+json",
        ".js": "application/javascript",
        ".json": "application/json",
    })

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Pas de cache pour le shell de l'app (index/sw/manifest) en dev
        if self.path.split("?")[0] in ("/index.html", "/sw.js", "/manifest.webmanifest", "/app.js"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            print("[api]", self.path)

    # ---------- GET ----------
    def do_GET(self):
        if self.path.startswith("/api/proxy"):
            self.handle_proxy()
        elif self.path.startswith("/api/status"):
            self.handle_status()
        else:
            super().do_GET()

    def handle_proxy(self):
        from urllib.parse import urlparse, parse_qs

        query = parse_qs(urlparse(self.path).query)
        url = (query.get("url") or [""])[0]
        if not PROXY_ALLOWED.match(url):
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"invalid url")
            return
        result = proxy_fetch(url)
        body = result["body"].encode("utf-8", errors="replace")
        self.send_response(result["status"])
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_status(self):
        data = read_json()
        apk = {}
        if os.path.exists(APK_FILE):
            st = os.stat(APK_FILE)
            apk = {
                "exists": True,
                "size": st.st_size,
                "modified": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(st.st_mtime)),
            }
        payload = {
            "data": {
                "scrapedAt": (data or {}).get("metadata", {}).get("scrapedAt"),
                "totalProducts": (data or {}).get("metadata", {}).get("totalProducts"),
                "totalVariants": (data or {}).get("metadata", {}).get("totalVariants"),
                "categories": (data or {}).get("metadata", {}).get("categories"),
            },
            "apk": apk,
            "build": _build_result,
            "now": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ---------- POST ----------
    def do_POST(self):
        if self.path.startswith("/api/save-json"):
            self.handle_save_json()
        elif self.path.startswith("/api/rebuild-apk"):
            self.handle_rebuild_apk()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_save_json(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8"))
            products = payload.get("products")
            if not isinstance(products, list):
                raise ValueError("missing products")
            metadata = payload.get("metadata") or {}
            metadata.setdefault("scrapedAt", time.strftime("%Y-%m-%d %H:%M:%S"))
            metadata["totalProducts"] = len(products)
            out = {"metadata": metadata, "products": products}
            tmp = JSON_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False, indent=2)
            os.replace(tmp, JSON_FILE)
            result = {"ok": True, "totalProducts": len(products), "scrapedAt": metadata["scrapedAt"]}
            self.send_json(result, 200)
        except Exception as exc:
            self.send_json({"ok": False, "error": str(exc)}, 400)

    def handle_rebuild_apk(self):
        if _build_result["running"]:
            self.send_json({"ok": False, "error": "build already running"}, 409)
            return
        if not os.path.exists(BUILD_BAT):
            self.send_json({"ok": False, "error": "build_apk.bat missing"}, 404)
            return
        _build_result["running"] = True
        _build_result["ok"] = None
        _build_result["finished"] = None
        _build_result["error"] = None
        threading.Thread(target=run_build_worker, daemon=True).start()
        self.send_json({"ok": True, "message": "build started"}, 202)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def open_browser():
    time.sleep(1.2)
    webbrowser.open(f"http://localhost:{PORT}")


def main():
    print("=" * 56)
    print("  COOLBLUE SECOND CHANCE - SERVEUR LOCAL")
    print(f"  http://localhost:{PORT}")
    print("  (boutons Mise a jour / Recompiler APK dans l'interface)")
    print("=" * 56)
    threading.Thread(target=open_browser, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArret du serveur.")


if __name__ == "__main__":
    main()
