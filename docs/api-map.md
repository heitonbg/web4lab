# Карта API Л4

| Точка | Запрос | Теги | Оптимистично | Обратный запрос |
|---|---|---|---|---|
| getLists | GET /lists?_embed=tasks | List | — | — |
| getTasks | GET /tasks?listId=:id&_sort=createdAt | Task по списку | — | — |
| addList | POST /lists | List | Нет | — |
| renameList | PATCH /lists/:id | List | Да | PATCH с прежним названием |
| deleteList | DELETE /lists/:id | List и Task по списку | Нет | — |
| addTask | POST /tasks | List и Task по списку | Да | DELETE |
| updateTask | PATCH /tasks/:id | List и Task по списку | Да | PATCH с прежними полями |
| deleteTask | DELETE /tasks/:id | List и Task по списку | Да | POST с исходным ID и подзадачами |
| clearTasks | DELETE /tasks/completed/:listId | List и Task по списку | Да | POST /tasks/completed/:listId с удалёнными задачами |

Отметка, правка, добавление, удаление и изменение подзадач, очистка выполненных и переименование списка входят в историю. Подзадачи отправляются полем `subtasks` в PATCH родительской задачи. Очистка и восстановление группы выполняются одной записью файла через учебный маршрут json-server.
