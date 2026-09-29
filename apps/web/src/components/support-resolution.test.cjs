// Uses the same PO_SEARCH_TEST_TOOLS React test renderer as register-query.test.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = process.env.PO_SEARCH_TEST_TOOLS;
const React = require(path.join(root, 'node_modules/react'));
const {act, create} = require(path.join(root, 'node_modules/react-test-renderer'));
const values = new Map([['accessToken','test-only'], ['mizantra-support-status:user',JSON.stringify({current:'FAILED',older:'ESCALATED'})]]);
const messages=[], events=[], calls=[]; let nextTimer;
const resolved={id:'current',title:'PO search',status:'RESOLVED',friendly_status:'Fixed',created_at:'2026-01-01'};
const older={...resolved,id:'older',status:'ESCALATED'};
function load(file) {
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,React,
    localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
    window:{setTimeout:fn=>{nextTimer=fn;return 1;},clearTimeout(){},dispatchEvent:e=>events.push(e)},
    require(name){
      if(name==='react')return React;
      if(name==='next/link')return {__esModule:true,default:()=>null};
      if(name==='lucide-react')return {ChevronDown:()=>null,LifeBuoy:()=>null};
      if(name==='sonner')return {toast:{info:m=>messages.push(m)}};
      if(name.includes('api-client'))return {apiClient:{get:async url=>{calls.push(url);return {issues:url.endsWith('RESOLVED')?[resolved]:[older],counts:{ACTIVE:1,RESOLVED:1,ARCHIVED:0}};}}};
      if(name.includes('support-issue-status'))return load(path.resolve(__dirname,'../lib/support-issue-status.ts'));
      throw Error(name);
    }}); return module.exports;
}
(async()=>{
  let tree;await act(async()=>{tree=create(React.createElement(load(path.join(__dirname,'SupportIssueStatus.tsx')).default,{userKey:'user',collapsed:false}));});
  assert.equal(messages.length,1);assert.match(messages[0],/has been fixed/);
  assert.equal(events.filter(e=>e.type==='mizantra:support-update').length,1);
  assert(calls.some(url=>url.endsWith('RESOLVED')));
  await act(async()=>{await nextTimer();});assert.equal(messages.length,1);
  await act(async()=>tree.unmount());console.log('PASS: 5 resolved-notification assertions; no duplicate toast or historical-incident notification.');
})().catch(error=>{console.error(error);process.exitCode=1;});
