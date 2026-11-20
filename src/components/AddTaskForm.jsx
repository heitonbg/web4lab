import { memo, useRef, useState } from 'react';
import { SubmitButton } from './SubmitButton.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './AddTaskForm.module.css';

export const AddTaskForm = memo(function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const input = useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) { setError('Введите название задачи.'); input.current.focus(); return; }
    input.current.focus();
    const saved = await onAdd({ title: title.trim(), description: description.trim(), time });
    if (saved) {
      setTitle((current) => current === title ? '' : current);
      setDescription((current) => current === description ? '' : current);
      setTime((current) => current === time ? '' : current);
    }
  }
  return <form className={styles.addTaskForm} onSubmit={submit} noValidate>
    <label className={sharedStyles.visuallyHidden} htmlFor="new-task">Новая задача</label>
    <div className={sharedStyles.inputRow}><input id="new-task" ref={input} placeholder="Что нужно сделать?" value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} maxLength={200} required aria-invalid={Boolean(error)} aria-describedby={error ? 'new-task-error' : undefined} /><SubmitButton><span aria-hidden="true">＋ </span>Добавить</SubmitButton></div>
    {error && <p className={sharedStyles.error} role="alert" id="new-task-error">{error}</p>}
    <details className={styles.taskOptions}><summary>Описание и время</summary><div className={sharedStyles.field}><label htmlFor="new-description">Описание</label><textarea id="new-description" value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} /></div><div className={sharedStyles.field}><label htmlFor="new-time">Время (необязательно)</label><input id="new-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></details>
  </form>;
});
