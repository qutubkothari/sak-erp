import {
  calculateCuttingPlanningMetrics,
  calculateEquivalentSheetFraction,
  calculateRemnantArea,
  calculateStandardOutput,
  calculateTheoreticalYield,
  requiresSecondaryLength,
  validateRemnantDimensions,
} from './subcontracting.service';

describe('dimensional cutting planning', () => {
  const sheet = { length: 2400, width: 1200, thickness: 5 };
  const piece = { length: 267, width: 110, thickness: 5 };

  it('calculates the FRP sheet theoretical yield', () => {
    const result = calculateTheoreticalYield(sheet, piece, 0, 0, true);
    expect(result.orientation).toBe('B');
    expect(result.pieces).toBe(84);
  });

  it('uses rotation when it produces more pieces', () => {
    const result = calculateTheoreticalYield({ length: 300, width: 500 }, { length: 180, width: 100 }, 0, 0, true);
    expect(result.orientation).toBe('B');
  });

  it('accounts for kerf and edge allowance', () => {
    const base = calculateTheoreticalYield(sheet, piece, 0, 0, false);
    const constrained = calculateTheoreticalYield(sheet, piece, 5, 50, false);
    expect(constrained.pieces).toBeLessThan(base.pieces);
    expect(constrained.usableLength).toBe(2300);
  });

  it('calculates planning-only area metrics', () => {
    const yieldResult = calculateTheoreticalYield(sheet, piece);
    const metrics = calculateCuttingPlanningMetrics(sheet, piece, yieldResult);
    expect(metrics.sheetArea).toBe(2880000);
    expect(metrics.utilizationPercentage).toBeGreaterThan(0);
    expect(metrics.estimatedScrapPercentage).toBeGreaterThanOrEqual(0);
  });

  it('validates positive remnant dimensions without posting stock', () => {
    expect(validateRemnantDimensions({ length: 100, width: 50, quantity: 1 })).toBe(true);
    expect(() => validateRemnantDimensions({ length: 0, width: 50, quantity: 1 })).toThrow();
  });

  it('calculates remnant area and equivalent sheet fraction only for matching thickness', () => {
    expect(calculateRemnantArea(800, 350, 1)).toBe(280000);
    expect(calculateEquivalentSheetFraction(280000, 2400, 1200, 5, 5)).toBeCloseTo(280000 / 2880000);
    expect(calculateEquivalentSheetFraction(280000, 2400, 1200, 5, 4)).toBeNull();
  });
});

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
