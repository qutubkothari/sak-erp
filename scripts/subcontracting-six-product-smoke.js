const BASE_URL = process.env.SUBCONTRACTING_SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.SUBCONTRACTING_SMOKE_USER || 'hnoman';
const PASSWORD = process.env.SUBCONTRACTING_SMOKE_PASSWORD || 'Password';
const api = async (method, path, token, body) => {
  const r = await fetch(`${BASE_URL}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = await r.text(); let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(data)}`); return data;
};
const list = (v) => Array.isArray(v) ? v : v?.data || [];
(async () => {
  const login = await api('POST', '/auth/login', null, { username: USERNAME, password: PASSWORD });
  const token = login.accessToken || login.data?.accessToken;
  const [itemsRaw, vendorsRaw, warehousesRaw] = await Promise.all([api('GET','/items?limit=200',token), api('GET','/purchase/vendors?isActive=true',token), api('GET','/inventory/warehouses',token)]);
  const items = list(itemsRaw), vendors = list(vendorsRaw), warehouses = list(warehousesRaw);
  const raw = items.find((i) => i.type === 'RAW_MATERIAL' && Number(i.available_quantity || i.current_stock || 0) >= 12 && i.is_active);
  const products = items.filter((i) => i.is_active && i.id !== raw?.id && (i.type === 'SUB_ASSEMBLY' || i.type === 'FINISHED_GOODS')).slice(0, 6);
  if (!raw || products.length < 6 || !vendors.length || !warehouses.length) throw new Error('Missing source stock, six products, vendor, or warehouse');
  const stamp = Date.now(), lengths = [25, 30, 40, 50, 60, 75];
  const steps = products.flatMap((p, i) => [
    { sequence_no: i + 1, node_key: `P${i+1}`, operation_name: `Cut ${lengths[i]}mm`, vendor_id: vendors[0].id, output_item_id: p.id, output_uom: 'MM', output_size: lengths[i], default_input_qty: 2, default_output_qty: 2 },
    { sequence_no: i + 7, node_key: `A${i+1}`, parent_node_key: `P${i+1}`, operation_name: `Anodizing ${lengths[i]}mm`, vendor_id: vendors[Math.min(1, vendors.length-1)].id, output_item_id: p.id, input_uom: 'PCS', input_size: lengths[i], output_uom: 'PCS', output_size: lengths[i], default_input_qty: 2, default_output_qty: 2 },
  ]);
  const route = await api('POST','/production/subcontracting/routes',token,{ route_number:`SIX-LEN-${stamp}`, name:'Six variable-length products smoke', input_item_id:raw.id, output_item_id:products[0].id, default_input_qty:12, default_output_qty:12, uom:'MTR', notes:`SMOKE ${stamp}`, steps });
  const wh = warehouses.find((w) => String(w.code).toUpperCase().includes('MAIN')) || warehouses[0];
  let order = await api('POST','/production/subcontracting/orders',token,{route_id:route.id,planned_input_qty:12,source_warehouse_id:wh.id,output_warehouse_id:wh.id,notes:`SMOKE ${stamp}`});
  for (const step of order.steps.filter((s) => s.sequence_no <= 6)) { await api('POST',`/production/subcontracting/orders/${order.id}/steps/${step.id}/issue`,token,{quantity:2}); await api('POST',`/production/subcontracting/orders/${order.id}/steps/${step.id}/receive`,token,{accepted_qty:2,consumed_qty:2,output_item_id:step.output_item_id}); }
  order = await api('GET',`/production/subcontracting/orders/${order.id}`,token);
  for (const step of order.steps.filter((s) => s.sequence_no > 6)) { await api('POST',`/production/subcontracting/orders/${order.id}/steps/${step.id}/issue`,token,{quantity:2}); await api('POST',`/production/subcontracting/orders/${order.id}/steps/${step.id}/receive`,token,{accepted_qty:2,consumed_qty:2,output_item_id:step.output_item_id}); }
  const final = await api('GET',`/production/subcontracting/orders/${order.id}`,token);
  if (final.status !== 'COMPLETED' || final.steps.filter((s) => s.status === 'COMPLETED').length !== 12) throw new Error(`Incomplete: ${final.status}`);
  console.log(JSON.stringify({ pass:true, environment:BASE_URL, route:route.route_number, order:final.order_number, products:lengths.map((length,i)=>({length,product:products[i].code})), completed_steps:final.steps.length, status:final.status }));
})().catch((e)=>{console.error(e.message);process.exit(1)});
