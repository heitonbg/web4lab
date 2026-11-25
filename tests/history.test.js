import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { api } from '../src/api/api.js';
import { createStore } from '../src/app/store.js';
import {
  addList,
  addTask,
  changeTask,
  clearTasks,
  deleteList,
  deleteTask,
  redo,
  renameList,
  undo,
} from '../src/features/history/commands.js';
import { startServer } from './support/server.js';

const seed = JSON.parse(readFileSync(new URL('../server/db.seed.json', import.meta.url), 'utf8'));
const { id: listId } = seed.lists[0];
const initial = seed.tasks[0];
const added = {
  ...initial,
  id: 'another',
  title: 'Другая задача',
  createdAt: initial.createdAt + 1,
};

async function mount(log = []) {
  const readDone = (state) =>
    api.endpoints.getTasks
      .select(listId)(state)
      .data?.find((task) => task.id === initial.id)?.done;
  const store = createStore([
    ({ getState }) =>
      (next) =>
      (action) => {
        const before = getState();
        const result = next(action);
        const after = getState();
        if (typeof action.type === 'string' && !action.type.startsWith('api/executeQuery')) {
          log.push({
            action: action.type,
            endpoint: action.meta?.arg?.endpointName,
            done: [readDone(before), readDone(after)],
            history: [after.history.past.length, after.history.future.length],
          });
        }
        return result;
      },
  ]);
  const lists = store.dispatch(api.endpoints.getLists.initiate());
  const tasks = store.dispatch(api.endpoints.getTasks.initiate(listId));
  await Promise.all([lists.unwrap(), tasks.unwrap()]);
  log.length = 0;
  return {
    store,
    close() {
      lists.unsubscribe();
      tasks.unsubscribe();
      store.dispatch(api.util.resetApiState());
    },
  };
}

async function readServer(path) {
  const response = await fetch(`http://localhost:3001/${path}`);
  assert.ok(response.ok);
  return response.json();
}

test('REST: полный цикл команд, ветвление истории, счётчики и каскадное удаление', async (t) => {
  const server = await startServer({ port: 3001, data: seed });
  t.after(server.stop);
  const log = [];
  const { store, close } = await mount(log);
  t.after(close);
  const { dispatch, getState } = store;
  async function roundTrip(operation, check) {
    assert.equal(await dispatch(operation), true);
    await check(true);
    assert.equal(await dispatch(undo()), true);
    await check(false);
    assert.equal(await dispatch(redo()), true);
    await check(true);
  }

  await roundTrip(addTask(added), async (exists) => {
    const tasks = await readServer(`tasks?listId=${listId}`);
    assert.equal(
      tasks.some((task) => task.id === added.id),
      exists,
    );
  });
  const changes = { title: 'Обновлено', description: 'Описание', time: '09:30', done: true };
  await roundTrip(changeTask(initial, changes, 'редактирование задачи'), async (applied) => {
    const task = await readServer(`tasks/${initial.id}`);
    for (const key of Object.keys(changes))
      assert.equal(task[key], (applied ? changes : initial)[key]);
  });
  if (process.env.TODO_DEBUG_TRACE) {
    console.log(
      'Переходы истории:',
      log.filter(({ action }) =>
        ['history/recorded', 'history/undone', 'history/redone'].includes(action),
      ),
    );
  }
  let task = { ...initial, ...changes };
  for (const subtasks of [
    [...initial.subtasks, { id: 's2', title: 'Подготовка', done: false }],
    initial.subtasks.map((item) => ({ ...item, title: 'Новая дата' })),
    initial.subtasks.map((item) => ({ ...item, done: false })),
    [],
  ]) {
    const before = task.subtasks;
    await roundTrip(changeTask(task, { subtasks }, 'изменение подзадач'), async (applied) => {
      assert.deepEqual(
        (await readServer(`tasks/${task.id}`)).subtasks,
        applied ? subtasks : before,
      );
    });
    task = { ...task, subtasks };
  }
  await roundTrip(deleteTask(added), async (removed) => {
    assert.equal(
      (await readServer('tasks')).some((item) => item.id === added.id),
      !removed,
    );
  });
  assert.equal(getState().ui.notice.message, 'Задача удалена.');
  await roundTrip(clearTasks(listId, [task]), async (cleared) => {
    assert.equal(
      (await readServer('tasks')).some((item) => item.id === task.id),
      !cleared,
    );
  });
  await roundTrip(renameList(seed.lists[0], 'Планы'), async (renamed) => {
    assert.equal(
      (await readServer(`lists/${listId}`)).title,
      renamed ? 'Планы' : seed.lists[0].title,
    );
  });
  await dispatch(undo());
  await dispatch(renameList(seed.lists[0], 'Дела'));
  assert.equal(dispatch(redo()), false);
  assert.equal(await dispatch(addList({ id: 'work', title: 'Работа' })), true);
  await dispatch(addTask({ ...added, listId: 'work' }));
  await dispatch(deleteList('work'));
  assert.equal((await readServer('tasks?listId=work')).length, 0);
  assert.equal(
    getState().history.past.some((entry) => entry.listId === 'work'),
    false,
  );
  assert.equal((await readServer('lists?_embed=tasks'))[0].tasks.length, 0);
});

