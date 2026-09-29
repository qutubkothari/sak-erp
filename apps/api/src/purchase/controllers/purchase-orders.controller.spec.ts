import { PurchaseOrdersController, isFinalPurchaseOrderDocumentStatus } from './purchase-orders.controller';

describe('purchase order PDF document status', () => {
  it.each(['APPROVED', 'approved', 'CLOSED', ' closed '])(
    'treats %s as a final commercial document',
    (status) => {
      expect(isFinalPurchaseOrderDocumentStatus(status)).toBe(true);
    },
  );

  it.each(['DRAFT', 'PENDING', 'REJECTED', 'CANCELLED', '', null])(
    'does not treat %s as a final commercial document',
    (status) => {
      expect(isFinalPurchaseOrderDocumentStatus(status)).toBe(false);
    },
  );
});


describe('PO register paging compatibility', () => {
  it('passes requested page and filters to the paged read service', async () => {
    const service:any={findPage:jest.fn().mockResolvedValue({rows:[{id:'late'}],total:19,page:2,pageSize:10})};
    const controller=new PurchaseOrdersController(service,null as any,null as any,null as any);
    const query={page:'2',pageSize:'10',search:'Macfos',status:'OPEN_PO'};
    expect(await controller.findAll({user:{tenantId:'t'}},query)).toMatchObject({total:19,page:2});
    expect(service.findPage).toHaveBeenCalledWith('t',query);
  });
  it('preserves the complete array for existing register callers', async () => {
    const service:any={findAll:jest.fn().mockResolvedValue([{id:'late'}])};
    const controller=new PurchaseOrdersController(service,null as any,null as any,null as any);
    expect(await controller.findAll({user:{tenantId:'t'}},{search:'PR-24'})).toEqual([{id:'late'}]);
  });
});
