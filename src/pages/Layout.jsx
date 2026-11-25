import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useGetListsQuery } from '../api/api.js';
import { HistoryControls } from '../features/history/HistoryControls.jsx';
import { Notification } from '../features/notifications/Notification.jsx';
import { QueryStatus } from '../components/QueryStatus.jsx';
import { Sidebar } from '../components/Sidebar.jsx';
import { useTheme } from '../theme/context.js';
import styles from './Layout.module.css';

export function Layout() {
  const menuButtonRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const listsQuery = useGetListsQuery();
  useEffect(() => {
    const focusPage = () => {
      const target =
        (location.state?.focusId && document.getElementById(location.state.focusId)) ||
        document.querySelector('[data-page-title]');
      if (!target) return;
      target.focus();
      document.title = `${document.querySelector('[data-page-title]')?.textContent || 'Список дел'} — менеджер задач`;
      observer.disconnect();
    };
    const observer = new MutationObserver(focusPage);
    observer.observe(document.getElementById('main'), { childList: true, subtree: true });
    const frame = requestAnimationFrame(focusPage);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [location]);
  return (
    <div
      className={styles.appShell}
      onKeyDown={(event) => {
        if (menuOpen && event.key === 'Escape') {
          setMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <a className={styles.skipLink} href="#main">
        К содержимому
      </a>
      <header className={styles.topbar}>
        <Link className={styles.brand} to="/">
          <span className={styles.brandMark} aria-hidden="true">
            ✓
          </span>
          <span>
            Список дел<span className={styles.brandCaption}>МЕНЕДЖЕР ЗАДАЧ</span>
          </span>
        </Link>
        <div className={styles.topbarActions}>
          <button
            ref={menuButtonRef}
            className={styles.menuToggle}
            aria-controls="sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Закрыть меню' : 'Списки'}
          </button>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
            <span>{theme === 'dark' ? 'Светлая' : 'Тёмная'}</span>
          </button>
        </div>
      </header>
      <div className={styles.appBody}>
        <aside
          id="sidebar"
          className={menuOpen ? `${styles.sidebar} ${styles.isOpen}` : styles.sidebar}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setMenuOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
        >
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </aside>
        <main id="main" className={styles.main}>
          <HistoryControls />
          <Notification />
          <QueryStatus query={listsQuery} label="списки" />
          {listsQuery.currentData && <Outlet />}
        </main>
      </div>
      <footer className={styles.footer}>
        <span>Меньше шума. Больше сделанного.</span>
        <span>REACT / ЛАБОРАТОРНАЯ №04</span>
      </footer>
    </div>
  );
}
