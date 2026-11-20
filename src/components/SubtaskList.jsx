import { useState } from 'react';
import { useTodos } from '../state/context.js';
import { TextForm } from './TextForm.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './SubtaskList.module.css';

function SubtaskItem({ subtask, taskId, onRemove }) {
  const { dispatch } = useTodos();
  const [editing, setEditing] = useState(false);
  const focusEdit = () => requestAnimationFrame(() => document.getElementById(`edit-subtask-${subtask.id}`)?.focus());
  return <li className={styles.subtask}>
    {editing ? <div className={styles.subtaskEditor} onKeyDown={(event) => { if (event.key === 'Escape') { setEditing(false); focusEdit(); } }}><TextForm variant="stacked" autoFocus label="Название подзадачи" initial={subtask.title} button="Сохранить" onSubmit={(title) => { dispatch({ type: 'subtask/updated', taskId, id: subtask.id, title }); setEditing(false); focusEdit(); }} /><button className={sharedStyles.textButton} onClick={() => { setEditing(false); focusEdit(); }}>Отмена</button></div> : <>
      <input id={`subtask-${subtask.id}`} type="checkbox" checked={subtask.done} onChange={() => dispatch({ type: 'subtask/toggled', taskId, id: subtask.id })} />
      <label className={subtask.done ? styles.subtaskDone : undefined} htmlFor={`subtask-${subtask.id}`}>{subtask.title}</label>
      <div className={sharedStyles.taskActions}><button id={`edit-subtask-${subtask.id}`} className={sharedStyles.iconButton} aria-label={`Редактировать подзадачу: ${subtask.title}`} onClick={() => setEditing(true)}>✎</button><button className={sharedStyles.iconButton} aria-label={`Удалить подзадачу: ${subtask.title}`} onClick={onRemove}>×</button></div>
    </>}
  </li>;
}

export function SubtaskList({ task }) {
  const { dispatch } = useTodos();
  const completed = task.subtasks.filter((item) => item.done).length;
  return <section className={styles.subtasks} aria-labelledby="subtasks-heading"><div className={styles.subtaskHeading}><h3 id="subtasks-heading">По шагам</h3><span className={sharedStyles.muted} role="status">Выполнено {completed} из {task.subtasks.length}</span></div>
    <progress max={task.subtasks.length || 1} value={completed} aria-label={`Прогресс подзадач: ${completed} из ${task.subtasks.length}`} />
    {!task.subtasks.length && <p className={`${sharedStyles.muted} ${styles.subtaskHint}`}>Разбейте задачу на небольшие шаги.</p>}
    <ul className={styles.subtaskList}>{task.subtasks.map((subtask, index) => <SubtaskItem key={subtask.id} subtask={subtask} taskId={task.id} onRemove={() => {
      const next = task.subtasks[index + 1] || task.subtasks[index - 1];
      dispatch({ type: 'subtask/removed', taskId: task.id, id: subtask.id });
      requestAnimationFrame(() => (document.getElementById(next ? `subtask-${next.id}` : 'new-subtask') || document.getElementById('new-subtask'))?.focus());
    }} />)}</ul>
    <TextForm inputId="new-subtask" label="Новая подзадача" placeholder="Следующий шаг…" button="+" onSubmit={(title) => dispatch({ type: 'subtask/added', taskId: task.id, subtask: { id: crypto.randomUUID(), title, done: false } })} />
  </section>;
}
