const fs = require('fs'), path = require('path');
const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) throw new Error('Refusing outside Mizantra test.');
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14), results = [];
function ok(value, message, detail) { if (!value) throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`); }
async function login() { const r = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'qa_roi_finance', password: 'Password' }) }); const data = await r.json(); ok(r.ok && data.accessToken, 'Test login failed', data); return data.accessToken; }
async function call(token, method, url, body) { const r = await fetch(`${BASE}/api/v1${url}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const text = await r.text(); let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; } ok(r.ok, `${method} ${url} returned ${r.status}`, data); results.push({ method, url, status: r.status, summary: Array.isArray(data) ? `${data.length} rows` : Object.keys(data || {}) }); return data; }
(async () => { try {
  const token = await login(); const stations = await call(token, 'GET', '/production/work-stations');
  const gatewayCode = `QA-OPCUA-${stamp.slice(-6)}`;
  await call(token, 'POST', '/production-device-gateways', { gateway_code: gatewayCode, gateway_name: 'QA simulated OPC-UA gateway', protocol: 'OPC_UA', status: 'TESTING', endpoint_reference: 'TEST-OPCUA://qa-cell', secret_reference: 'TEST-VAULT://qa-opcua', heartbeat_seconds: 60, is_test_mode: true });
  await call(token, 'POST', `/production-device-gateways/${gatewayCode}/heartbeat`, { event_received: true });
  const gateways = await call(token, 'GET', '/production-device-gateways'); ok(gateways.some(x => x.gateway_code === gatewayCode && x.health === 'HEALTHY'), 'Device gateway did not report healthy.', gateways);
  const station = stations.find(x => x.station_code === 'QA-IOT-01') || stations[0]; ok(station, 'No test work station available.');
  const assets = await call(token, 'GET', '/plant-maintenance/assets'); let asset = assets.find(x => x.asset_code === 'QA-AUTONOMY-01');
  if (!asset) asset = await call(token, 'POST', '/plant-maintenance/assets', { asset_code: 'QA-AUTONOMY-01', asset_name: 'QA Autonomous Assembly Cell', asset_type: 'ASSEMBLY', location_name: 'Test Plant', criticality: 'HIGH' });
  await call(token, 'POST', '/production-autonomy/station-assets', { work_station_id: station.id, asset_id: asset.id });
  const instruction = await call(token, 'POST', '/production-autonomy/instructions', { instruction_code: `QA-AUTO-${stamp.slice(-6)}`, title: 'QA controlled assembly instruction', work_station_id: station.id, first_piece_required: true, content: { language: 'en', steps: ['Scan material', 'Confirm first piece'] }, evidence_reference: `QA-INSTRUCTION-${stamp}` });
  await call(token, 'PATCH', `/production-autonomy/instructions/${instruction.id}/approve`, {});
  await call(token, 'POST', '/production-autonomy/mes-events', { work_station_id: station.id, event_type: 'MATERIAL_SCAN', barcode: `QA-MATERIAL-${stamp}`, quantity: 12, evidence: { test_only: true } });
  await call(token, 'POST', '/production-autonomy/energy-tariffs', { work_station_id: station.id, cost_per_kwh: 0.78, carbon_kg_per_kwh: 0.42 });
  await call(token, 'POST', '/manufacturing-telemetry/events', { work_station_id: station.id, source_event_id: `QA-ENERGY-${stamp}`, event_type: 'ENERGY', energy_kwh: 18.6, payload: { test_only: true, meter: 'QA simulated meter' } });
  await call(token, 'POST', '/production-autonomy/vision-inspections', { work_station_id: station.id, source_image_reference: `TEST-CAMERA://qa/${stamp}.jpg`, inspection_type: 'LABEL', verdict: 'FAIL', confidence_pct: 97.4, evidence: { test_only: true } });
  const exceptions = await call(token, 'POST', '/production-autonomy/exceptions/generate', {}); ok(exceptions.created >= 0, 'Exception generation did not return count.');
  const aps = await call(token, 'POST', '/production-autonomy/aps/run', {}); ok(Array.isArray(aps.proposals), 'APS did not return proposals.', aps);
  const predictive = await call(token, 'POST', '/production-autonomy/predictive-maintenance/dispatch', {}); ok(predictive.created >= 0, 'Predictive dispatch did not return count.', predictive);
  const [dashboard, cost, tower, workOrders] = await Promise.all([call(token, 'GET', '/production-autonomy/dashboard'), call(token, 'GET', '/production-autonomy/cost-intelligence'), call(token, 'GET', '/production-autonomy/control-tower'), call(token, 'GET', '/plant-maintenance/work-orders')]);
  ok(dashboard.kpis.approved_instructions >= 1, 'Digital instruction approval not visible.', dashboard);
  ok(tower.kpis.vision_inspections >= 1, 'Vision inspection not visible in tower.', tower);
  ok(Number(cost.totals.energy_cost) > 0 && Number(cost.totals.carbon_kg) > 0, 'Energy/carbon cost intelligence missing.', cost);
  ok(workOrders.some(x => x.work_type === 'PREVENTIVE' && String(x.description || '').includes('[Predictive maintenance]')), 'Predictive maintenance work order not created.', workOrders);
  const output = { passed: true, timestamp: new Date().toISOString(), gateway: gatewayCode, station: station.station_code, asset: asset.asset_code, exceptions_created: exceptions.created, aps_proposals: aps.proposals.length, predictive_work_orders_created: predictive.created, tower_kpis: tower.kpis, checks: results };
  const target = path.join(process.cwd(), 'artifacts', 'qa', `production-autonomy-${stamp}.json`); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(output, null, 2)); console.log(JSON.stringify(output, null, 2));
} catch (error) { console.error(error.stack || error); process.exitCode = 1; } })();
