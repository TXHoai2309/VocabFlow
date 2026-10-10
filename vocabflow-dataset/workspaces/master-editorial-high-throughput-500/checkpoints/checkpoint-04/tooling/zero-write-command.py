"""Run a validation command and compare Git status and visible file bytes."""
import hashlib
import os
import subprocess
import sys
from pathlib import Path

ROOT=next(p for p in Path(__file__).resolve().parents if (p/'AGENTS.md').exists())


def snapshot():
    status=subprocess.check_output(['git','status','--short','--untracked-files=all'],cwd=ROOT)
    paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode('utf-8').split('\0')
    files={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths if p and (ROOT/p).is_file()}
    caches={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'scripts').rglob('*.pyc')}
    return status,files,caches


if __name__=='__main__':
    command=sys.argv[1:]
    if command and command[0]=='--':command=command[1:]
    if not command:raise SystemExit('A read-only validation command is required')
    before=snapshot();env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
    result=subprocess.run(command,cwd=ROOT,env=env)
    after=snapshot()
    if before!=after:
        changed=sorted(set(before[1])^set(after[1])|{p for p in before[1].keys()&after[1].keys() if before[1][p]!=after[1][p]})
        print('ZERO_WRITE_FAILURE',changed,'statusChanged',before[0]!=after[0],'cacheChanged',before[2]!=after[2])
        raise SystemExit(1)
    print('ZERO_WRITE_PASS',len(before[1]),'visible files; Git status and script caches unchanged',flush=True)
    raise SystemExit(result.returncode)
