import { memo, useCallback, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { addTask, clearTasks, deleteList, deleteTask, renameList } from '../features/history/commands.js';
import { selectPending } from '../features/history/historySlice.js';
import { useGetListsQuery, useGetTasksQuery } from '../api/api.js';
import { QueryStatus } from '../components/QueryStatus.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { AddTaskForm } from '../components/AddTaskForm.jsx';
import { TextForm } from '../components/TextForm.jsx';
import { TaskItem } from '../components/TaskItem.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './ListPage.module.css';

export function ListPage({ listId }) {
  const dispatch = useDispatch();
  const { list } = useGetListsQuery(undefined, {
    selectFromResult: ({ data }) => ({ list: data?.find((item) => item.id === listId) }),
  });
  const tasksQuery = useGetTasksQuery(listId, { skip: !list });
  const onAdd = useCallback((fields) => dispatch(addTask({
    id: crypto.randomUUID(), listId, ...fields, done: false, createdAt: Date.now(), subtasks: [],
  })), [dispatch, listId]);
  if (!list) return <NotFoundPage title="Список не найден" />;
  return <>
    <QueryStatus query={tasksQuery} label="задачи" />
    {tasksQuery.currentData && <ListContent listId={listId} title={list.title} tasks={tasksQuery.currentData} onAdd={onAdd} />}
  </>;
}

function ListContent({ listId, title, tasks, onAdd }) {
  const dispatch = useDispatch();
  const pending = useSelector(selectPending);
  const [params, setParams] = useSearchParams();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const renameButton = useRef(null);
  const toggleRename = useCallback(() => setRenaming((value) => !value), []);
  const confirmListDeletion = useCallback(() => setDeleting({ kind: 'list' }), []);
  const debounced = useDebounce(query);
  const filter = ['active', 'done'].includes(params.get('filter')) ? params.get('filter') : 'all';
  const active = tasks.filter((task) => !task.done).length;
  const filtered = tasks.filter((task) => (filter === 'all' || (filter === 'done' ? task.done : !task.done)) && task.title.toLocaleLowerCase('ru').includes(debounced.trim().toLocaleLowerCase('ru')));
  const search = params.size ? `?${params}` : '';
  function removeTask(task) {
    const index = filtered.findIndex((item) => item.id === task.id);
    const next = filtered[index + 1] || filtered[index - 1];
    const focusId = next && next.id !== task.id ? `task-link-${next.id}` : 'new-task';
    dispatch(deleteTask(task)); setDeleting(null);
    if (taskId === task.id) navigate(`/lists/${listId}${search}`, { state: { focusId } });
    else requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  }
  return <div className={taskId ? `${styles.listLayout} ${styles.hasCard}` : styles.listLayout}>
    <section className={styles.listPane} aria-label={`Список ${title}`}>
      <ListHeader title={title} count={tasks.length} hasCard={Boolean(taskId)} renaming={renaming}
        renameButton={renameButton} onRename={toggleRename} onDelete={confirmListDeletion} />
      {renaming && <div className={styles.renamePanel} id="rename-list"><TextForm autoFocus label="Название списка" initial={title} button="Сохранить" onSubmit={async (nextTitle) => {
        const saved = await dispatch(renameList({ id: listId, title }, nextTitle));
        if (saved) { setRenaming(false); requestAnimationFrame(() => renameButton.current?.focus()); }
        return saved;
      }} /><button className={sharedStyles.textButton} onClick={() => { setRenaming(false); requestAnimationFrame(() => renameButton.current?.focus()); }}>Отмена</button></div>}
      <AddTaskForm onAdd={onAdd} />
      <div className={styles.searchField}><label htmlFor="task-search" className={sharedStyles.visuallyHidden}>Поиск по названию в текущем списке</label><span aria-hidden="true">⌕</span><input id="task-search" type="search" placeholder="Найти в этом списке" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" /></div>
      <div className={styles.listToolbar}><div className={styles.filters} role="group" aria-label="Фильтр задач">{[['all', 'Все'], ['active', 'Активные'], ['done', 'Выполненные']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { const next = new URLSearchParams(params); next.set('filter', value); setParams(next); }}>{label}</button>)}</div><span className={`${sharedStyles.muted} ${styles.resultCount}`} role="status" aria-live="polite">Найдено: {filtered.length}</span></div>
      {filtered.length ? <ul className={styles.taskList}>{filtered.map((task) => <TaskItem key={task.id} task={task} search={search} onDelete={(item) => setDeleting({ kind: 'task', task: item })} />)}</ul> : <div className={styles.emptyState}><span className={styles.emptySymbol} aria-hidden="true">{debounced.trim() ? '⌕' : '✓'}</span><h2>{debounced.trim() ? 'Ничего не нашлось' : tasks.length ? 'Здесь пока пусто' : 'Чистый лист'}</h2><p className={sharedStyles.muted}>{debounced.trim() ? `Нет задач по запросу «${debounced}».` : tasks.length ? 'В выбранном фильтре нет задач.' : 'Добавьте первую задачу. Даже маленькую.'}</p>{query && <button onClick={() => setQuery('')}>Сбросить поиск</button>}</div>}
      <div className={styles.listBottom}><span className={sharedStyles.muted} role="status">Активных задач: <strong>{active}</strong></span><button className={sharedStyles.textButton} disabled={pending || active === tasks.length} onClick={() => { dispatch(clearTasks(listId, tasks.filter((task) => task.done))); if (tasks.some((task) => task.id === taskId && task.done)) navigate(`/lists/${listId}${search}`, { state: { focusId: 'new-task' } }); }}>Очистить выполненные</button></div>
    </section>
    <Outlet context={tasks} />
    {deleting && <ConfirmDialog title={deleting.kind === 'list' ? 'Удалить список?' : 'Удалить задачу?'} onClose={() => setDeleting(null)} pending={pending} onConfirm={async () => {
      if (deleting.kind === 'list') {
        const saved = await dispatch(deleteList(listId));
        setDeleting(null);
        if (saved) navigate('/');
      }
      else removeTask(deleting.task);
    }}><p>{deleting.kind === 'list' ? `Список «${title}» и все его задачи будут удалены.` : `Задача «${deleting.task.title}» и её подзадачи будут удалены.`}</p><p className={sharedStyles.muted}>{deleting.kind === 'list' ? 'Это действие нельзя отменить.' : 'Действие можно отменить.'}</p></ConfirmDialog>}
  </div>;
}

const ListHeader = memo(function ListHeader({ title, count, hasCard, renaming, renameButton, onRename, onDelete }) {
  return <header className={styles.pageHeader}>
    <p className={sharedStyles.eyebrow}>Ваш фокус на сегодня</p>
    <div className={styles.titleRow}>
      <h1 tabIndex={-1} data-page-title={hasCard ? undefined : true}>{title}</h1>
      <span className={styles.listNumber}>{String(count).padStart(2, '0')}</span>
    </div>
    <ListActions renaming={renaming} renameButton={renameButton} onRename={onRename} onDelete={onDelete} />
  </header>;
});

function ListActions({ renaming, renameButton, onRename, onDelete }) {
  const pending = useSelector(selectPending);
  return <div className={styles.listTools}>
    <button ref={renameButton} disabled={pending} onClick={onRename} aria-expanded={renaming} aria-controls="rename-list">Переименовать</button>
    <button disabled={pending} onClick={onDelete}>Удалить список</button>
  </div>;
}
