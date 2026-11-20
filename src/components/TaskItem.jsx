import { Link } from 'react-router';
import { useTodos } from '../state/context.js';
import sharedStyles from '../styles/shared.module.css';
import styles from './TaskItem.module.css';

export function TaskItem({ task, search, onDelete }) {
  const { dispatch } = useTodos();
  const completed = task.subtasks.filter((subtask) => subtask.done).length;
  return <li className={task.done ? `${styles.task} ${styles.isDone}` : styles.task}>
    <input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'task/toggled', id: task.id })} aria-label={`Выполнено: ${task.title}`} />
    <div className={styles.taskContent}><Link className={styles.taskTitle} id={`task-link-${task.id}`} to={`tasks/${task.id}${search}`} aria-label={`Открыть задачу: ${task.title}`}>{task.title}</Link>
      {task.description && <p className={styles.taskDescription}>{task.description}</p>}
      <div className={styles.taskMeta}>{task.time && <span>◷ {task.time}</span>}{task.subtasks.length > 0 && <span aria-label={`Подзадачи: выполнено ${completed} из ${task.subtasks.length}`}>↳ {completed}/{task.subtasks.length}</span>}</div>
    </div>
    <div className={sharedStyles.taskActions}><Link className={sharedStyles.iconButton} to={`tasks/${task.id}${search}`} aria-label={`Редактировать: ${task.title}`} title="Редактировать">✎</Link><button className={sharedStyles.iconButton} aria-label={`Удалить: ${task.title}`} title="Удалить" onClick={() => onDelete(task)}>×</button></div>
  </li>;
}
