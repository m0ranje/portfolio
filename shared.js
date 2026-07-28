const DEFAULT_DATA = {
  "profile": {
    "name": "Никита",
    "role": "Разработчик • IT-специалист",
    "location": "Россия / Russia",
    "domain": "portfolio.dev",
    "avatar": ""
  },
  "about": {
    "title": "Технический специалист, который умеет разбираться в задаче до результата.",
    "text": "https://github.com/m0ranje\nhttps://m0ranje.github.io/m0ranje.io/",
    "skills": [
      "AI / Codex",
      "Разработка ПО",
      "MySQL / phpMyAdmin",
      "Диагностика ПК",
      "1С — базово",
      "Обучаемость"
    ]
  },
  "projects": [
    {
      "id": "glazeui",
      "title": "GlazeUI — лаунчер для магнитол",
      "description": "Лаунчер для автомобильных магнитол с крупным touch-интерфейсом и стеклянным визуальным стилем.",
      "details": "GlazeUI — интерфейс лаунчера для автомобильных Android-магнитол. Главный экран собран вокруг крупных элементов, быстрых действий и удобного доступа к основным приложениям во время поездки. Визуальная часть построена на полупрозрачных панелях, объёмных иконках и мягких градиентах.",
      "favorite": true,
      "image": "assets/glazeui-card.png",
      "showScreenshots": true,
      "screenshots": [
        "assets/glazeui-card.png",
        "assets/glazeui-gallery-icons.jpg",
        "assets/glazeui-gallery-dock.jpg",
        "assets/glazeui-gallery-brand.jpg"
      ]
    },
    {
      "id": "netprint",
      "title": "NetPrint",
      "description": "Приложение для дистанционной печати на принтере в пределах одной локальной сети.",
      "details": "NetPrint — клиент для удалённой печати внутри локальной сети. Пользователь подключается к компьютеру-серверу по IP, порту и токену доступа, выбирает файл и отправляет его на принтер. Интерфейс также показывает состояние подключения, параметры печати, статус задания и журнал операций.",
      "favorite": true,
      "image": "assets/netprint.png",
      "showScreenshots": true,
      "screenshots": [
        "assets/netprint.png"
      ]
    },
    {
      "id": "amurkoop",
      "title": "Админпанель ООО «Амуркооп»",
      "description": "Админпанель для организации ООО «Амуркооп»: складской учёт, товары, движения, остатки и пользователи.",
      "details": "Веб-админпанель для внутренней работы ООО «Амуркооп». Система объединяет складской учёт, управление товарами, приход и расход, текущие остатки, пользователей и журнал операций. Интерфейс рассчитан на быстрое получение сводной информации и ежедневную работу сотрудников.",
      "favorite": true,
      "image": "assets/amurkoop.png",
      "showScreenshots": true,
      "screenshots": [
        "assets/amurkoop.png"
      ]
    },
    {
      "id": "neolink",
      "title": "NeoLink",
      "description": "Сервис для мгновенной отправки ссылок с телефона на телевизор через QR-код.",
      "details": "NeoLink позволяет быстро передать ссылку на телевизор без регистрации и ручного ввода длинного адреса. На экране ТВ открывается страница с QR-кодом, пользователь сканирует его телефоном и отправляет нужную ссылку — после этого она появляется на телевизоре.",
      "favorite": false,
      "image": "assets/neolink.png",
      "showScreenshots": true,
      "screenshots": [
        "assets/neolink.png"
      ]
    },
    {
      "id": "photoshop",
      "title": "Работы Photoshop",
      "description": "Подборка моих работ в Photoshop: оформление, типографика, мерч, баннеры и рекламные макеты.",
      "details": "Подборка графических работ, созданных в Photoshop: дизайн принтов для одежды, типографика, рекламные баннеры, композиции, обработка изображений и визуальные материалы для разных задач. Раздел показывает работу со стилем, композицией и оформлением. Ссылка - https://disk.yandex.ru/d/gidONSnDCqK9Fg",
      "favorite": true,
      "image": "assets/photoshop.png",
      "showScreenshots": false,
      "screenshots": [
        "assets/photoshop.png"
      ]
    },
    {
      "id": "courierpizza",
      "title": "КурьерПицца — приложение для курьеров",
      "description": "Мобильное приложение для курьеров пиццерии: заказы, маршруты, история доставок и профиль.",
      "details": "КурьерПицца — интерфейс мобильного приложения для сотрудников доставки. Курьер видит очередь и состояние заказов, выбирает доставку, получает адрес и информацию об оплате, переходит к маршруту, а также может открыть историю заказов и свой профиль.",
      "favorite": false,
      "image": "assets/1.png",
      "showScreenshots": true,
      "screenshots": [
        "assets/1.png"
      ]
    }
  ]
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadData() {
  try {
    const response = await fetch(`data/site.json?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data && data.profile && data.about && Array.isArray(data.projects)) {
      return data;
    }
  } catch (error) {
    console.warn("Не удалось загрузить data/site.json, использую встроенные данные.", error);
  }

  return deepClone(DEFAULT_DATA);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeAssetPath(value = "") {
  const path = String(value || "").trim();
  return /^assets\/[a-zA-Z0-9._/-]+$/.test(path) && !path.includes("..") ? path : "";
}

function safeProjectId(value = "") {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : "";
}
