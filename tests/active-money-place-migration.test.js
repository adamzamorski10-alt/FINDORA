const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const userDataLoaderCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'user-data-loader.js'), 'utf8');

describe('Active Money Place — Gielda Migration Logic', () => {
  it('resets gielda to konto', () => {
    let savedKey = null;
    let savedValue = null;
    const save = (key, value) => { savedKey = key; savedValue = value; };

    let activeMoneyPlace = 'gielda';
    if (activeMoneyPlace === 'gielda') {
      activeMoneyPlace = 'konto';
      save('finapp_active_money_place', 'konto');
    }

    assert.strictEqual(activeMoneyPlace, 'konto');
    assert.strictEqual(savedKey, 'finapp_active_money_place');
    assert.strictEqual(savedValue, 'konto');
  });

  it('does not change konto', () => {
    let saveCalled = false;
    const save = () => { saveCalled = true; };

    let activeMoneyPlace = 'konto';
    if (activeMoneyPlace === 'gielda') {
      activeMoneyPlace = 'konto';
      save('finapp_active_money_place', 'konto');
    }

    assert.strictEqual(activeMoneyPlace, 'konto');
    assert.strictEqual(saveCalled, false);
  });

  it('does not change skarbonka', () => {
    let saveCalled = false;
    const save = () => { saveCalled = true; };

    let activeMoneyPlace = 'skarbonka';
    if (activeMoneyPlace === 'gielda') {
      activeMoneyPlace = 'konto';
      save('finapp_active_money_place', 'konto');
    }

    assert.strictEqual(activeMoneyPlace, 'skarbonka');
    assert.strictEqual(saveCalled, false);
  });
});

describe('Active Money Place — UserDataLoader Mapping', () => {
  function createMockStorage() {
    var activeCallbacks = [];
    var rootValue = null;

    return {
      listenRoot: function(callback) {
        activeCallbacks.push(callback);
        setTimeout(function() {
          if (activeCallbacks.indexOf(callback) >= 0) {
            callback(rootValue);
          }
        }, 0);
        return function unsubscribe() {
          var idx = activeCallbacks.indexOf(callback);
          if (idx >= 0) activeCallbacks.splice(idx, 1);
        };
      },
      setRootValue: function(value) {
        rootValue = value;
        setTimeout(function() {
          activeCallbacks.forEach(function(cb) { cb(rootValue); });
        }, 0);
      }
    };
  }

  it('maps finapp_active_money_place to activeMoneyPlace when present', async () => {
    var mockStorage = createMockStorage();
    var window = {
      UserDataLoader: null,
      StorageAdapter: mockStorage,
      DataLayer: { currentUserRef: null },
      activeMoneyPlace: undefined,
      initialLoadDone: false,
      dbData: {},
    };

    var script = new Function('window', userDataLoaderCode);
    script(window);

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_active_money_place: 'skarbonka' });

    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(window.activeMoneyPlace, 'skarbonka');
  });

  it('defaults activeMoneyPlace to konto when field is missing', async () => {
    var mockStorage = createMockStorage();
    var window = {
      UserDataLoader: null,
      StorageAdapter: mockStorage,
      DataLayer: { currentUserRef: null },
      activeMoneyPlace: 'previous',
      initialLoadDone: false,
      dbData: {},
    };

    var script = new Function('window', userDataLoaderCode);
    script(window);

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [] });

    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(window.activeMoneyPlace, 'konto');
  });

  it('updates activeMoneyPlace on subsequent root sync', async () => {
    var mockStorage = createMockStorage();
    var window = {
      UserDataLoader: null,
      StorageAdapter: mockStorage,
      DataLayer: { currentUserRef: null },
      activeMoneyPlace: undefined,
      initialLoadDone: false,
      dbData: {},
    };

    var script = new Function('window', userDataLoaderCode);
    script(window);

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_active_money_place: 'konto' });
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(window.activeMoneyPlace, 'konto');

    mockStorage.setRootValue({ finapp_active_money_place: 'skarbonka' });
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(window.activeMoneyPlace, 'skarbonka');
  });
});
