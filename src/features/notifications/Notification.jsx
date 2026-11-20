import { useDispatch, useSelector } from 'react-redux';
import { undo } from '../history/commands.js';
import { selectPending, selectUndo } from '../history/historySlice.js';
import { dismiss } from './uiSlice.js';
import styles from './Notification.module.css';

export function Notification() {
  const dispatch = useDispatch();
  const notice = useSelector((state) => state.ui.notice);
  const previous = useSelector(selectUndo);
  const pending = useSelector(selectPending);
  if (!notice) return null;
  return <div className={styles.notice}>
    <p role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}</p>
    {notice.undoId && notice.undoId === previous?.id && (
      <button type="button" disabled={pending} onClick={() => dispatch(undo(notice.undoId))}>Отменить</button>
    )}
    <button type="button" onClick={() => dispatch(dismiss())} aria-label="Закрыть уведомление">×</button>
  </div>;
}
