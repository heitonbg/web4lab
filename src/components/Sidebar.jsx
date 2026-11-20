import { NavLink, useNavigate } from 'react-router';
import { useTodos } from '../state/context.js';
import { TextForm } from './TextForm.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './Sidebar.module.css';

export function Sidebar({ onNavigate }) {
  const { state, dispatch } = useTodos();
  const navigate = useNavigate();
  return <>
    <div className={styles.sidebarHeading}><h2>Мои списки</h2><span className={styles.count}>{state.lists.length}</span></div>
    <nav aria-label="Списки задач"><ul className={styles.listNav}>{state.lists.map((list) => {
      const count = state.tasks.filter((task) => task.listId === list.id && !task.done).length;
      return <li key={list.id}><NavLink to={`/lists/${list.id}`} onClick={onNavigate}><span className={styles.listSymbol} aria-hidden="true">#</span><span className={styles.navTitle}>{list.title}</span><span className={styles.count} aria-label={`Активных задач: ${count}`}>{count}</span></NavLink></li>;
    })}</ul></nav>
    {!state.lists.length && <p className={`${sharedStyles.muted} ${styles.sidebarHint}`}>Пока нет списков.<br />Начнём с первого?</p>}
    <TextForm variant="compact" label="Новый список" placeholder="Например, Учёба" button="+" onSubmit={(title) => {
      const id = crypto.randomUUID();
      dispatch({ type: 'list/added', list: { id, title } });
      navigate(`/lists/${id}`); onNavigate();
    }} />
    <div className={styles.sidebarNote}><span aria-hidden="true">↳</span><p>Один список.<br />Один маленький шаг.<br />Больше порядка.</p></div>
  </>;
}
