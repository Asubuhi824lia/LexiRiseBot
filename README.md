# LexiRiseBot

Клиент на Vite + React и API на Express + SQLite.

## Требования

- Node.js 20+ (рекомендуется актуальный LTS)
- npm

## Первый запуск

1. Клонируйте репозиторий и перейдите в каталог проекта:

```bash
git clone git@github.com:Asubuhi824lia/LexiRiseBot.git
cd LexiRiseBot
```

Через HTTPS:

```bash
git clone https://github.com/Asubuhi824lia/LexiRiseBot.git
cd LexiRiseBot
```

2. Установите зависимости:

```bash
npm install
```

3. Настройте каталог базы данных — **один раз**, в интерактивном терминале:

```bash
npm run dev:server
```

Сервер спросит родительскую директорию. В ней будет создана папка `lexirisebot_DB` (имя из `package.json` + `_DB`), где хранятся файлы БД (`users.db` и др.).

Выбранный путь сохраняется в `server/db-location.json` — при следующих стартах вопрос не повторяется.

Если терминал неинтерактивный (нет TTY) или `npm run dev` через concurrently мешает вводу, задайте путь в **том же терминале**, откуда запускаете сервер — префиксом к команде или через `export` в текущей сессии shell (отдельный `.env` проект сам не подхватывает):

```bash
# в одной строке с командой запуска
DB_PARENT_DIR=/path/to/parent npm run dev:server

# или заранее в этой сессии терминала
export DB_PARENT_DIR=/path/to/parent
npm run dev:server

# вместо родителя можно указать сразу каталог данных
DATA_DIR=/path/to/lexirisebot_DB npm run dev:server
```

`DB_PARENT_DIR` — родительская директория (внутри создастся `lexirisebot_DB`). `DATA_DIR` — полный путь к каталогу данных.

4. Запустите клиент и API вместе:

```bash
npm run dev
```

| Сервис | URL |
|--------|-----|
| Клиент | http://localhost:5173 |
| API | http://127.0.0.1:3001 |

В логе API будет строка `DB …` с фактическим каталогом данных.

## Смена расположения БД

Текущий каталог смотрите в `server/db-location.json` (поле `dataDir`) или в логе `DB …` при старте API. Остановите сервер перед сменой пути.

Чтобы **перенести уже существующие данные**, скопируйте содержимое старого каталога (как минимум `users.db`, при наличии — `users.db-wal`, `users.db-shm`, `last-otp.json`) в новый, затем выберите один из вариантов ниже.

### Вариант A — снова спросить путь в терминале

1. Удалите сохранённый путь:

```bash
rm server/db-location.json
```

2. Запустите API в интерактивном терминале и укажите нового родителя:

```bash
npm run dev:server
```

Сервер создаст `<новый_родитель>/lexirisebot_DB` и запишет путь в `server/db-location.json`.

### Вариант B — прописать путь в `server/db-location.json`

1. Откройте `server/db-location.json` и укажите абсолютный путь к каталогу данных:

```json
{
  "dataDir": "/path/to/lexirisebot_DB"
}
```

2. Запустите сервер как обычно (`npm run dev` или `npm run dev:server`). Каталог будет создан, если его ещё нет.

### Вариант C — через переменные окружения в терминале запуска

Задайте путь в **том же терминале**, откуда стартуете сервер:

```bash
# новый родитель → внутри создастся / обновится запись на …/lexirisebot_DB
DB_PARENT_DIR=/path/to/new-parent npm run dev:server

# или сразу каталог данных (имеет приоритет; в db-location.json сам не записывается)
DATA_DIR=/path/to/lexirisebot_DB npm run dev:server
```

Чтобы после `DATA_DIR` путь сохранился на следующие запуски без env, один раз пропишите тот же каталог в `server/db-location.json` (вариант B) или используйте `DB_PARENT_DIR` (он обновляет файл).

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | API + клиент (watch) |
| `npm run dev:server` | только API |
| `npm run dev:client` | только Vite |
| `npm run start:server` | API без watch |
| `npm run build` | сборка клиента |
| `npm run preview` | превью собранного клиента |
| `npm run lint` | oxlint |

## Переменные окружения (опционально)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `3001` | порт API |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS origin клиента |
| `NODE_ENV` | — | `production` для prod-режима |
| `DB_PARENT_DIR` | — | родитель для `<name>_DB` |
| `DATA_DIR` | — | готовый каталог данных (имеет приоритет) |
| `OTP_PEPPER` | случайный при старте | pepper для хеша OTP; в prod лучше задать явно |

## Документация

- [Auth](docs/AUTH.md) — потоки входа и регистрации, компоненты, API, защиты, таблицы БД
- [Неявные приёмы](docs/IMPLICIT.md) — ошибки Query, связки клиента и сервера, составные компоненты antd
