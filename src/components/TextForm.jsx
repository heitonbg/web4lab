import { useId, useRef, useState } from 'react';
import sharedStyles from '../styles/shared.module.css';
import styles from './TextForm.module.css';

export function TextForm({ label, onSubmit, initial = '', button = 'Добавить', placeholder = '', inputId, maxLength = 200, autoFocus = false, variant }) {
  const generated = useId();
  const id = inputId || generated;
  const input = useRef(null);
  const [text, setText] = useState(initial);
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!text.trim()) { setError('Введите текст, состоящий не только из пробелов.'); input.current.focus(); return; }
    onSubmit(text.trim());
    setText(''); setError(''); input.current?.focus();
  }
  return <form onSubmit={submit} className={styles.textForm} noValidate>
    <label htmlFor={id}>{label}</label>
    <div className={variant ? `${sharedStyles.inputRow} ${styles[variant]}` : sharedStyles.inputRow}><input ref={input} id={id} autoFocus={autoFocus} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} placeholder={placeholder} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} required /><button className={sharedStyles.primary} type="submit">{button}</button></div>
    {error && <p className={sharedStyles.error} role="alert" id={`${id}-error`}>{error}</p>}
  </form>;
}
