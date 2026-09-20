import {
  operationQueuePosition,
  releasableUpstreamGood,
} from "./work-station.service";

describe("shop-floor operation queue", () => {
  it("makes the first operation available up to its remaining target", () => {
    expect(operationQueuePosition(100, 25, 30)).toEqual({
      target_remaining: 75,
      input_available: 75,
      ready: true,
    });
  });

  it("keeps the unproduced balance runnable on the same stage", () => {
    expect(operationQueuePosition(100, 40, 40)).toEqual({
      target_remaining: 60,
      input_available: 60,
      ready: true,
    });
  });

  it("limits a downstream operation to completed upstream WIP", () => {
    expect(operationQueuePosition(100, 20, 25, 40)).toEqual({
      target_remaining: 80,
      input_available: 15,
      ready: true,
    });
  });

  it("blocks a downstream operation when no upstream WIP remains", () => {
    expect(operationQueuePosition(100, 20, 40, 40)).toEqual({
      target_remaining: 80,
      input_available: 0,
      ready: false,
    });
  });

  it("releases a partial sequential batch to the next operation", () => {
    const upstream = releasableUpstreamGood("SEQUENTIAL", 40, 100);
    expect(operationQueuePosition(100, 0, 0, upstream)).toEqual({
      target_remaining: 100,
      input_available: 40,
      ready: true,
    });
  });

  it("honours an explicit overlapped transfer-batch threshold", () => {
    expect(releasableUpstreamGood("OVERLAPPED", 9, 10)).toBe(0);
    expect(releasableUpstreamGood("OVERLAPPED", 10, 10)).toBe(10);
  });
});
