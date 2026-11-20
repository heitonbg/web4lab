import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { changeTask } from '../features/history/commands.js';
import { selectPending } from '../features/history/historySlice.js';
import sharedStyles from '../styles/shared.module.css';
import styles from './TaskItem.module.css';

export function TaskItem({ task, search, onDelete }) {
  const dispatch = useDispatch();
  const pending = useSelector(selectPending);
  const completed = task.subtasks.filter((subtask) => subtask.done).length;
  return <li className={task.done ? `${styles.task} ${styles.isDone}` : styles.task}>
    <input type="checkbox" checked={task.done} aria-disabled={pending} onClick={(event) => { if (pending) event.preventDefault(); }} onChange={(event) => dispatch(changeTask(task, { done: event.target.checked }, 'отметка задачи'))} aria-label={`Выполнено: ${task.title}`} />
    <div className={styles.taskContent}><Link className={styles.taskTitle} id={`task-link-${task.id}`} to={`tasks/${task.id}${search}`} aria-label={`Открыть задачу: ${task.title}`}>{task.title}</Link>
      {task.description && <p className={styles.taskDescription}>{task.description}</p>}
      <div className={styles.taskMeta}>{task.time && <span>◷ {task.time}</span>}{task.subtasks.length > 0 && <span aria-label={`Подзадачи: выполнено ${completed} из ${task.subtasks.length}`}>↳ {completed}/{task.subtasks.length}</span>}</div>
    </div>
    <div className={sharedStyles.taskActions}><Link className={sharedStyles.iconButton} to={`tasks/${task.id}${search}`} aria-label={`Редактировать: ${task.title}`} title="Редактировать">✎</Link><button className={sharedStyles.iconButton} aria-label={`Удалить: ${task.title}`} title="Удалить" disabled={pending} onClick={() => onDelete(task)}>×</button></div>
  </li>;
}
