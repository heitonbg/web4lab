import { createSlice } from '@reduxjs/toolkit';

const history = createSlice({
  name: 'history',
  initialState: { past: [], future: [], pending: false },
  reducers: {
    pendingChanged(state, { payload }) {
      state.pending = payload;
    },
    recorded(state, { payload }) {
      state.past.push(payload);
      if (state.past.length > 50) state.past.shift();
      state.future = [];
    },
    undone(state) {
      state.future.push(state.past.pop());
    },
    redone(state) {
      state.past.push(state.future.pop());
    },
    listRemoved(state, { payload }) {
      state.past = state.past.filter((command) => command.listId !== payload);
      state.future = state.future.filter((command) => command.listId !== payload);
    },
  },
});

export const { pendingChanged, recorded, undone, redone, listRemoved } = history.actions;
export const selectPending = (state) => state.history.pending;
export const selectUndo = (state) => state.history.past.at(-1);
export const selectRedo = (state) => state.history.future.at(-1);
export default history.reducer;
