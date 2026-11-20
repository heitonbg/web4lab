import { NavLink, useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { addList } from '../features/history/commands.js';
import { useGetListsQuery } from '../api/api.js';
import { TextForm } from './TextForm.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './Sidebar.module.css';

export function Sidebar({ onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: lists } = useGetListsQuery();
  if (!lists) return <h2>Мои списки</h2>;
  return <>
    <div className={styles.sidebarHeading}><h2>Мои списки</h2><span className={styles.count}>{lists.length}</span></div>
    <nav aria-label="Списки задач"><ul className={styles.listNav}>{lists.map((list) => {
      const count = list.tasks?.filter((task) => !task.done).length ?? 0;
      return <li key={list.id}><NavLink to={`/lists/${list.id}`} onClick={onNavigate}><span className={styles.listSymbol} aria-hidden="true">#</span><span className={styles.navTitle}>{list.title}</span><span className={styles.count} aria-label={`Активных задач: ${count}`}>{count}</span></NavLink></li>;
    })}</ul></nav>
    {!lists.length && <p className={`${sharedStyles.muted} ${styles.sidebarHint}`}>Пока нет списков.<br />Начнём с первого?</p>}
    <TextForm variant="compact" label="Новый список" placeholder="Например, Учёба" button="+" onSubmit={async (title) => {
      const id = crypto.randomUUID();
      const saved = await dispatch(addList({ id, title, createdAt: Date.now() }));
      if (saved) { navigate(`/lists/${id}`); onNavigate(); }
      return saved;
    }} />
    <div className={styles.sidebarNote}><span aria-hidden="true">↳</span><p>Один список.<br />Один маленький шаг.<br />Больше порядка.</p></div>
  </>;
}
