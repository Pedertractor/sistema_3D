import { describe, expect, it } from 'vitest';
import { calculatePrintJob } from './print-math.js';

describe('calculatePrintJob', () => {
  it('arredonda o número de impressões para cima', () => {
    const job = calculatePrintJob(
      { gramsPerUnit: 10, printMinutesPerUnit: 15, unitsPerPrint: 4 },
      10,
    );
    expect(job.prints).toBe(3);
    expect(job.grams).toBe(100);
    expect(job.minutes).toBe(3 * 4 * 15);
  });
});
