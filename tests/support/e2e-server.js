import { startServer } from './server.js';

const server = await startServer({ port: 3001, data: { lists: [], tasks: [] } });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
