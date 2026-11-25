import { useEffect, useId, useRef, useState } from 'react';
import sharedStyles from '../styles/shared.module.css';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ title, children, onConfirm, onClose, pending = false }) {
  const ref = useRef(null);
  const id = useId();
  const [opener] = useState(() => document.activeElement);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);
  return (
    <dialog
      className={styles.dialog}
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(event) => {
        if (!pending && event.target === ref.current) onClose();
      }}
    >
      <div className={styles.dialogContent}>
        <p className={sharedStyles.eyebrow}>Подтверждение</p>
        <h2 id={id}>{title}</h2>
        <div>{children}</div>
        {pending && <p role="status">Удаление на сервере…</p>}
        <div className={styles.actions}>
          <button type="button" disabled={pending} autoFocus onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.danger} onClick={onConfirm} disabled={pending}>
            {pending ? 'Удаление…' : 'Удалить'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
