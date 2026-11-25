import { useSelector } from 'react-redux';
import { selectPending } from '../features/history/historySlice.js';
import styles from './QueryStatus.module.css';

export function QueryStatus({ query, label }) {
  const pending = useSelector(selectPending);
  if (query.isError) {
    const unavailable = ['FETCH_ERROR', 'TIMEOUT_ERROR'].includes(query.error.status);
    return (
      <div className={styles.status}>
        <p role="alert">{unavailable ? 'Сервер недоступен.' : `Не удалось загрузить ${label}.`}</p>
        <button
          type="button"
          disabled={query.isFetching || pending}
          onClick={() => query.refetch()}
        >
          Повторить
        </button>
      </div>
    );
  }
  if (query.isFetching && !query.currentData) {
    return (
      <div className={styles.status} role="status">
        <p>Загрузка: {label}…</p>
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }
  if (query.isFetching)
    return (
      <p className={styles.updating} role="status">
        Обновление: {label}…
      </p>
    );
  return null;
}
