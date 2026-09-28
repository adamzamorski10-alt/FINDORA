export function createFormStateBuffer(initialState = {}) {
  const state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return { ...state };
  }

  function getValue(key) {
    return state[key];
  }

  function setValue(key, value) {
    state[key] = value;
    listeners.forEach((fn) => fn(state));
  }

  function setValues(values) {
    Object.assign(state, values);
    listeners.forEach((fn) => fn(state));
  }

  function reset(initialState) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, initialState || {});
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function destroy() {
    listeners.clear();
  }

  return { getState, getValue, setValue, setValues, reset, subscribe, destroy };
}
