import { spawn } from 'node:child_process';
import { mkdtempSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

export async function startServer({ port, delay = 0, chaos = 0, data }) {
  const folder = mkdtempSync(join(tmpdir(), 'todo-lab4-'));
  const file = join(folder, 'db.json');
  writeFileSync(file, JSON.stringify(data));
  const child = spawn(process.execPath, ['server/start.cjs'], {
    env: {
      ...process.env,
      TODO_PORT: String(port),
      TODO_DELAY: String(delay),
      CHAOS_RATE: String(chaos),
      TODO_DB_PATH: file,
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const url = `http://localhost:${port}`;
  const exited = once(child, 'exit');
  const output = createInterface({ input: child.stdout });
  const ready = new Promise((resolve) => {
    output.on('line', (line) => {
      if (process.env.TODO_TEST_LOG) console.log(line);
      if (line === `REST API запущен на ${url}`) resolve();
    });
  });
  async function stop() {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
    rmSync(file, { force: true });
    rmdirSync(folder);
  }
  try {
    await Promise.race([
      ready,
      exited.then(([code]) => {
        throw new Error(`Сервер завершился с кодом ${code}`);
      }),
    ]);
    return { url, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
