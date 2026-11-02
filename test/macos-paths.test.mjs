import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,chmodSync,symlinkSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {discoverMacApp} from '../src/macos-paths.mjs';
test('Mac discovery validates bundled CLI, supports custom paths and resolves symlinks',{skip:process.platform==='win32'},()=>{
 const root=mkdtempSync(path.join(tmpdir(),'quota paths '));
 try{
  const bad=path.join(root,'Invalid.app'),app=path.join(root,'My Client.app');
  for(const dir of [bad,app]){mkdirSync(path.join(dir,'Contents','Resources'),{recursive:true});writeFileSync(path.join(dir,'Contents','Info.plist'),'fixture');}
  const cli=path.join(app,'Contents','Resources','codex');writeFileSync(cli,'fixture');chmodSync(cli,0o700);
  assert.equal(discoverMacApp({candidates:[bad,app]}).app,realpathSync(app));
  assert.equal(discoverMacApp({explicit:bad,candidates:[app]}),null);
  assert.equal(discoverMacApp({saved:bad,candidates:[app]}),null);
  const link=path.join(root,'Alias.app');symlinkSync(app,link);
  assert.equal(discoverMacApp({explicit:link}).app,realpathSync(app));
  chmodSync(cli,0o600);assert.equal(discoverMacApp({explicit:app}),null);
 }finally{rmSync(root,{recursive:true,force:true});}
});
