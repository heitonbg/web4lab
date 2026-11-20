import { Link } from 'react-router';
import sharedStyles from '../styles/shared.module.css';
import styles from './NotFoundPage.module.css';

export function NotFoundPage({ title = 'Страница не найдена', to = '/', link = 'На главную' }) {
  return <section className={styles.emptyState}><p className={sharedStyles.eyebrow}>404 / Здесь пусто</p><h1 data-page-title tabIndex={-1}>{title}</h1><p className={sharedStyles.muted}>Возможно, этот адрес устарел или запись уже удалена.</p><Link to={to}>{link} →</Link></section>;
}
