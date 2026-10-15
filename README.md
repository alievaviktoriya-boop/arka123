# moyasreda

Статический сайт: HTML + CSS + JS, без сборки.

## Запуск локально

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Открыть http://localhost:8080. Остановить — `Ctrl+C`.

## Структура

```
index.html        главная страница
404.html          страница «не найдено»
css/style.css     стили (токены дизайна вверху файла)
js/main.js        скрипты
assets/img/       изображения
serve.ps1         локальный сервер
CLAUDE.md         инструкции для Claude Code
.claude/          настройки Claude Code: права, превью, навыки (/check-site)
```

## Публикация

Папку целиком можно выложить на любой статический хостинг
(GitHub Pages, Netlify, Cloudflare Pages, обычный хостинг по FTP).
