/** Restore ignored, offline test inputs from the last source-bearing commit.
 * Never overwrites a current authoring file or stages dataset content.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
const REF='f88e04535a2689d7ac9ef9e37bb72dfd64d1cf4a';
const root=process.cwd(),data=resolve(root,'vocabflow-dataset');
const lines=execFileSync('git',['ls-tree','-rl',REF,'--','vocabflow-dataset'],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
const missing=[];
for(const line of lines){const [meta,name]=line.split('\t');assert(/^100644 blob [a-f0-9]{40}\s+\d+$/.test(meta),'REGULAR_FIXTURE_FILE_REQUIRED');const target=resolve(root,name);assert(target.startsWith(data+sep),'FIXTURE_PATH_OUTSIDE_DATASET');if(!existsSync(target))missing.push(name);}
if(missing.length){
  const scratch=mkdtempSync(join(tmpdir(),'vocabflow-fixture-restore-'));const archive=join(scratch,'fixtures.tar');
  try{
    execFileSync('git',['archive','--format=tar',`--output=${archive}`,REF,'vocabflow-dataset'],{cwd:root,stdio:'pipe'});
    execFileSync('tar',['-xf',archive,'-C',scratch],{cwd:root,stdio:'pipe'});
    for(const name of missing){const source=resolve(scratch,name),target=resolve(root,name);assert(source.startsWith(resolve(scratch,'vocabflow-dataset')+sep));assert(lstatSync(source).isFile()&&!lstatSync(source).isSymbolicLink());assert(!existsSync(target),'FIXTURE_TARGET_APPEARED_DO_NOT_OVERWRITE');mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);}
  }finally{
    const checked=resolve(scratch),base=resolve(tmpdir());assert(checked.startsWith(base+sep)&&relative(base,checked).startsWith('vocabflow-fixture-restore-'),'SCRATCH_DELETE_OUTSIDE_OWNED_TEMP_DIRECTORY');rmSync(checked,{recursive:true,force:true});
  }
}
console.log(JSON.stringify({status:'ARCHIVED_TEST_FIXTURES_READY',sourceCommit:REF,restored:missing.length,currentFilesOverwritten:0,staged:0,providerCalls:0}));
