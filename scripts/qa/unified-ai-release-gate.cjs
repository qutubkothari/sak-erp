const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const registerPath = path.join(root, 'scripts/qa/baselines/unified-ai-v1.json');
const originalSha = '213d4c33288bbaf661541aaceddfd3a983610e11';
function decode(buffer) {
  const text = buffer[0] === 255 && buffer[1] === 254 ? buffer.toString('utf16le') : buffer.toString('utf8');
  return text.replace(/^\ufeff/, '');
}
function normalize(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, '').replace(/\\/g, '/').split(root.replace(/\\/g, '/')).join('<ROOT>').replace(/\(\d+,\d+\)/g, '(LOCATION)');
}
function testsFrom(result) {
  const failures = [];
  for (const suite of result.testResults || []) {
    const name = String(suite.name).replace(/\\/g, '/').replace(/^.*\/apps\/api\//, '');
    if (suite.status === 'failed' && !suite.assertionResults?.length) failures.push({ identity: name + '::SUITE_LOAD', signature: normalize(suite.message).split('\n').find(line => line.trim()) || 'SUITE_LOAD' });
    for (const test of suite.assertionResults || []) {
      if (test.status !== 'failed') continue;
      failures.push({ identity: name + '::' + test.fullName, signature: normalize(test.failureMessages?.[0] || '').split('\n').find(line => line.trim()) || 'FAILED' });
    }
  }
  return failures.sort((left, right) => left.identity.localeCompare(right.identity));
}
function typesFrom(text) {
  return text.split(/\r?\n/).filter(line => /error TS\d+:/.test(line)).map(line => normalize(line.trim()).replace(/^apps\/api\//, '')).sort();
}
function counts(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) || 0) + 1);
  return result;
}
function validateEvidence(result, typeLog, baselineMode = false) {
  if (!Array.isArray(result.testResults) || result.numTotalTestSuites < 112 || result.numTotalTests < 1484 || result.testResults.length !== result.numTotalTestSuites || /FATAL ERROR|heap out of memory|Cannot find module|Aborted/i.test(typeLog)) throw new Error('Incomplete regression evidence or failed compiler process.');
  if (!baselineMode) {
    const required = ['unified-ai.registry','unified-ai.context','unified-ai.service','unified-ai.integration','unified-ai.performance','document-analysis.extraction','brain.service','data-doctor.service','reporting.service','document-analysis.service','action-operator.service','smart-import.service','worker-processor'];
    for (const name of required) {
      const suite = result.testResults.find(suite => String(suite.name).replace(/\\/g,'/').endsWith('/' + name + '.spec.ts'));
      if (!suite || suite.status !== 'passed' || !suite.assertionResults?.length || suite.assertionResults.some(test => test.status !== 'passed')) throw new Error('Required feature suite did not pass completely: ' + name);
    }
    const assertions = result.testResults.flatMap(suite => suite.assertionResults || []);
    for (const scenario of ['A','B','C','D','E','F']) {
      if (!assertions.some(test => test.status === 'passed' && test.fullName.includes('customer scenario ' + scenario + ' '))) throw new Error('Customer scenario pack is missing: ' + scenario);
    }
    if (assertions.filter(test => test.status === 'passed' && test.fullName.includes('security pack ')).length < 13) throw new Error('Security regression pack is incomplete.');
  }
}
function compare(baseline, current) {
  const allowedTests = counts(baseline.failures.map(failure => failure.identity + '\n' + failure.signature));
  const currentTests = counts(current.failures.map(failure => failure.identity + '\n' + failure.signature));
  const allowedTypes = counts(baseline.diagnostics), currentTypes = counts(current.diagnostics);
  const worsenedTests = [...currentTests].filter(([identity, count]) => count > (allowedTests.get(identity) || 0)).map(([identity]) => identity);
  const worsenedTypes = [...currentTypes].filter(([identity, count]) => count > (allowedTypes.get(identity) || 0)).map(([identity]) => identity);
  return { passed: !worsenedTests.length && !worsenedTypes.length, new_or_worsened_tests: worsenedTests, new_or_worsened_diagnostics: worsenedTypes, current_failures: current.failures.length, current_diagnostics: current.diagnostics.length };
}
function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const baseline = { failures: [{identity:'suite::test',signature:'expect failed'}],diagnostics:['src/example.ts(LOCATION): error TS1000: existing'] };
    assert.equal(compare(baseline, baseline).passed, true);
    assert.equal(compare(baseline, {failures:[],diagnostics:[]}).passed, true);
    assert.equal(compare(baseline, {...baseline,failures:[...baseline.failures,{identity:'suite::new',signature:'failed'}]}).passed, false);
    assert.equal(compare(baseline, {...baseline,failures:[{identity:'suite::test',signature:'TypeError'}]}).passed, false);
    assert.equal(compare(baseline, {...baseline,diagnostics:[...baseline.diagnostics,...baseline.diagnostics]}).passed, false);
    assert.equal(typesFrom(decode(Buffer.from('\ufeffsrc/example.ts(1,1): error TS1000: existing','utf16le'))).length,1);
    const result = {numTotalTestSuites:112,numTotalTests:1484,testResults:Array.from({length:112},()=>({name:'native',status:'passed',assertionResults:[{status:'passed'}]}))};
    assert.throws(()=>validateEvidence(result,''),/Required feature suite/);
    assert.throws(()=>validateEvidence({...result,testResults:[]},'',true),/Incomplete/);
    assert.throws(()=>validateEvidence(result,'FATAL ERROR',true),/Incomplete/);
    validateEvidence(result,'',true);
    console.log(JSON.stringify({self_tests:9,passed:true}));return;
  }
  const option = key => { const index=args.indexOf(key);if(index<0||!args[index+1])throw new Error('Missing '+key);return args[index+1]; };
  const testResult = JSON.parse(decode(fs.readFileSync(option('--tests'))));
  const typeLog = decode(fs.readFileSync(option('--types')));
  validateEvidence(testResult,typeLog,args.includes('--capture-baseline'));
  const current = {failures:testsFrom(testResult),diagnostics:typesFrom(typeLog)};
  if (args.includes('--capture-baseline')) {
    if (current.failures.length!==11||current.diagnostics.length!==233||testResult.numFailedTestSuites!==5) throw new Error('Baseline counts do not match the verified canonical debt. No register was changed.');
    const register={version:1,baseline_sha:originalSha,temporary:true,remediation_required:true,policy:'No new failure identities, changed failure kinds, diagnostic signatures, or increased occurrence counts.',test_suites:112,tests:1484,failures:current.failures,diagnostics:current.diagnostics};
    fs.mkdirSync(path.dirname(registerPath),{recursive:true});fs.writeFileSync(registerPath,JSON.stringify(register,null,2)+'\n');
    console.log(JSON.stringify({baseline_sha:originalSha,registered_failures:11,registered_diagnostics:233,temporary:true}));return;
  }
  const comparison=compare(JSON.parse(fs.readFileSync(registerPath,'utf8')),current);
  if (args.includes('--refresh-debt')) {
    assert(comparison.passed, 'Debt refresh must not exempt new or worsened diagnostics');
    assert.equal(current.failures.length, 0, 'All registered test failures must be fixed before debt refresh');
    const register = {version:2,baseline_sha:'467fb3be12b292fe63d7eddf2884571ec30965ea',remediation_release:'mizantra-ai-hardening-v1',temporary:true,remediation_required:current.diagnostics.length > 0,policy:'No new failure identities, changed failure kinds, diagnostic signatures, or increased occurrence counts.',test_suites:testResult.numTotalTestSuites,tests:testResult.numTotalTests,failures:[],diagnostics:current.diagnostics,known_limitations:['OCR fixture provider responses are mocked; production model accuracy remains document-dependent and uncertain facts require review.','Query timings cover instrumented Brain reads, not every native subsystem query.','Extraction operational rates are scoped since API start and reset on restart.','Saif Ask remains subject to the existing product entitlement gate.']};
    fs.writeFileSync(registerPath,JSON.stringify(register,null,2)+'\n');
  }
  console.log(JSON.stringify(comparison));if(!comparison.passed)process.exitCode=1;
}
module.exports={normalize,testsFrom,typesFrom,compare,validateEvidence};
if(require.main===module)main();