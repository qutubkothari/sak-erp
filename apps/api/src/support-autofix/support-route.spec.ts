import { resolveSupportRoute } from './support-route';

const poComplaint = 'While trying to enter name in Search Bar of PO, there is some error, and unable to search.';

describe('AutoHeal support route resolution', () => {
  it('routes a Purchase Orders complaint to the canonical register', () => {
    expect(resolveSupportRoute({ title: poComplaint, description: poComplaint })).toEqual({
      module: 'Procurement / Purchase Orders',
      route: '/dashboard/purchase/orders',
    });
  });

  it('does not let the Active Planner route override a strongly identified module', () => {
    expect(resolveSupportRoute({ title: poComplaint, sourceRoute: '/dashboard/reports/executive/overview', currentRoute: '/dashboard/active-planner' })).toEqual({
      module: 'Procurement / Purchase Orders',
      route: '/dashboard/purchase/orders',
    });
  });

  it('rejects an unrelated stale route when the module is unknown', () => {
    expect(resolveSupportRoute({ title: 'Something is not working', sourceRoute: '/dashboard/reports/executive/overview', currentRoute: '/dashboard/active-planner' })).toEqual({
      module: null,
      route: null,
    });
  });

  it('uses an explicit valid source route when it agrees with the identified module', () => {
    expect(resolveSupportRoute({ title: poComplaint, sourceRoute: '/dashboard/purchase/orders/search' })).toEqual({
      module: 'Procurement / Purchase Orders',
      route: '/dashboard/purchase/orders/search',
    });
  });

  it('corrects a module/route mismatch to the module canonical route', () => {
    expect(resolveSupportRoute({ module: 'Procurement / Purchase Orders', sourceRoute: '/dashboard/hr/management', currentRoute: '/dashboard/active-planner' })).toEqual({
      module: 'Procurement / Purchase Orders',
      route: '/dashboard/purchase/orders',
    });
  });
});
