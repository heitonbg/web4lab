import { useSelector } from 'react-redux';
import { selectPending } from '../features/history/historySlice.js';
import styles from '../styles/shared.module.css';

export function SubmitButton({ children }) {
  const pending = useSelector(selectPending);
  return (
    <button className={styles.primary} type="submit" disabled={pending}>
      {children}
    </button>
  );
}
