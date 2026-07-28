# Публикация на GitHub Pages

Эта версия полностью статическая: PHP больше не нужен.

## 1. Загрузи содержимое папки `portfolio` в репозиторий

Для текущих настроек админки по умолчанию:

- GitHub owner: `m0ranje`
- repository: `m0ranje.io`
- branch: `main`
- папка сайта: корень репозитория

Если репозиторий называется иначе — это можно изменить прямо на странице `admin.html`.

## 2. Включи GitHub Pages

В репозитории:

**Settings → Pages → Build and deployment**

Выбери:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/ (root)**

После публикации сайт будет доступен примерно по адресу:

`https://m0ranje.github.io/m0ranje.io/`

## 3. Админ-панель

Открой:

`https://m0ranje.github.io/m0ranje.io/admin.html`

PHP-логина больше нет. Для записи используется GitHub API.

Создай **fine-grained Personal Access Token** и разреши ему доступ только к нужному репозиторию:

- Repository access: только репозиторий портфолио
- Repository permissions → **Contents: Read and write**

Токен вводится в `admin.html`.

**Токен не записывается в репозиторий и не хранится в localStorage.**
Он хранится в `sessionStorage`, то есть очищается после закрытия вкладки/сессии браузера.

## Что умеет GitHub-админка

- редактировать профиль;
- менять аватар;
- редактировать «Обо мне»;
- добавлять/удалять проекты;
- менять изображения карточек;
- включать/выключать скриншоты;
- загружать несколько скриншотов;
- вставлять скриншоты через **Ctrl+V**;
- сохранять `data/site.json`.

Изображения создаются отдельными коммитами в `assets/`, а контент — в `data/site.json`.

После коммита GitHub Pages должен опубликовать обновлённую версию сайта.

## Важно

Никогда не вставляй Personal Access Token в JavaScript-файлы, `github-config.js`,
README или другие файлы репозитория.
