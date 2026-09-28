import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFormStateBuffer } from '../../src/ui/utils/form-state.js';

describe('createFormStateBuffer', () => {
  it('returns initial state from constructor values', () => {
    const buffer = createFormStateBuffer({ name: 'Alice', age: '30' });
    assert.deepStrictEqual(buffer.getState(), { name: 'Alice', age: '30' });
  });

  it('defaults empty object to empty state', () => {
    const buffer = createFormStateBuffer({});
    assert.deepStrictEqual(buffer.getState(), {});
  });

  it('setValue updates a single field', () => {
    const buffer = createFormStateBuffer({ name: 'Alice' });
    buffer.setValue('name', 'Bob');
    assert.strictEqual(buffer.getState().name, 'Bob');
  });

  it('setValue does not mutate other fields', () => {
    const buffer = createFormStateBuffer({ name: 'Alice', age: '30' });
    buffer.setValue('age', '31');
    assert.strictEqual(buffer.getState().name, 'Alice');
    assert.strictEqual(buffer.getState().age, '31');
  });

  it('setValue handles new fields not present in initial state', () => {
    const buffer = createFormStateBuffer({ name: 'Alice' });
    buffer.setValue('email', 'alice@example.com');
    assert.strictEqual(buffer.getState().email, 'alice@example.com');
    assert.strictEqual(buffer.getState().name, 'Alice');
  });

  it('reset restores the provided defaults', () => {
    const buffer = createFormStateBuffer({ name: 'Alice', age: '30' });
    buffer.setValue('name', 'Bob');
    buffer.setValue('age', '31');
    buffer.reset({ name: '', age: '0' });
    assert.deepStrictEqual(buffer.getState(), { name: '', age: '0' });
  });

  it('reset without arguments clears to empty object', () => {
    const buffer = createFormStateBuffer({ name: 'Alice' });
    buffer.setValue('name', 'Bob');
    buffer.reset();
    assert.deepStrictEqual(buffer.getState(), {});
  });

  it('supports edit snapshot behavior: initialize then reset to clean defaults', () => {
    const buffer = createFormStateBuffer({
      editingId: 'tx-1',
      accountId: 'acc-1',
      amount: '100',
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Lunch',
      date: '2026-09-25',
      notes: 'Team lunch',
    });

    assert.strictEqual(buffer.getState().editingId, 'tx-1');
    assert.strictEqual(buffer.getState().description, 'Lunch');

    buffer.setValue('description', 'Dinner');
    assert.strictEqual(buffer.getState().description, 'Dinner');

    buffer.reset({
      accountId: '',
      amount: '',
      type: 'expense',
      categoryId: '',
      description: '',
      date: '2026-09-25',
      notes: '',
    });

    assert.strictEqual(buffer.getState().description, '');
    assert.strictEqual(buffer.getState().editingId, undefined);
    assert.strictEqual(buffer.getState().accountId, '');
  });

  it('cancel/reset pattern prevents stale data from persisting', () => {
    const defaults = { name: '', type: 'bank', icon: 'landmark', color: '#0000FF' };
    const buffer = createFormStateBuffer(defaults);

    buffer.setValue('name', 'Temp Name');
    buffer.setValue('color', '#FF0000');
    assert.strictEqual(buffer.getState().name, 'Temp Name');
    assert.strictEqual(buffer.getState().color, '#FF0000');

    buffer.reset(defaults);
    assert.strictEqual(buffer.getState().name, '');
    assert.strictEqual(buffer.getState().color, '#0000FF');
  });
});
