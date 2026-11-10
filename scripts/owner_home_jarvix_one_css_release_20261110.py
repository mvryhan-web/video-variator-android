#!/usr/bin/env python3
"""One-time owner-approved Pages asset-manifest deployment: ONLY deepsyq.css.

Use the existing LIVE manifest unchanged except one CSS hash. Keep LIVE Worker
source and special files from the exact commit recorded by production. Never
rebuild from DEV, overwrite credentials, or expose token values.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

import requests
from blake3 import blake3

PROJECT = "deepsyq"
ROOT = Path("app/src/main/assets")
CSS_PATH = ROOT / "deepsyq.css"
API = "https://api.cloudflare.com/client/v4"
DOMAIN = "https://deepsyq.app"
DEFAULT_TIMEOUT = 35

class Blocked(RuntimeError):
    pass

def guard(ok, msg):
    if not ok:
        raise Blocked(msg)

def sha256(raw):
    return hashlib.sha256(raw).hexdigest()

def git_file(revision, relative):
    p = subprocess.run(["git", "show", revision + ":" + relative], capture_output=True)
    guard(p.returncode == 0, "Cannot read original production file: " + relative)
    return p.stdout

class CF:
    def __init__(self):
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
        token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
        guard(re.fullmatch("[a-f0-9]{32}", account or "") and token, "Cloudflare credential unavailable")
        self.base = API + "/accounts/" + account + "/pages/projects/" + PROJECT
        self.s = requests.Session()
        self.s.headers.update({"Authorization": "Bearer " + token})

    def result(self, response, tag):
        guard(response.ok, tag + " HTTP " + str(response.status_code))
        try:
            body = response.json()
        except ValueError:
            raise Blocked(tag + " unexpected response") from None
        guard(body.get("success") is True and body.get("result") is not None, tag + " API refused")
        return body["result"]

    def get(self, url):
        return self.result(self.s.get(url, timeout=DEFAULT_TIMEOUT), "GET " + url.split("?")[0].split("/")[-1])

    def project(self):
        p=self.get(self.base)
        guard(p.get("name") == PROJECT and p.get("production_branch") == "deepsyq-platform",
              "Wrong production project")
        return p

    def deployment(self, ident):
        d=self.get(self.base + "/deployments/" + ident)
        guard(d.get("id")==ident and d.get("uses_functions") is True, "Production Worker not active")
        return d

    def worker_settings(self, name):
        guard(name and name.startswith("pages-worker--") and name.endswith("-production"), "Unknown Worker identity")
        return self.get(API + "/accounts/" + os.environ["CLOUDFLARE_ACCOUNT_ID"] +
                        "/workers/scripts/" + name + "/settings")

def canon(files):
    guard(isinstance(files,dict) and len(files)>100,"Missing LIVE asset manifest")
    out = {}
    for k,v in files.items():
        key=k if k.startswith("/") else "/" + k
        guard(key not in out and re.fullmatch("[0-9a-f]{32}",str(v or "")) and ".." not in key,
              "Invalid LIVE manifest entry")
        out[key]=v
    return out

def owner_css():
    css=CSS_PATH.read_bytes()
    before=git_file("06bb977014d52cbf093db41975023b834aaacbda^",str(CSS_PATH))
    old=b"display:flex;flex-direction:row;align-items:center;gap:10px;"
    new=b"display:flex;flex-direction:row;align-items:center;justify-content:flex-start!important;gap:10px;"
    guard(before.count(old)==1 and css==before.replace(old,new,1),
          "CSS contains unrelated changes, no publication allowed")
    guard(css.count(new)==1,"New JARVIX mobile alignment not found")
    return css

def asset_token(cf):
    data=cf.get(cf.base + "/upload-token")
    token=data.get("jwt") or data.get("token") if isinstance(data,dict) else None
    guard(isinstance(token,str) and len(token)>30, "Pages asset upload JWT unavailable")
    return token

def publish():
    css=owner_css()
    cf=CF()
    p=cf.project()
    old_id=(p.get("canonical_deployment") or {}).get("id")
    guard(old_id, "No production deployment")
    d=cf.deployment(old_id)
    trigger=(d.get("deployment_trigger") or (p.get("canonical_deployment") or {}).get("deployment_trigger") or {})
    orig=(trigger.get("metadata") or {}).get("commit_hash")
    guard(re.fullmatch("[a-f0-9]{40}",orig or ""), "Unknown original deployed Worker commit")
    source=git_file(orig,"app/src/main/assets/_worker.js")
    guard(source and b"export" in source, "Original deployed Worker source not usable")
    worker=p.get("production_script_name")
    worker_before=cf.worker_settings(worker)
    files=canon(d.get("files"))
    guard("/deepsyq.css" in files, "Existing CSS route is not in LIVE")
    original_hash=files["/deepsyq.css"]
    new_hash=blake3(css+b"css").hexdigest()[:32]
    if original_hash == new_hash:
        print(json.dumps({"status":"NO_CHANGE_ALREADY_LIVE","css":"deepsyq.css","published":False}))
        return
    candidate=dict(files)
    candidate["/deepsyq.css"]=new_hash
    guard(len(candidate)==len(files) and all(candidate[k]==v for k,v in files.items() if k!="/deepsyq.css"),
          "Other LIVE asset would change")

    # Assets are content-addressed. This uploads only a single new CSS hash.
    token=asset_token(cf)
    hdr={"Authorization":"Bearer "+token}
    missing=cf.result(requests.post(API+"/pages/assets/check-missing",
             headers=hdr,json={"hashes":[new_hash]},timeout=DEFAULT_TIMEOUT),"asset-check")
    guard(isinstance(missing,list), "Unexpected asset-check format")
    guard(set(missing).issubset({new_hash}), "Unexpected missing asset list")
    if new_hash in missing:
        asset=[{"key":new_hash,"value":base64.b64encode(css).decode("ascii"),
                "base64":True,"metadata":{"contentType":"text/css"}}]
        uploaded=requests.post(API+"/pages/assets/upload",headers=hdr,json=asset,timeout=DEFAULT_TIMEOUT)
        guard(uploaded.ok and uploaded.json().get("success") is True, "Pages asset upload refused")
    print(json.dumps({"status":"PREPARED_ONLY_ONE_CSS_ASSET","previousDeployment":old_id,
                      "unchangedAssets":len(files)-1,"workerSourceCommit":orig[:12]}),flush=True)

    specials={}
    for name in ("_worker.js","_headers","_redirects","_routes.json"):
        try:
            raw=git_file(orig,"app/src/main/assets/"+name)
            specials[name]=(name,raw,
                "application/javascript" if name.endswith(".js") else
                "application/json" if name.endswith(".json") else "text/plain")
        except Blocked:
            if name=="_worker.js":
                raise
    guard(specials.get("_worker.js",())[1]==source,"Worker source differs unexpectedly")
    # Race guard: no production update between preflight and deployment.
    latest=cf.project()
    guard((latest.get("canonical_deployment") or {}).get("id")==old_id,
          "Production changed concurrently; stop without deploy")
    data={"manifest":json.dumps(candidate,separators=(",",":")),
          "branch":"deepsyq-platform","commit_hash":orig,
          "commit_dirty":"true",
          "commit_message":"Owner exact mobile JARVIX left alignment: one CSS asset, live Worker preserved"}
    # Multipart manifest + exact live worker; the live manifest is otherwise unchanged.
    response=cf.s.post(cf.base+"/deployments",data=data,files=specials,timeout=90)
    created=cf.result(response,"Pages deployment")
    new_id=created.get("id") if isinstance(created,dict) else None
    guard(new_id, "Deployment ID not returned")
    print(json.dumps({"status":"DEPLOYMENT_CREATED","id":new_id}),flush=True)

    for _ in range(20):
        latest=cf.project()
        current=(latest.get("canonical_deployment") or {}).get("id")
        if current==new_id:
            after=cf.deployment(new_id)
            actual=canon(after.get("files"))
            guard(actual==candidate,"PRODUCTION_MANIFEST_CHANGED_BEYOND_ONE_CSS")
            guard(latest.get("production_script_name")==worker,"PRODUCTION_WORKER_NAME_CHANGED")
            guard(cf.worker_settings(worker)==worker_before,"PRODUCTION_WORKER_SETTINGS_CHANGED")
            guard(after.get("uses_functions") is True,"PRODUCTION_WORKER_DISABLED")
            response=requests.get(DOMAIN+"/deepsyq.css?jarvix_approval="+new_hash,
                                  headers={"Cache-Control":"no-cache"},timeout=20)
            guard(response.ok and sha256(response.content)==sha256(css),
                  "CSS live bytes not yet identical (check CDN)")
            auth=requests.get(DOMAIN+"/api/config",timeout=20)
            guard(auth.ok and bool(auth.json().get("googleClientId")),
                  "Production auth API health failed")
            print(json.dumps({"status":"PUBLISHED_VERIFIED","oldDeployment":old_id,
                  "newDeployment":new_id,"onlyChanged":"/deepsyq.css",
                  "otherAssetsUnchanged":len(files)-1,
                  "workerAndBindingsPreserved":True,"published":True}),flush=True)
            return
        time.sleep(3)
    raise Blocked("DEPLOYMENT_NOT_CONFIRMED_ON_MAIN, inspect Cloudflare; do not claim success")

if __name__=="__main__":
    try:
        publish()
    except Blocked as exc:
        print("BLOCKED_MAIN — NOT PUBLISHED/VERIFY_STATUS: "+str(exc),file=sys.stderr)
        raise SystemExit(2)
