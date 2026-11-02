import {accessSync,constants,statSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {homedir} from 'node:os';

function executable(file){try{accessSync(file,constants.X_OK);return statSync(file).isFile();}catch{return false;}}
export function inspectMacApp(candidate){
 if(typeof candidate!=='string'||!path.isAbsolute(candidate)||!candidate.endsWith('.app'))return null;
 try{
  const app=realpathSync(candidate);
  if(!statSync(path.join(app,'Contents','Info.plist')).isFile())return null;
  const cli=['Contents/Resources/codex-cli/bin/codex','Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex','Contents/Resources/codex']
   .map(p=>path.join(app,p)).find(executable);
  return cli?{app,cli:realpathSync(cli)}:null;
 }catch{return null;}
}
export function discoverMacApp({explicit,saved,candidates}={}){
 // An explicit or previously selected installation must not silently switch accounts/apps.
 if(explicit!==undefined)return inspectMacApp(explicit);
 if(saved!==undefined)return inspectMacApp(saved);
 const defaults=['/Applications/Codex.app','/Applications/ChatGPT.app',path.join(homedir(),'Applications/Codex.app'),path.join(homedir(),'Applications/ChatGPT.app')];
 for(const candidate of candidates??defaults){const found=inspectMacApp(candidate);if(found)return found;}
 return null;
}
