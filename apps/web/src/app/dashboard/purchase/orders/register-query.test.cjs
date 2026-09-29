// Run with PO_SEARCH_TEST_TOOLS pointing to a tools directory containing
// react-test-renderer@18.3.1. No application dependency changes are required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tools = process.env.PO_SEARCH_TEST_TOOLS;
const React = require(tools ? path.join(tools, 'node_modules/react') : 'react');
const { act, create } = require(tools ? path.join(tools, 'node_modules/react-test-renderer') : 'react-test-renderer');
const src = path.resolve(__dirname, '../../../..');
let now = 0, timerId = 0;
const timers = new Map();
const clock = {
  setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
};
function advance(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } }
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URLSearchParams, ...clock,
    localStorage: { getItem: () => null, setItem() {} },
    document: { addEventListener() {}, removeEventListener() {} }, window: {},
    require(name) {
      if (name === 'react') return React;
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : () => null });
      if (name === '@/lib/utils') return { downloadCSV() {} };
      if (name === '@/lib/smart-search') return load(path.join(src, 'lib/smart-search.ts'));
      throw Error(`Unexpected import ${name}`);
    },
  }, { filename: file });
  return module.exports;
}
const { ListTable } = load(path.join(src, 'components/ui/ListTable.tsx'));
const { useDebouncedValue } = load(path.join(src, 'hooks/useDebouncedValue.ts'));
const { poRegisterQuery } = load(path.join(__dirname, 'register-query.ts'));
let passed = 0;
function check(value, name) { assert(value, name); passed++; console.log('PASS ' + name); }
let requests = [], mounts = 0, setSearch, setFilter;
const rows = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `PO-${i}` }));
function TableHarness() {
  const [search, changeSearch] = React.useState(''); setSearch = changeSearch;
  const [status, changeFilter] = React.useState('ALL'); setFilter = changeFilter;
  const debounced = useDebouncedValue(search, 350);
  const query = poRegisterQuery(status, 'supplier-1', debounced);
  React.useEffect(() => { requests.push(query); }, [query]);
  React.useEffect(() => { mounts++; }, []);
  return React.createElement(ListTable, { storageKey: 'test', rows, columns: [{ id: 'name', label: 'PO', accessor: r => r.name }], getRowId: r => r.id, defaultPageSize: 10, manualFiltering: true, resetPageKey: query, onSearchChange: changeSearch, searchPlaceholder: 'Search register' });
}
let renderer;
act(() => { renderer = create(React.createElement(TableHarness)); });
const input = () => renderer.root.findByProps({ placeholder: 'Search register' });
const button = name => renderer.root.findAllByType('button').find(b => b.children.join('') === name);
const text = () => JSON.stringify(renderer.toJSON());
act(() => button('Next').props.onClick());
check(text().includes('PO-10'), 'local pagination reaches second page');
act(() => input().props.onChange({ target: { value: 'M' } }));
act(() => { advance(100); input().props.onChange({ target: { value: 'Mac' } }); });
act(() => { advance(100); input().props.onChange({ target: { value: 'Macfos' } }); });
check(requests.length === 1, 'typing does not request once per keystroke');
check(button('First').props.disabled, 'search immediately resets pagination to page one');
act(() => advance(349));
check(requests.length === 1, 'debounce waits 350ms after the final edit');
act(() => advance(1));
check(requests.length === 2 && requests[1].includes('search=Macfos'), 'one settled search produces one server request');
check(input().props.value === 'Macfos' && mounts === 1, 'input remains visible and mounted while server results refresh');
check(text().includes('PO-0'), 'manual filtering preserves authoritative server results');
act(() => advance(5000));
check(requests.length === 2 && timers.size === 0, 'no timer/request loop after debounce settles');
act(() => button('Next').props.onClick());
act(() => setFilter('OPEN_PO'));
check(button('First').props.disabled && requests.length === 3, 'filter changes reset page one and issue one request');
check(requests[2] === poRegisterQuery('OPEN_PO', 'supplier-1', 'Macfos'), 'register and export share the exact active filter query');
act(() => input().props.onChange({ target: { value: 'cancelled' } }));
act(() => renderer.unmount());
act(() => advance(500));
check(timers.size === 0 && requests.length === 3, 'unmount cancels pending search');
console.log(`${passed} frontend behavioral assertions passed`);
