import { createSlice } from '@reduxjs/toolkit';

const ui = createSlice({
  name: 'ui',
  initialState: { notice: null },
  reducers: {
    notify(state, { payload }) { state.notice = payload; },
    dismiss(state) { state.notice = null; },
  },
});

export const { notify, dismiss } = ui.actions;
export default ui.reducer;
