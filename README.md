# Portfolio — GitHub Pages edition (v12)

Статическая версия портфолио для GitHub Pages.

- PHP не требуется.
- `index.html` — главная.
- `project.html?id=...` — страницы проектов.
- `admin.html` — GitHub-админка.
- `data/site.json` — контент.
- `assets/` — изображения.
- `.nojekyll` — отключает обработку Jekyll.

Админ-панель записывает изменения прямо в репозиторий через GitHub REST API.
Токен пользователь вводит вручную; в исходный код токен не записывается.

Подробная инструкция: `DEPLOY_GITHUB.md`.
