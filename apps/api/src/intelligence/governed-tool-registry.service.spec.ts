import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GovernedToolRegistryService } from './governed-tool-registry.service';

describe('GovernedToolRegistryService security boundary', () => {
  const registry = new GovernedToolRegistryService();

  it('rejects an unregistered tool', () => expect(() => registry.require('DROP_DATABASE')).toThrow(BadRequestException));
  it('publishes only the explicit governed catalogue', () => {
    const catalogue = registry.catalogue();
    expect(catalogue).toHaveLength(13);
    expect(catalogue.map((tool) => tool.code)).toEqual(expect.arrayContaining([
      'CREATE_PURCHASE_ORDER_DRAFT',
      'APPLY_SALES_ORDER_HOLD',
      'CREATE_BANK_RECONCILIATION_REVIEW',
    ]));
  });
  it('rejects unknown payload fields', () => {
    const tool = registry.require('CREATE_REVIEW_TASK');
    expect(() => registry.validate(tool, { insight_id: 'i-1', arbitrary_sql: 'select *' })).toThrow('Unsupported action field');
  });
  it('rejects missing native-action inputs', () => {
    const tool = registry.require('CREATE_MAINTENANCE_WORK_ORDER');
    expect(() => registry.validate(tool, { insight_id: 'i-1' })).toThrow('Required action field');
  });
  it('rejects unbounded text', () => {
    const tool = registry.require('CREATE_QUALITY_NCR');
    expect(() => registry.validate(tool, { insight_id: 'i-1', description: 'x'.repeat(501), nonconformance_type: 'MATERIAL' })).toThrow('maximum length');
  });
  it('rejects malformed dates', () => {
    const tool = registry.require('CREATE_REVIEW_TASK');
    expect(() => registry.validate(tool, { insight_id: 'i-1', due_date: 'tomorrow' })).toThrow('YYYY-MM-DD');
  });
  it('denies a native tool without its permission', () => {
    expect(() => registry.authorize(registry.require('CREATE_PURCHASE_REQUISITION_DRAFT'), { id: 'u-1', permissions: [] })).toThrow(ForbiddenException);
  });
  it('allows the exact native permission', () => {
    expect(() => registry.authorize(registry.require('CREATE_PURCHASE_REQUISITION_DRAFT'), { id: 'u-1', permissions: ['purchase_requisitions:create'] })).not.toThrow();
  });
  it('allows an administrator but not a similarly named role', () => {
    const tool = registry.require('CREATE_QUALITY_NCR');
    expect(() => registry.authorize(tool, { id: 'u-1', role: 'ADMIN' })).not.toThrow();
    expect(() => registry.authorize(tool, { id: 'u-2', role: 'ADMIN_ASSISTANT' })).toThrow(ForbiddenException);
  });
});