test('Задержка 1500 мс, реальный ответ 500, откат и сохранение команды при неудачной отмене', async (t) => {
  const normal = await startServer({ port: 3001, delay: 1500, data: seed });
  const successLog = [];
  const { store, close } = await mount(successLog);
  t.after(close);
  try {
    const operation = store.dispatch(changeTask(initial, { done: true }, 'отметка задачи'));
    assert.equal(api.endpoints.getTasks.select(listId)(store.getState()).data[0].done, true);
    assert.equal(api.endpoints.getLists.select()(store.getState()).data[0].tasks[0].done, true);
    assert.equal(store.getState().history.pending, true);
    assert.equal(store.dispatch(undo()), false);
    assert.equal(store.dispatch(changeTask(initial, { done: true }, 'повторное нажатие')), false);
    assert.equal(await operation, true);
    assert.equal((await readServer(`tasks/${initial.id}`)).done, true);
  } finally {
    await normal.stop();
  }

  const checked = { ...initial, done: true };
  const failing = await startServer({
    port: 3001,
    delay: 1500,
    chaos: 1,
    data: { ...seed, tasks: [checked] },
  });
  t.after(failing.stop);
  const failureLog = [];
  const failingStore = await mount(failureLog);
  t.after(failingStore.close);
  const failingAttempt = failingStore.store.dispatch(
    changeTask(checked, { done: false }, 'отметка задачи'),
  );
  assert.equal(
    api.endpoints.getTasks.select(listId)(failingStore.store.getState()).data[0].done,
    false,
  );
  assert.equal(await failingAttempt, false);
  assert.equal(
    api.endpoints.getTasks.select(listId)(failingStore.store.getState()).data[0].done,
    true,
  );
  assert.match(failingStore.store.getState().ui.notice.message, /Не удалось выполнить/);
  assert.equal(failingStore.store.getState().history.past.length, 0);
  const original = store.getState().history.past.at(-1);
  assert.equal(await store.dispatch(undo()), false);
  assert.equal(store.getState().history.past.at(-1), original);
  assert.match(store.getState().ui.notice.message, /Не удалось отменить/);
  assert.equal((await readServer(`tasks/${initial.id}`)).done, true);
  const dispatch = failingStore.store.dispatch;
  const readCache = () => api.endpoints.getTasks.select(listId)(failingStore.store.getState()).data;
  for (const [operation, assertOptimistic] of [
    [addTask(added), () => assert.equal(readCache().length, 2)],
    [
      changeTask(checked, { title: 'Пробная правка' }, 'редактирование задачи'),
      () => assert.equal(readCache()[0].title, 'Пробная правка'),
    ],
    [
      changeTask(checked, { subtasks: [] }, 'удаление подзадачи'),
      () => assert.equal(readCache()[0].subtasks.length, 0),
    ],
    [deleteTask(checked), () => assert.equal(readCache().length, 0)],
  ]) {
    const attempt = dispatch(operation);
    assertOptimistic();
    assert.equal(await attempt, false);
    assert.deepEqual(readCache(), [checked]);
  }
  assert.ok(successLog.some(({ action }) => action === 'api/executeMutation/fulfilled'));
  assert.ok(failureLog.some(({ action }) => action === 'api/executeMutation/rejected'));
  if (process.env.TODO_DEBUG_TRACE) {
    console.log(
      JSON.stringify(
        {
          successLog: successLog.slice(
            0,
            successLog.findIndex(({ action }) => action === 'history/recorded') + 2,
          ),
          failureLog: failureLog.slice(
            0,
            failureLog.findIndex(({ action }) => action === 'ui/notify') + 2,
          ),
        },
        null,
        2,
      ),
    );
  }
});
