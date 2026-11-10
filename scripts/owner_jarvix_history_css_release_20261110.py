#!/usr/bin/env python3
"""Owner-approved SINGLE-CSS Pages deploy, preserving the LIVE content-addressed asset
manifest and rebuilding the EXISTING live Worker from its ORIGINAL Git commit.
No DEV worker, configuration, payment, routing, or other site resources.
"""
import base64, hashlib, json, os, pathlib, re, subprocess, sys, tempfile, time
import requests
from blake3 import blake3

A="https://api.cloudflare.com/client/v4"
DOMAIN="https://deepsyq.app"
REL="jarvix-chat.css"
B="app/src/main/assets/"
P=pathlib.Path(B+REL)
ACCOUNT=os.environ.get("CLOUDFLARE_ACCOUNT_ID","")
TOKEN=os.environ.get("CLOUDFLARE_API_TOKEN","")
PROJECT="deepsyq"
class Blocked(Exception):pass
def must(ok,msg):
    if not ok:raise Blocked(msg)
def sh(*cmd,cwd=None):
    r=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True)
    must(r.returncode==0,"Build/source verification failed: "+' '.join(cmd[:3]))
    return r.stdout.strip()
def git_bytes(rev,name):
    r=subprocess.run(["git","show",rev+":"+name],capture_output=True)
    must(r.returncode==0,"Cannot recover original source: "+name)
    return r.stdout
def get_result(session,url):
    r=session.get(url,timeout=22)
    must(r.ok,"Cloudflare read HTTP "+str(r.status_code))
    data=r.json()
    must(data.get("success") is True and data.get("result") is not None,"Cloudflare read refused")
    return data["result"]
def normalize(files):
    must(isinstance(files,dict) and len(files)>=100,"Incomplete live manifest")
    result={}
    for path,hash_ in files.items():
        name=path if path.startswith("/") else "/"+path
        must(re.fullmatch("[a-f0-9]{32}",str(hash_ or "")) is not None,"Bad manifest hash")
        must(name not in result,"Duplicate manifest route")
        result[name]=hash_
    return result
def css_source():
    data=P.read_bytes()
    original=git_bytes("7a677d6b629b5193ac04aa611efd21119c24a2b4^",B+REL)
    marker=b"/* JARVIX: history scroll ends ABOVE its account footer"
    must(data.startswith(original) and data[len(original):].count(marker)==1 and
         data.count(marker)==1,"The CSS has unrelated changes; no publication")
    must(b"grid-template-rows:max-content max-content max-content max-content max-content minmax(0,1fr) max-content" in data,
         "Owner-approved history clip not found")
    return data
