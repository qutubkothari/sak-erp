const fs = require('node:fs');
const assert = require('node:assert/strict');
const profiles = ['SAIFSEAS','MIZANTRA','ARWA'];
function verify(rows, sha) {
  assert(/^[0-9a-f]{40}$/.test(sha), 'Full canonical SHA required');
  assert.equal(rows.length, 3, 'Evidence for all three applications required');
  const differences = {};
  for (const profile of profiles) {
    const row = rows.find(row => row.profile === profile);
    assert(row, 'Missing profile ' + profile);
    for (const key of ['source_sha','api_sha','web_sha','public_sha']) assert.equal(row[key], sha, profile + ' ' + key + ' drift');
    assert.equal(row.source_clean, true, profile + ' source is not clean');
    assert.equal(row.api_status, 'online', profile + ' API is not online');
    assert.equal(row.web_status, 'online', profile + ' web is not online');
    for (const key of ['MIZANTRA_UNIFIED_AI_ENABLED','MIZANTRA_UNIFIED_ROUTER_ENABLED']) assert.equal(String(row.unified_flags?.[key]), 'true', profile + ' unified flag drift');
    assert(row.native_before && row.native_after, profile + ' mode-preservation evidence missing');
    assert.deepEqual(row.native_after, row.native_before, profile + ' native configuration changed');
    differences[profile] = row.native_after;
  }
  return {passed:true,shared_core_sha:sha,profiles,configuration_differences:'INTENTIONAL_CONFIGURATION_NOT_SOURCE_DRIFT',native_configuration:differences};
}
if (require.main === module) {
  if (process.argv.includes('--self-test')) {
    const sha = 'a'.repeat(40), rows = profiles.map(profile => ({profile,source_sha:sha,api_sha:sha,web_sha:sha,public_sha:sha,source_clean:true,api_status:'online',web_status:'online',unified_flags:{MIZANTRA_UNIFIED_AI_ENABLED:true,MIZANTRA_UNIFIED_ROUTER_ENABLED:true},native_before:{operator:profile==='SAIFSEAS'?'OFF':'APPROVAL_REQUIRED'},native_after:{operator:profile==='SAIFSEAS'?'OFF':'APPROVAL_REQUIRED'}}));
    assert.equal(verify(rows,sha).passed,true);
    assert.throws(()=>verify(rows.slice(1),sha));
    assert.throws(()=>verify(rows.map((row,index)=>index?row:{...row,source_sha:'b'.repeat(40)}),sha));
    assert.throws(()=>verify(rows.map((row,index)=>index?row:{...row,native_after:{operator:'ON'}}),sha));
    assert.throws(()=>verify(rows.map((row,index)=>index?row:{...row,source_clean:false}),sha));
    assert.throws(()=>verify(rows.map((row,index)=>index?row:{...row,public_sha:'b'.repeat(40)}),sha));
    process.stdout.write(JSON.stringify({self_tests:6,passed:true})+'\n');
  } else {
    try { process.stdout.write(JSON.stringify(verify(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),process.argv[3]))+'\n'); }
    catch (error) { process.stdout.write(JSON.stringify({passed:false,reason:error.message})+'\n');process.exitCode=1; }
  }
}
module.exports = {verify};