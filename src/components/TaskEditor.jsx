import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeTask } from '../features/history/commands.js';
import { selectPending } from '../features/history/historySlice.js';
import sharedStyles from '../styles/shared.module.css';
import styles from './TaskEditor.module.css';

export function TaskEditor({ task }) {
  const dispatch = useDispatch();
  const pending = useSelector(selectPending);
  const [draft, setDraft] = useState(null);
  const base = JSON.stringify([task.title, task.description, task.time]);
  const { title, description, time } = draft?.base === base ? draft : task;
  function edit(changes) { setDraft({ base, title, description, time, ...changes }); }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const titleRef = useRef(null);
  function reset() { setDraft(null); setError(''); setMessage('Изменения отменены.'); }
  async function save(event) {
    event.preventDefault();
    if (!title.trim()) { setError('Название не может быть пустым.'); setMessage(''); titleRef.current.focus(); return; }
    if (pending) return;
    const saved = await dispatch(changeTask(task, { title: title.trim(), description: description.trim(), time }, 'редактирование задачи'));
    if (saved) { setDraft(null); setError(''); setMessage('Изменения сохранены.'); }
  }
  return <form key={task.id} onSubmit={save} noValidate onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); reset(); } }} onChange={() => setMessage('')}>
    <div className={sharedStyles.field}><label htmlFor="edit-task-title">Название задачи</label><input id="edit-task-title" ref={titleRef} value={title} onChange={(event) => { edit({ title: event.target.value }); setError(''); }} onBlur={() => { if (!title.trim()) setError('Название не может быть пустым. Изменения не сохранены.'); }} required maxLength={200} aria-invalid={Boolean(error)} aria-describedby={error ? 'edit-task-error' : undefined} />{error && <p id="edit-task-error" className={sharedStyles.error} role="alert">{error}</p>}</div>
    <div className={sharedStyles.field}><label htmlFor="edit-task-description">Описание</label><textarea id="edit-task-description" value={description} onChange={(event) => edit({ description: event.target.value })} maxLength={5000} placeholder="Детали, заметки, первый шаг…" /></div>
    <div className={sharedStyles.field}><label htmlFor="edit-task-time">Время</label><input id="edit-task-time" type="time" value={time} onChange={(event) => edit({ time: event.target.value })} /></div>
    <div className={styles.editorActions}><button className={sharedStyles.primary} type="submit" disabled={pending}>Сохранить</button><button type="button" onClick={reset}>Отменить ввод</button></div>
    <p className={`${styles.saveStatus} ${sharedStyles.muted}`} role="status">{message || 'Название, описание и время сохраняются кнопкой выше.'}</p>
  </form>;
}
