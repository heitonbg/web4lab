import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(
  readFileSync(new URL('../../server/db.seed.json', import.meta.url), 'utf8'),
);

const apiUrl = 'http://localhost:3001';
const saving = (page) => page.getByText('Сохранение на сервере…', { exact: true });
const settled = (page) => expect(saving(page)).toHaveCount(0);

test.beforeEach(async ({ request }) => {
  const response = await request.get(`${apiUrl}/lists`);
  for (const list of await response.json()) {
    expect((await request.delete(`${apiUrl}/lists/${list.id}`)).ok()).toBe(true);
  }
});

async function createList(page, title = 'Учёба') {
  await page.goto('/');
  await page.getByLabel('Как назовём список?').fill(title);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}
async function addTask(page, title) {
  await page.getByLabel('Новая задача', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Добавить', exact: true }).click();
  await settled(page);
}

test('Основной сценарий управляется клавиатурой, фокус остаётся видимым', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Как назовём список?').focus();
  await page.keyboard.type('Учёба');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Переименовать', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Новая задача', { exact: true })).toBeFocused();
  await page.keyboard.type('Первая задача');
  await page.keyboard.press('Enter');
  await settled(page);
  await page.getByRole('link', { name: 'Открыть задачу: Первая задача', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Первая задача', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Задача выполнена', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await settled(page);
  await expect(page.getByRole('checkbox', { name: 'Задача выполнена', exact: true })).toBeChecked();
  await page.getByLabel('Новая подзадача', { exact: true }).focus();
  await page.keyboard.type('Шаг');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Редактировать подзадачу: Шаг', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Редактировать подзадачу: Шаг', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Название подзадачи', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Редактировать подзадачу: Шаг', exact: true }),
  ).toBeFocused();
  const outline = await page
    .getByRole('button', { name: 'Редактировать подзадачу: Шаг', exact: true })
    .evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(parseFloat(outline)).toBeGreaterThan(0);
});

