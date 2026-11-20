import { api } from '../../api/api.js';
import { notify } from '../notifications/uiSlice.js';
import { listRemoved, pendingChanged, recorded, redone, selectPending, selectRedo, selectUndo, undone } from './historySlice.js';

function step(endpoint, arg) {
  return { endpoint, arg };
}

function command(listId, label, forward, backward, deletion = false) {
  return { id: crypto.randomUUID(), listId, label, forward, backward, deletion };
}

export function addTask(task) {
  const { id, listId } = task;
  return perform(command(listId, 'добавление задачи', step('addTask', { listId, task }), step('deleteTask', { listId, id })));
}

export function changeTask(task, changes, label) {
  const { id, listId } = task;
  const previous = Object.fromEntries(Object.keys(changes).map((key) => [key, task[key]]));
  if (Object.keys(changes).every((key) => changes[key] === previous[key])) return () => true;
  return perform(command(listId, label, step('updateTask', { listId, id, changes }),
    step('updateTask', { listId, id, changes: previous })));
}

export function deleteTask(task) {
  const { id, listId } = task;
  return perform(command(listId, 'удаление задачи', step('deleteTask', { listId, id }), step('addTask', { listId, task }), true));
}

export function clearTasks(listId, tasks) {
  return perform(command(listId, 'очистка выполненных задач',
    step('clearTasks', { listId, ids: tasks.map((task) => task.id) }), step('restoreTasks', { listId, tasks })));
}

export function renameList(list, title) {
  const listId = list.id;
  if (title === list.title) return () => true;
  return perform(command(listId, 'переименование списка', step('renameList', { listId, title }),
    step('renameList', { listId, title: list.title })));
}

function execute(dispatch, getState, request, onSuccess, errorMessage) {
  if (selectPending(getState())) return false;
  dispatch(pendingChanged(true));
  const mutation = dispatch(api.endpoints[request.endpoint].initiate(request.arg, { track: false }));
  return mutation.unwrap().then((data) => {
    onSuccess(data);
    return true;
  }, (error) => {
    const unavailable = ['FETCH_ERROR', 'TIMEOUT_ERROR'].includes(error.status);
    dispatch(notify({ kind: 'error', message: `${errorMessage}. ${unavailable ? 'Сервер недоступен.' : 'Попробуйте ещё раз.'}` }));
    return false;
  }).finally(async () => {
    // Повторные чтения могут заменить патч кеша более ранним снимком.
    await Promise.all(dispatch(api.util.getRunningQueriesThunk()));
    dispatch(pendingChanged(false));
  });
}

function announceDeletion(dispatch, entry) {
  if (entry.deletion) dispatch(notify({ kind: 'success', message: 'Задача удалена.', undoId: entry.id }));
}

function perform(entry) {
  return (dispatch, getState) => execute(dispatch, getState, entry.forward, () => {
    dispatch(recorded(entry));
    announceDeletion(dispatch, entry);
  }, `Не удалось выполнить действие «${entry.label}»`);
}

export const undo = (expectedId) => (dispatch, getState) => {
  const entry = selectUndo(getState());
  if (!entry || (expectedId && expectedId !== entry.id)) return false;
  return execute(dispatch, getState, entry.backward, () => {
    dispatch(undone());
    dispatch(notify({ kind: 'success', message: `Отменено: ${entry.label}.` }));
  }, `Не удалось отменить действие «${entry.label}»`);
};

export const redo = () => (dispatch, getState) => {
  const entry = selectRedo(getState());
  if (!entry) return false;
  return execute(dispatch, getState, entry.forward, () => {
    dispatch(redone());
    if (entry.deletion) announceDeletion(dispatch, entry);
    else dispatch(notify({ kind: 'success', message: `Повторено: ${entry.label}.` }));
  }, `Не удалось повторить действие «${entry.label}»`);
};

export const addList = (list) => (dispatch, getState) => execute(
  dispatch, getState, step('addList', list), () => {}, 'Не удалось создать список',
);

export const deleteList = (listId) => (dispatch, getState) => execute(
  dispatch, getState, step('deleteList', { listId }),
  () => dispatch(listRemoved(listId)), 'Не удалось удалить список',
);
