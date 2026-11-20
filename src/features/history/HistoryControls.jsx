import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { redo, undo } from './commands.js';
import { selectPending, selectRedo, selectUndo } from './historySlice.js';
import styles from './HistoryControls.module.css';

export function HistoryControls() {
  const dispatch = useDispatch();
  const pending = useSelector(selectPending);
  const previous = useSelector(selectUndo);
  const next = useSelector(selectRedo);
  useEffect(() => {
    function onKeyDown(event) {
      if (event.defaultPrevented || event.repeat || event.altKey || !(event.ctrlKey || event.metaKey) || event.code !== 'KeyZ') return;
      if (event.target.closest?.('input:not([type="checkbox"]):not([type="radio"]), textarea, select') || event.target.isContentEditable) return;
      event.preventDefault();
      dispatch(event.shiftKey ? redo() : undo());
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);
  return <div className={styles.controls} role="group" aria-label="История действий">
    <button type="button" disabled={pending || !previous} onClick={() => dispatch(undo())} aria-keyshortcuts="Control+Z">
      {previous ? `Отменить: ${previous.label}` : 'Отменить действие'}
    </button>
    <button type="button" disabled={pending || !next} onClick={() => dispatch(redo())} aria-keyshortcuts="Control+Shift+Z">
      {next ? `Повторить: ${next.label}` : 'Повторить действие'}
    </button>
    {pending && <span role="status">Сохранение на сервере…</span>}
  </div>;
}
