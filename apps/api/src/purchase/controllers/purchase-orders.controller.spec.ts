import { isFinalPurchaseOrderDocumentStatus } from './purchase-orders.controller';

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
