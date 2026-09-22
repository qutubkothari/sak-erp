import {
  calculateStandardOutput,
  requiresSecondaryLength,
} from './subcontracting.service';

describe('calculateStandardOutput', () => {
  it.each([
    [1, 88, 88],
    [10, 88, 880],
    [2.5, 3.2, 8],
  ])('calculates %s input at %s output per input as %s', (input, factor, expected) => {
    expect(calculateStandardOutput(input, factor)).toBe(expected);
  });

  it.each([0, -1])('rejects non-positive conversion %s', (factor) => {
    expect(calculateStandardOutput(10, factor)).toBe(0);
  });

  it('keeps null-factor legacy planning at zero for manual output entry', () => {
    expect(calculateStandardOutput(10, Number.NaN)).toBe(0);
  });
});

describe('requiresSecondaryLength', () => {
  it('does not request metres for a piece-to-piece outside process', () => {
    expect(requiresSecondaryLength('input-item', 'NUMBER', [
      { output_item_id: 'output-item', output_uom: 'NUMBER' },
    ])).toBe(false);
  });

  it('requests metres when weight-based rod stock becomes counted products', () => {
    expect(requiresSecondaryLength('raw-rod', 'KG', [
      { output_item_id: 'finished-part', output_uom: 'NUMBER' },
    ])).toBe(true);
  });

  it('does not request a second quantity for a same-material process', () => {
    expect(requiresSecondaryLength('part', 'KG', [
      { output_item_id: 'part', output_uom: 'NUMBER' },
    ])).toBe(false);
  });

  it('does not request metres for weight-to-weight processing', () => {
    expect(requiresSecondaryLength('input-powder', 'KG', [
      { output_item_id: 'output-powder', output_uom: 'KG' },
    ])).toBe(false);
  });
});
