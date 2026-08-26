const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD;

if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) throw new Error('Refusing to run outside the Mizantra test environment.');
if (!PASSWORD) throw new Error('QA_PASSWORD is required.');
const assert = (value, message, detail) => { if (!value) throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`); };
async function request(method, path, token, body, expected = [200, 201]) {
  const response = await fetch(`${BASE}/api/v1${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  assert(expected.includes(response.status), `${method} ${path} returned ${response.status}`, data); return data;
}
(async () => {
  const login = await request('POST', '/auth/login', null, { username: USERNAME, password: PASSWORD });
  const token = login.accessToken; assert(token, 'Login did not return an access token.');
  const before = await request('GET', '/intelligence/health-configuration', token);
  assert(before.factor_caps && Object.keys(before.factor_caps).length === 9, 'Expected nine Factory Health factor caps.', before);
  const configuration = await request('PATCH', '/intelligence/health-configuration', token, {
    factor_caps: { ...before.factor_caps, approvals: 16, stock_risk: 22, receipt_qc: 15, master_data: 11, critical_exceptions: 28, production_risk: 12, quality_risk: 12, maintenance_risk: 10, cash_risk: 10 },
    management_attention_threshold: 68, critical_threshold: 42, historical_observations_required: 14,
  });
  assert(configuration.configured === true, 'Factory Health configuration was not persisted.', configuration);
  assert(Number(configuration.factor_caps.approvals) === 16 && Number(configuration.historical_observations_required) === 14, 'Saved Factory Health values are incorrect.', configuration);
  const center = await request('GET', '/intelligence/command-center', token);
  assert(center.operating_health?.configuration?.configured === true, 'Command Center does not expose the tenant Factory Health configuration.', center.operating_health);
  assert(Number(center.operating_health.configuration.factor_caps.approvals) === 16, 'Command Center did not apply the configured score cap.', center.operating_health.configuration);
  const history = await request('GET', '/intelligence/health-history?days=90', token);
  const forecast = await request('GET', '/intelligence/health-forecast?days=14', token);
  assert(Array.isArray(history.history), 'Health history response is invalid.', history);
  assert(typeof forecast.sufficient_data === 'boolean' && Number(forecast.observations_required) === 14, 'Forecast does not use the tenant calibration threshold.', forecast);
  console.log(JSON.stringify({ result: 'PASS', configured_factor_caps: Object.keys(configuration.factor_caps).length, history_observations: history.history.length, forecast_sufficient_data: forecast.sufficient_data, observations_required: forecast.observations_required, execution_scope: 'MIZANTRA_TEST_ONLY' }, null, 2));
})().catch((error) => { console.error(error.stack || error.message || error); process.exit(1); });
