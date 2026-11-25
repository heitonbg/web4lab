const { existsSync } = require('node:fs');
const { join } = require('node:path');
const jsonServer = require('json-server');
const config = require('../json-server.json');
const chaos = require('./chaos.cjs');
const reset = require('./reset.cjs');

const file = process.env.TODO_DB_PATH ?? join(__dirname, '..', 'db.json');
if (!existsSync(file) && !process.env.TODO_DB_PATH) reset();

const server = jsonServer.create();
const router = jsonServer.router(file);
server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);
server.use((_req, _res, next) => setTimeout(next, Number(process.env.TODO_DELAY ?? config.delay)));
server.use(chaos);
server.use((_req, _res, next) => {
  router.db.read();
  next();
});

server.delete('/lists/:id', (req, res) => {
  const { id } = req.params;
  const db = router.db.getState();
  if (!db.lists.some((list) => list.id === id)) return res.sendStatus(404);
  router.db
    .setState({
      lists: db.lists.filter((list) => list.id !== id),
      tasks: db.tasks.filter((task) => task.listId !== id),
    })
    .write();
  res.jsonp({});
});

server.delete('/tasks/completed/:listId', (req, res) => {
  const { listId } = req.params;
  const { ids } = req.body ?? {};
  const db = router.db.getState();
  if (!db.lists.some((list) => list.id === listId)) return res.sendStatus(404);
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return res.sendStatus(400);
  const completed = db.tasks.filter(
    (task) => ids.includes(task.id) && task.listId === listId && task.done,
  );
  if (completed.length !== ids.length) return res.sendStatus(409);
  router.db
    .set(
      'tasks',
      db.tasks.filter((task) => !ids.includes(task.id)),
    )
    .write();
  res.jsonp({});
});

server.post('/tasks/completed/:listId', (req, res) => {
  const { listId } = req.params;
  const { tasks } = req.body ?? {};
  const db = router.db.getState();
  if (!db.lists.some((list) => list.id === listId)) return res.sendStatus(404);
  if (
    !Array.isArray(tasks) ||
    tasks.some((task) => !task?.id || task.listId !== listId || !task.done)
  )
    return res.sendStatus(400);
  const ids = new Set(tasks.map((task) => task.id));
  if (ids.size !== tasks.length || db.tasks.some((task) => ids.has(task.id)))
    return res.sendStatus(409);
  router.db.set('tasks', [...db.tasks, ...tasks]).write();
  res.status(201).jsonp(tasks);
});

server.use(router);
const port = Number(process.env.TODO_PORT ?? config.port);
server.listen(port, () => console.log(`REST API запущен на http://localhost:${port}`));
