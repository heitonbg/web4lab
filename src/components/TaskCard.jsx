import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { changeTask, deleteTask } from '../features/history/commands.js';
import { selectPending } from '../features/history/historySlice.js';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { TaskEditor } from './TaskEditor.jsx';
import { SubtaskList } from './SubtaskList.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './TaskCard.module.css';

export function TaskCard() {
  const { listId, taskId } = useParams();
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const pending = useSelector(selectPending);
  const tasks = useOutletContext();
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const task = tasks.find((item) => item.id === taskId && item.listId === listId);
  const to = `/lists/${listId}${params.size ? `?${params}` : ''}`;
  return <section className={styles.taskCard} aria-label="Карточка задачи">{task ? <>
    <div className={styles.cardTop}><span className={`${sharedStyles.eyebrow} ${styles.cardLabel}`}>Детали задачи</span><Link className={styles.cardClose} to={to} state={{ focusId: `task-link-${task.id}` }} aria-label="Закрыть карточку">← К списку</Link></div>
    <h2 data-page-title tabIndex={-1}>{task.title}</h2>
    <label className={styles.taskComplete}><input type="checkbox" checked={task.done} aria-disabled={pending} onClick={(event) => { if (pending) event.preventDefault(); }} onChange={(event) => dispatch(changeTask(task, { done: event.target.checked }, 'отметка задачи'))} />Задача выполнена</label>
    <TaskEditor key={task.id} task={task} />
    <SubtaskList task={task} />
    <div className={styles.cardBottom}><span className={sharedStyles.muted}>Создано {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(task.createdAt)}</span><button className={`${sharedStyles.textButton} ${styles.dangerText}`} disabled={pending} onClick={() => setDeleting(true)}>Удалить задачу</button></div>
    {deleting && <ConfirmDialog title="Удалить задачу?" onClose={() => setDeleting(false)} onConfirm={() => { dispatch(deleteTask(task)); setDeleting(false); navigate(to, { state: { focusId: 'new-task' } }); }}><p>Задача «{task.title}» и её подзадачи будут удалены. Действие можно отменить.</p></ConfirmDialog>}
  </> : <NotFoundPage title="Задача не найдена" to={to} link="К списку" />}</section>;
}
