import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const taskTags = (listId) => ['List', { type: 'Task', id: listId }];
const afterTask = (_result, error, { listId }) => error ? [] : taskTags(listId);
const afterList = (_result, error) => error ? [] : ['List'];
const pathId = encodeURIComponent;

function mergeTasks(tasks, incoming, removed = []) {
  return [...tasks.filter((task) => !removed.includes(task.id) && !incoming.some((item) => item.id === task.id)),
    ...incoming].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

function optimisticTasks(transform) {
  return async (arg, { dispatch, queryFulfilled }) => {
    const { listId } = arg;
    const tasksPatch = dispatch(api.util.updateQueryData('getTasks', listId, (tasks) => transform(tasks, arg)));
    const listsPatch = dispatch(api.util.updateQueryData('getLists', undefined, (lists) => {
      const list = lists.find((item) => item.id === listId);
      if (list) list.tasks = transform(list.tasks ?? [], arg);
    }));
    try {
      await queryFulfilled;
    } catch {
      tasksPatch.undo();
      listsPatch.undo();
      dispatch(api.util.invalidateTags(taskTags(listId)));
    }
  };
}

async function patchLists(dispatch, queryFulfilled, update) {
  try {
    const { data } = await queryFulfilled;
    dispatch(api.util.updateQueryData('getLists', undefined, (lists) => update(lists, data)));
  } catch {
    // Ошибку сообщает санк, вызвавший мутацию.
  }
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env?.VITE_API_URL || 'http://localhost:3001',
    timeout: 10000,
  }),
  tagTypes: ['List', 'Task'],
  endpoints: (build) => ({
    getLists: build.query({
      query: () => ({ url: 'lists', params: { _embed: 'tasks' } }),
      providesTags: ['List'],
    }),
    getTasks: build.query({
      query: (listId) => ({ url: 'tasks', params: { listId, _sort: 'createdAt,id' } }),
      providesTags: (_result, _error, listId) => [{ type: 'Task', id: listId }],
    }),
    addList: build.mutation({
      query: (list) => ({ url: 'lists', method: 'POST', body: list }),
      invalidatesTags: afterList,
      onQueryStarted: (_list, { dispatch, queryFulfilled }) => patchLists(dispatch, queryFulfilled, (lists, list) => {
        if (!lists.some((item) => item.id === list.id)) lists.push({ ...list, tasks: [] });
      }),
    }),
    renameList: build.mutation({
      query: ({ listId, title }) => ({ url: `lists/${pathId(listId)}`, method: 'PATCH', body: { title } }),
      invalidatesTags: afterList,
      async onQueryStarted({ listId, title }, { dispatch, queryFulfilled }) {
        const patch = dispatch(api.util.updateQueryData('getLists', undefined, (lists) => {
          const list = lists.find((item) => item.id === listId);
          if (list) list.title = title;
        }));
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
          dispatch(api.util.invalidateTags(['List']));
        }
      },
    }),
    deleteList: build.mutation({
      query: ({ listId }) => ({ url: `lists/${pathId(listId)}`, method: 'DELETE' }),
      invalidatesTags: afterTask,
      onQueryStarted: ({ listId }, { dispatch, queryFulfilled }) => patchLists(
        dispatch, queryFulfilled, (lists) => lists.filter((list) => list.id !== listId),
      ),
    }),
    addTask: build.mutation({
      query: ({ task }) => ({ url: 'tasks', method: 'POST', body: task }),
      invalidatesTags: afterTask,
      onQueryStarted: optimisticTasks((tasks, { task }) => mergeTasks(tasks, [task])),
    }),
    updateTask: build.mutation({
      query: ({ id, changes }) => ({ url: `tasks/${pathId(id)}`, method: 'PATCH', body: changes }),
      invalidatesTags: afterTask,
      onQueryStarted: optimisticTasks((tasks, { id, changes }) => tasks.map(
        (task) => task.id === id ? { ...task, ...changes } : task,
      )),
    }),
    deleteTask: build.mutation({
      query: ({ id }) => ({ url: `tasks/${pathId(id)}`, method: 'DELETE' }),
      invalidatesTags: afterTask,
      onQueryStarted: optimisticTasks((tasks, { id }) => tasks.filter((task) => task.id !== id)),
    }),
    clearTasks: build.mutation({
      query: ({ listId, ids }) => ({ url: `tasks/completed/${pathId(listId)}`, method: 'DELETE', body: { ids } }),
      invalidatesTags: afterTask,
      onQueryStarted: optimisticTasks((tasks, { ids }) => mergeTasks(tasks, [], ids)),
    }),
    restoreTasks: build.mutation({
      query: ({ listId, tasks }) => ({ url: `tasks/completed/${pathId(listId)}`, method: 'POST', body: { tasks } }),
      invalidatesTags: afterTask,
      onQueryStarted: optimisticTasks((tasks, arg) => mergeTasks(tasks, arg.tasks)),
    }),
  }),
});

export const { useGetListsQuery, useGetTasksQuery } = api;