def main():
    must(re.fullmatch("[a-f0-9]{32}",ACCOUNT or "") is not None and bool(TOKEN),
         "Cloudflare credentials missing")
    css=css_source()
    session=requests.Session()
    session.headers.update({"Authorization":"Bearer "+TOKEN})
    base=A+"/accounts/"+ACCOUNT+"/pages/projects/"+PROJECT
    project=get_result(session,base)
    must(project.get("name")==PROJECT and project.get("production_branch")=="deepsyq-platform","Wrong production project")
    old_id=(project.get("canonical_deployment") or {}).get("id")
    must(old_id,"Canonical deployment unavailable")
    deployment=get_result(session,base+"/deployments/"+old_id)
    must(deployment.get("uses_functions") is True,"Original Worker inactive")
    original_git=(deployment.get("deployment_trigger") or (project.get("canonical_deployment") or {}).get("deployment_trigger") or {}).get("metadata",{}).get("commit_hash")
    must(re.fullmatch("[a-f0-9]{40}",original_git or "") is not None,"LIVE worker source commit missing")
    worker=project.get("production_script_name","")
    must(worker.startswith("pages-worker--") and worker.endswith("-production"),"Worker identity unknown")
    before_settings=get_result(session,A+"/accounts/"+ACCOUNT+"/workers/scripts/"+worker+"/settings")
    cfg=(project.get("deployment_configs") or {}).get("production") or {}
    env=cfg.get("env_vars") or {}
    for name in ["GOOGLE_CLIENT_ID","STRIPE_SECRET_KEY","DATABASE_URL"]:
        must(name in env,"Required live environment binding missing: "+name)
    files=normalize(deployment.get("files"))
    must("/"+REL in files,"Requested CSS missing from live manifest")
    old_hash=files["/"+REL]
    new_hash=blake3(css+b"css").hexdigest()[:32]
    if new_hash==old_hash:
        print("ALREADY_LIVE_CSS_HASH",json.dumps({"css":REL,"deployment":old_id}))
        return
    candidate=dict(files);candidate["/"+REL]=new_hash
    must(len(candidate)==len(files) and all(candidate[k]==files[k] for k in files if k!="/"+REL),
         "Other resource changed")
    print("CSS_ONLY_PREFLIGHT",json.dumps({"old":old_id,"sourceCommit":original_git[:14],
         "assetsUnchanged":len(files)-1,"newHash":new_hash,"workerPreservedFromGit":True}),flush=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp=pathlib.Path(tmp)
        original=tmp/"original"
        sh("git","worktree","add","--detach",str(original),original_git)
        old_worker=git_bytes(original_git,B+"_worker.js")
        must(old_worker and b"generate-models.js" in old_worker,"Cannot confirm original worker import")
        from pathlib import Path
        source=original / B / "_worker.js"
        output=tmp/"worker.mjs"
        sh("npx","--yes","esbuild@0.24.2",str(source),"--bundle","--platform=browser","--format=esm",
           "--target=es2022","--outfile="+str(output))
        sh("node","--check",str(output))
        bundled=output.read_bytes()
        must(b"generate-models.js" not in bundled or b"import " not in bundled,
             "Worker still has unresolved source imports")
        must(10000<len(bundled)<25000000,"Unreasonable Worker bundle")
        print("ORIGINAL_WORKER_BUNDLED",json.dumps({"size":len(bundled),"sourceCommit":original_git[:14]}),flush=True)
        # Cloudflare Pages content-addressed upload of just this CSS.
        upload=get_result(session,base+"/upload-token")
        jwt=upload.get("jwt") or upload.get("token")
        must(isinstance(jwt,str) and jwt,"Asset upload token unavailable")
        h={"Authorization":"Bearer "+jwt}
        check=session.post(A+"/pages/assets/check-missing",headers=h,json={"hashes":[new_hash]},timeout=25)
        must(check.ok,"Asset-check HTTP "+str(check.status_code))
        cj=check.json()
        must(cj.get("success") is True,"Asset-check refused")
        missing=cj.get("result") or []
        must(isinstance(missing,list) and set(missing).issubset({new_hash}),"Unexpected missing content hashes")
        if new_hash in missing:
            body=[{"key":new_hash,"value":base64.b64encode(css).decode("ascii"),"base64":True,"metadata":{"contentType":"text/css"}}]
            up=session.post(A+"/pages/assets/upload",headers=h,json=body,timeout=40)
            must(up.ok and up.json().get("success") is True,"CSS upload failed")
        print("ONLY_APPROVED_CSS_ASSET_STORED",flush=True)
        specials={"_worker.js":("_worker.js",bundled,"application/javascript")}
        for name in ("_headers","_redirects","_routes.json"):
            candidate_file=original/B/name
            if candidate_file.is_file():
                raw=candidate_file.read_bytes()
                specials[name]=(name,raw,"application/json" if name.endswith(".json") else "text/plain")
        # Last race check: refuse to roll back newer concurrent production changes.
        newest=get_result(session,base)
        must((newest.get("canonical_deployment") or {}).get("id")==old_id,"Production changed during preflight")
        data={"branch":"deepsyq-platform","commit_hash":original_git,"commit_dirty":"true",
              "commit_message":"Owner JARVIX history panel: only CSS hash changed; original Worker bundled",
              "manifest":json.dumps(candidate,separators=(",",":"))}
        response=session.post(base+"/deployments",data=data,files=specials,timeout=95)
        must(response.ok,"Cloudflare deployment HTTP "+str(response.status_code))
        created=response.json()
        must(created.get("success") is True and created.get("result",{}).get("id"),"Cloudflare deployment API refused")
        new_id=created["result"]["id"]
        print("CSS_ONLY_DEPLOYMENT_SUBMITTED",json.dumps({"id":new_id}),flush=True)
        for _ in range(18):
            p=get_result(session,base)
            latest_id=(p.get("canonical_deployment") or {}).get("id")
            deployment_now=get_result(session,base+"/deployments/"+new_id)
            state=(deployment_now.get("latest_stage") or {}).get("status")
            if state=="failure":
                raise Blocked("Deployment failed before MAIN activation, inspect Cloudflare functions logs")
            if latest_id==new_id:
                actual=normalize(deployment_now.get("files"))
                must(actual==candidate,"Published manifest changed unexpected assets")
                must(deployment_now.get("uses_functions") is True,"Worker disabled")
                must(p.get("production_script_name")==worker,"Worker script name changed")
                after=get_result(session,A+"/accounts/"+ACCOUNT+"/workers/scripts/"+worker+"/settings")
                must(after==before_settings,"Worker settings/bindings changed unexpectedly")
                for endpoint in ("/api/config","/jarvix-chat.html"):
                    r=requests.get(DOMAIN+endpoint,timeout=15)
                    must(r.ok,"Live endpoint health check failed: "+endpoint)
                content=requests.get(DOMAIN+"/"+REL+"?verify="+new_hash,headers={"Cache-Control":"no-cache"},timeout=15)
                must(content.ok and hashlib.sha256(content.content).digest()==hashlib.sha256(css).digest(),
                     "CDN CSS byte-for-byte verification pending")
                print("PUBLISHED_VERIFIED",json.dumps({"id":new_id,"changed":["/"+REL],
                    "otherAssetHashesPreserved":len(files)-1,"originalWorkerSettingsIdentical":True}),flush=True)
                return
            time.sleep(3)
        raise Blocked("Submitted CSS release not confirmed live; status needs investigation")
if __name__=="__main__":
    try:main()
    except Blocked as e:
        print("BLOCKED_MAIN_OR_UNVERIFIED: "+str(e),file=sys.stderr)
        raise SystemExit(2)
