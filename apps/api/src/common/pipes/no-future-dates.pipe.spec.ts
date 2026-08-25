import { BadRequestException } from '@nestjs/common';
import { NoFutureDatesPipe } from './no-future-dates.pipe';

describe('NoFutureDatesPipe', () => {
  const pipe = new NoFutureDatesPipe();

  it('allows a future quotation validity date', () => {
    const body = { quotation_date: '2026-08-16', valid_until: '2999-12-31' };
    expect(pipe.transform(body)).toBe(body);
  });

  it('allows the camel-case validity field used by external clients', () => {
    const body = { validUntil: '2999-12-31' };
    expect(pipe.transform(body)).toBe(body);
  });

  it('allows future contract and warranty validity boundaries', () => {
    const body = { start_date: '2999-01-01', end_date: '2999-12-31', warranty_until: '2999-12-31' };
    expect(pipe.transform(body)).toBe(body);
  });

  it('continues to reject future transaction and posting dates', () => {
    expect(() => pipe.transform({ invoice_date: '2999-12-31' }))
      .toThrow(BadRequestException);
  });
});