test('Задержка поиска составляет 300 мс после последнего ввода', async ({ page }) => {
  await createList(page);
  await addTask(page, 'Отчёт');
  await addTask(page, 'Книга');
  const start = new Date('2026-11-04T07:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.getByLabel('Поиск по названию в текущем списке').fill('От');
  await page.clock.runFor(200);
  await page.getByLabel('Поиск по названию в текущем списке').fill('Отч');
  await page.clock.runFor(299);
  expect(
    await page
      .getByRole('region', { name: /^Список / })
      .getByRole('listitem')
      .count(),
  ).toBe(2);
  await page.clock.runFor(1);
  await expect(page.getByRole('region', { name: /^Список / }).getByRole('listitem')).toHaveCount(1);
});

test('Контраст текста обеих тем и мобильная карточка', async ({ page }) => {
  await createList(page);
  await addTask(page, 'Подготовить лабораторную работу');
  await addTask(page, 'Повторить React и маршрутизацию');
  await addTask(page, 'Прочитать методичку');
  await page.getByLabel('Выполнено: Прочитать методичку', { exact: true }).check();
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const theme of ['light', 'dark']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== theme)
      await page.getByRole('button', { name: /Включить .* тему/ }).click();
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (hex) => {
        const values = hex
          .trim()
          .slice(1)
          .match(/.{2}/g)
          .map((part) => parseInt(part, 16) / 255)
          .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      const contrast = (a, b) => {
        const x = luminance(style.getPropertyValue(a));
        const y = luminance(style.getPropertyValue(b));
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      return ['--bg', '--surface', '--surface-alt'].flatMap((background) =>
        ['--text', '--muted', '--accent', '--error'].map((foreground) => ({
          foreground,
          background,
          ratio: contrast(foreground, background),
        })),
      );
    });
    for (const combination of ratios)
      expect(
        combination.ratio,
        `${theme}: ${combination.foreground} / ${combination.background}`,
      ).toBeGreaterThanOrEqual(4.5);
  }
  await page
    .getByRole('link', { name: 'Открыть задачу: Подготовить лабораторную работу', exact: true })
    .click();
  for (const title of ['Составить план', 'Написать код', 'Проверить результат']) {
    await page.getByLabel('Новая подзадача', { exact: true }).fill(title);
    await page
      .getByRole('region', { name: 'По шагам' })
      .getByRole('button', { name: '+', exact: true })
      .click();
  }
  await settled(page);
  await page.getByLabel('Составить план', { exact: true }).check();
  await expect(page.getByText('Выполнено 1 из 3', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(page.getByLabel('Название задачи', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Закрыть карточку', exact: true }).click();
  await page.getByRole('button', { name: 'Списки', exact: true }).click();
  await expect(page.locator('#sidebar')).toBeVisible();
});

test('Списки, изоляция задач, переименование, удаление с Escape и подтверждением', async ({
  page,
}) => {
  await createList(page);
  await addTask(page, 'Отчёт');
  const study = page.url();
  await page.getByLabel('Новый список', { exact: true }).fill('Работа');
  await page.locator('#sidebar').getByRole('button', { name: '+', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Работа', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Открыть задачу: Отчёт' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Переименовать', exact: true }).click();
  await page.getByLabel('Название списка', { exact: true }).fill('Проект');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Проект', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Списки задач', exact: true })
    .getByRole('link', { name: /^Учёба/ })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Учёба', exact: true })).toBeFocused();
  await page
    .getByRole('navigation', { name: 'Списки задач', exact: true })
    .getByRole('link', { name: /^Проект/ })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Проект', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Удалить список', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Удалить список', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Удалить список', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page).toHaveURL(study);
  await expect(page.getByRole('link', { name: 'Открыть задачу: Отчёт' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('Карточка, все операции с подзадачами, прогресс, фильтр и прямой адрес', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await createList(page);
  await addTask(page, 'Лабораторная');
  await page.getByRole('button', { name: 'Активные', exact: true }).click();
  await page.getByRole('link', { name: 'Открыть задачу: Лабораторная' }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Лабораторная', exact: true }),
  ).toBeFocused();
  await page.getByLabel('Новая подзадача', { exact: true }).fill('   ');
  await page
    .getByRole('region', { name: 'По шагам' })
    .getByRole('button', { name: '+', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Введите текст');
  for (const title of ['План', 'Код', 'Проверка']) {
    await page.getByLabel('Новая подзадача', { exact: true }).fill(title);
    await page
      .getByRole('region', { name: 'По шагам' })
      .getByRole('button', { name: '+', exact: true })
      .click();
  }
  await settled(page);
  await page.getByLabel('План', { exact: true }).check();
  await settled(page);
  await page.getByLabel('Код', { exact: true }).check();
  await expect(page.getByText('Выполнено 2 из 3', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Редактировать подзадачу: Проверка', exact: true })
    .click();
  await page.getByLabel('Название подзадачи', { exact: true }).fill('Тесты');
  await page
    .getByRole('region', { name: 'По шагам' })
    .getByRole('button', { name: 'Сохранить', exact: true })
    .click();
  await expect(page.getByLabel('Тесты', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Удалить подзадачу: Тесты', exact: true }).click();
  await expect(page.getByText('Выполнено 2 из 2', { exact: true })).toBeVisible();
  await page.getByLabel('Название задачи', { exact: true }).fill('');
  await page
    .getByRole('region', { name: 'Карточка задачи', exact: true })
    .getByLabel('Описание', { exact: true })
    .focus();
  await expect(page.getByRole('alert')).toContainText('Название не может быть пустым');
  await page.getByLabel('Название задачи', { exact: true }).fill('Лабораторная 3');
  await page
    .getByRole('region', { name: 'Карточка задачи', exact: true })
    .getByLabel('Описание', { exact: true })
    .fill('<b>Описание как текст</b>');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await settled(page);
  const direct = page.url();
  expect(direct).toContain('filter=active');
  await page.reload();
  await expect(page).toHaveURL(direct);
  await expect(page.getByLabel('Название задачи', { exact: true })).toHaveValue('Лабораторная 3');
  await expect(
    page
      .getByRole('region', { name: 'Карточка задачи', exact: true })
      .getByLabel('Описание', { exact: true }),
  ).toHaveValue('<b>Описание как текст</b>');
  await expect(page.getByText('Выполнено 2 из 2', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Закрыть карточку', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Открыть задачу: Лабораторная 3' })).toBeFocused();
  await expect(page.getByLabel('Подзадачи: выполнено 2 из 2')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Поиск с задержкой, фильтры, назад/вперёд и сброс поиска при смене списка', async ({
  page,
}) => {
  await createList(page);
  await addTask(page, 'Отчёт');
  await addTask(page, 'Купить книгу');
  await page.getByLabel('Выполнено: Купить книгу', { exact: true }).check();
  await page.getByRole('button', { name: 'Активные', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Открыть задачу: Купить книгу' })).toHaveCount(0);
  await page.getByLabel('Поиск по названию в текущем списке').fill('ОТЧ');
  await expect(page.getByRole('link', { name: 'Открыть задачу: Отчёт' })).toBeVisible();
  await page.getByLabel('Поиск по названию в текущем списке').fill('нет совпадений');
  await expect(page.getByRole('heading', { name: 'Ничего не нашлось' })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить поиск' }).click();
  await expect(page.getByRole('link', { name: 'Открыть задачу: Отчёт' })).toBeVisible();
  await page.getByRole('button', { name: 'Выполненные', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Открыть задачу: Купить книгу' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Активные', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Выполненные', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Поиск по названию в текущем списке').fill('текст');
  await page.getByLabel('Новый список', { exact: true }).fill('Другой');
  await page.locator('#sidebar').getByRole('button', { name: '+', exact: true }).click();
  await expect(page.getByLabel('Поиск по названию в текущем списке')).toHaveValue('');
});

test('Пустой ввод, безопасный текст, удаление и очистка с сохранением', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Как назовём список?').fill('   ');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Как назовём список?').fill('Дела');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await addTask(page, '   ');
  await expect(page.getByRole('alert')).toHaveText('Введите название задачи.');
  const title = '<img src=x onerror=alert(1)>';
  await addTask(page, title);
  await expect(
    page.getByRole('link', { name: `Открыть задачу: ${title}`, exact: true }),
  ).toHaveText(title);
  await expect(page.getByRole('region', { name: /^Список / }).locator('img')).toHaveCount(0);
  await addTask(page, 'Удалить');
  await page.getByRole('button', { name: 'Удалить: Удалить', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(
    page.getByRole('link', { name: `Открыть задачу: ${title}`, exact: true }),
  ).toBeFocused();
  await settled(page);
  await page.getByLabel(`Выполнено: ${title}`, { exact: true }).check();
  await page.getByRole('button', { name: 'Очистить выполненные' }).click();
  await settled(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Чистый лист', exact: true })).toBeVisible();
});

test('Тема определяется системой, сохраняется и применяется до React', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Включить светлую тему', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.route(/\/(?:src\/main\.jsx|assets\/.*\.js)(?:\?|$)/, (route) => route.abort());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#root')).toBeEmpty();
});

test('Удаление из карточки возвращает в список, удаление последнего списка — к началу', async ({
  page,
}) => {
  await createList(page);
  await addTask(page, 'Удаляемая задача');
  await page.getByRole('link', { name: 'Открыть задачу: Удаляемая задача', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить задачу', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByLabel('Новая задача', { exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Чистый лист', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Удалить список', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByLabel('Как назовём список?')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Как назовём список?')).toBeVisible();
});

test('Начальные серверные данные, старое локальное хранилище и страницы 404', async ({
  page,
  request,
}) => {
  expect((await request.post(`${apiUrl}/lists`, { data: seed.lists[0] })).ok()).toBe(true);
  expect((await request.post(`${apiUrl}/tasks`, { data: seed.tasks[0] })).ok()).toBe(true);
  await page.addInitScript(() => localStorage.setItem('todo-app:v2', 'invalid'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Входящие', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Открыть задачу: Купить билеты' })).toBeVisible();
  await page.goto('/lists/inbox/tasks/missing?filter=active');
  await expect(page.getByRole('heading', { name: 'Задача не найдена', exact: true })).toBeVisible();
  await page.goto('/lists/missing');
  await expect(page.getByRole('heading', { name: 'Список не найден', exact: true })).toBeVisible();
  await page.goto('/abc');
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена', exact: true }),
  ).toBeVisible();
});

test('Недоступность, повтор запроса, оптимистичная отметка, откат и история', async ({ page }) => {
  let offline = true;
  await page.route(`${apiUrl}/lists?**`, (route) => (offline ? route.abort() : route.continue()));
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Сервер недоступен.');
  offline = false;
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.getByLabel('Как назовём список?').fill('История');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await addTask(page, 'Проверка');
  const checkbox = page.getByRole('checkbox', { name: 'Выполнено: Проверка' });

  let releaseMutation;
  let releaseRequest;
  const pausedMutation = new Promise((resolve) => {
    releaseMutation = resolve;
  });
  const requestStarted = new Promise((resolve) => {
    releaseRequest = resolve;
  });
  await page.route(
    `${apiUrl}/tasks/*`,
    async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      releaseRequest();
      await pausedMutation;
      await route.fulfill({ status: 500, json: { error: 'Учебный сбой сервера' } });
    },
    { times: 1 },
  );
  await checkbox.check();
  await requestStarted;
  try {
    await expect(checkbox).toBeChecked();
    await expect(page.getByRole('button', { name: 'Отменить: добавление задачи' })).toBeDisabled();
    await page.keyboard.press('Control+z');
    await expect(checkbox).toBeChecked();
  } finally {
    releaseMutation();
  }
  await expect(page.getByRole('alert')).toContainText('Не удалось выполнить');
  await expect(checkbox).not.toBeChecked();
  await settled(page);

  await checkbox.check();
  await settled(page);
  const input = page.getByLabel('Новая задача', { exact: true });
  await input.pressSequentially('Текст');
  await input.press('Control+z');
  await expect(input).not.toHaveValue('Текст');
  await expect(checkbox).toBeChecked();
  await checkbox.focus();
  await page.keyboard.press('Control+z');
  await settled(page);
  await expect(checkbox).not.toBeChecked();
  await page.getByRole('heading', { name: 'История' }).focus();
  await page.keyboard.press('Control+Shift+z');
  await settled(page);
  await page.reload();
  await expect(checkbox).toBeChecked();
});

test('Отмена удаления из уведомления восстанавливает адрес и подзадачи', async ({
  page,
  request,
}) => {
  expect((await request.post(`${apiUrl}/lists`, { data: seed.lists[0] })).ok()).toBe(true);
  expect((await request.post(`${apiUrl}/tasks`, { data: seed.tasks[0] })).ok()).toBe(true);
  const path = '/lists/inbox/tasks/t1';
  await page.goto(path);
  await page.getByRole('button', { name: 'Удалить задачу' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByText('Задача удалена.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await settled(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Купить билеты' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Выбрать дату', exact: true })).toBeChecked();
});

for (const width of [360, 768, 1280]) {
  test(`Адаптив ${width}px: список и карточка без горизонтальной прокрутки`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await createList(page, 'Очень длинное название списка для проверки переноса');
    await addTask(page, 'Длинная задача ' + 'а'.repeat(100));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 360) {
      await page.getByRole('button', { name: 'Списки', exact: true }).click();
      await expect(page.locator('#sidebar')).toBeVisible();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
      await expect(page.locator('#sidebar')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Списки', exact: true })).toBeFocused();
    }
    await page.getByRole('link', { name: /^Открыть задачу:/ }).click();
    await expect(page.getByLabel('Название задачи', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
