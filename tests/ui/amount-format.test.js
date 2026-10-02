import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimalAmount } from '../../src/ui/utils/amount-format.js';

describe('parseDecimalAmount', () => {
  it('returns undefined for null', () => {
    assert.strictEqual(parseDecimalAmount(null), undefined);
  });

  it('returns undefined for empty string', () => {
    assert.strictEqual(parseDecimalAmount(''), undefined);
  });

  it('returns undefined for undefined', () => {
    assert.strictEqual(parseDecimalAmount(undefined), undefined);
  });

  it('returns undefined for NaN', () => {
    assert.strictEqual(parseDecimalAmount(NaN), undefined);
  });

  it('returns undefined for Infinity', () => {
    assert.strictEqual(parseDecimalAmount(Infinity), undefined);
  });

  it('returns undefined for -Infinity', () => {
    assert.strictEqual(parseDecimalAmount(-Infinity), undefined);
  });

  it('returns undefined for non-numeric string', () => {
    assert.strictEqual(parseDecimalAmount('abc'), undefined);
  });

  it('parses integer as-is', () => {
    assert.strictEqual(parseDecimalAmount('100'), 100);
  });

  it('parses integer number as-is', () => {
    assert.strictEqual(parseDecimalAmount(200), 200);
  });

  it('parses zero', () => {
    assert.strictEqual(parseDecimalAmount('0'), 0);
  });

  it('parses negative integer', () => {
    assert.strictEqual(parseDecimalAmount('-50'), -50);
  });

  it('accepts dot as decimal separator', () => {
    assert.strictEqual(parseDecimalAmount('214.93'), 214.93);
  });

  it('accepts comma as decimal separator', () => {
    assert.strictEqual(parseDecimalAmount('214,93'), 214.93);
  });

  it('accepts dot for negative decimal', () => {
    assert.strictEqual(parseDecimalAmount('-100.50'), -100.5);
  });

  it('accepts comma for negative decimal', () => {
    assert.strictEqual(parseDecimalAmount('-100,50'), -100.5);
  });

  it('rounds to 2 decimal places (round up)', () => {
    assert.strictEqual(parseDecimalAmount('214.935'), 214.94);
  });

  it('rounds to 2 decimal places (round down)', () => {
    assert.strictEqual(parseDecimalAmount('214.934'), 214.93);
  });

  it('rounds comma input to 2 decimal places', () => {
    assert.strictEqual(parseDecimalAmount('214,935'), 214.94);
  });

  it('returns zero for 0', () => {
    assert.strictEqual(parseDecimalAmount(0), 0);
  });

  it('returns zero for "0"', () => {
    assert.strictEqual(parseDecimalAmount('0'), 0);
  });

  it('returns zero for "-0"', () => {
    assert.strictEqual(parseDecimalAmount('-0'), -0);
  });

  it('returns undefined for empty whitespace string', () => {
    assert.strictEqual(parseDecimalAmount('   '), undefined);
  });

  it('returns undefined for multiple commas', () => {
    assert.strictEqual(parseDecimalAmount('214,93,45'), undefined);
  });
});
