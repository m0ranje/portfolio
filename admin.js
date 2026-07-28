let cmsData = deepClone(DEFAULT_DATA);
let activeSection = "profile";
let selectedProjectIndex = 0;
let github = null;

const pendingPreviewUrls = new Map();

const connectView = document.getElementById("connectView");
const cmsView = document.getElementById("cmsView");
const connectForm = document.getElementById("connectForm");
const connectError = document.getElementById("connectError");

const githubOwner = document.getElementById("githubOwner");
const githubRepo = document.getElementById("githubRepo");
const githubBranch = document.getElementById("githubBranch");
const githubDirectory = document.getElementById("githubDirectory");
const githubToken = document.getElementById("githubToken");

const repoBadge = document.getElementById("repoBadge");
const branchBadge = document.getElementById("branchBadge");
const disconnectBtn = document.getElementById("disconnectBtn");

const navItems = [...document.querySelectorAll(".cms-nav-item")];
const sections = [...document.querySelectorAll(".cms-section")];
const projectNavWrap = document.getElementById("projectNavWrap");
const projectNavList = document.getElementById("projectNavList");
const projectEditor = document.getElementById("projectEditor");

const sectionEyebrow = document.getElementById("sectionEyebrow");
const sectionTitle = document.getElementById("sectionTitle");
const sectionDescription = document.getElementById("sectionDescription");

const profileNameInput = document.getElementById("profileNameInput");
const profileRoleInput = document.getElementById("profileRoleInput");
const profileLocationInput = document.getElementById("profileLocationInput");
const profileDomainInput = document.getElementById("profileDomainInput");
const avatarPreview = document.getElementById("avatarPreview");
const avatarInput = document.getElementById("avatarInput");
const avatarPath = document.getElementById("avatarPath");

const aboutTitleInput = document.getElementById("aboutTitleInput");
const aboutTextInput = document.getElementById("aboutTextInput");
const aboutSkillsInput = document.getElementById("aboutSkillsInput");

const addProjectBtn = document.getElementById("addProjectBtn");
const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");

const SECTION_COPY = {
  profile: {
    eyebrow: "ОСНОВНОЕ",
    title: "Профиль",
    description: "Имя, должность, локация и аватар."
  },
  about: {
    eyebrow: "ТЕКСТ",
    title: "Обо мне",
    description: "Заголовок, описание и список навыков."
  },
  projects: {
    eyebrow: "КОНТЕНТ",
    title: "Карточки проектов",
    description: "Карточка, страница проекта и скриншоты."
  }
};

function normalizeDirectory(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

function repoPath(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return github.directory ? `${github.directory}/${clean}` : clean;
}

function detectGitHubPagesDefaults() {
  const supplied = window.PORTFOLIO_GITHUB_DEFAULTS || {};
  const host = window.location.hostname;
  const parts = window.location.pathname.split("/").filter(Boolean);

  let owner = supplied.owner || "";
  let repo = supplied.repo || "";

  if (host.endsWith(".github.io")) {
    owner = host.slice(0, -".github.io".length) || owner;

    const first = parts[0] || "";
    const looksLikeFile = /\.[a-z0-9]+$/i.test(first);

    if (first && !looksLikeFile) {
      repo = first;
    } else if (!repo && owner) {
      repo = `${owner}.github.io`;
    }
  }

  return {
    owner,
    repo,
    branch: supplied.branch || "main",
    directory: supplied.directory || ""
  };
}

function loadSavedConnectionSettings() {
  const defaults = detectGitHubPagesDefaults();

  try {
    const saved = JSON.parse(localStorage.getItem("portfolioGithubSettings") || "{}");
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function prefillConnection() {
  const settings = loadSavedConnectionSettings();
  githubOwner.value = settings.owner || "";
  githubRepo.value = settings.repo || "";
  githubBranch.value = settings.branch || "main";
  githubDirectory.value = settings.directory || "";

  const sessionToken = sessionStorage.getItem("portfolioGithubToken") || "";
  githubToken.value = sessionToken;
}

function saveConnectionSettings(settings) {
  localStorage.setItem("portfolioGithubSettings", JSON.stringify({
    owner: settings.owner,
    repo: settings.repo,
    branch: settings.branch,
    directory: settings.directory
  }));
}

async function githubRequest(path, options = {}) {
  if (!github?.token) {
    throw new Error("GitHub не подключён.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${github.token}`);
  headers.set("X-GitHub-Api-Version", "2026-03-10");

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers
  });

  let payload = null;
  const text = await response.text();

  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!response.ok) {
    const message = payload?.message || `GitHub API: HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function encodeRepoSegment(value) {
  return encodeURIComponent(String(value || "").trim());
}

function contentEndpoint(path) {
  const owner = encodeRepoSegment(github.owner);
  const repo = encodeRepoSegment(github.repo);
  const encodedPath = repoPath(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `/repos/${owner}/${repo}/contents/${encodedPath}`;
}

function base64ToUtf8(base64) {
  const clean = String(base64 || "").replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

async function getRepoFile(path) {
  try {
    return await githubRequest(
      `${contentEndpoint(path)}?ref=${encodeURIComponent(github.branch)}`,
      { method: "GET" }
    );
  } catch (error) {
    if (/not found/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function putRepoFile(path, base64Content, message) {
  const existing = await getRepoFile(path);

  const body = {
    message,
    content: base64Content,
    branch: github.branch
  };

  if (existing?.sha) {
    body.sha = existing.sha;
  }

  return githubRequest(contentEndpoint(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function loadDataFromRepository() {
  const file = await getRepoFile("data/site.json");

  if (!file?.content) {
    throw new Error("В репозитории не найден data/site.json.");
  }

  const parsed = JSON.parse(base64ToUtf8(file.content));

  if (!parsed?.profile || !parsed?.about || !Array.isArray(parsed.projects)) {
    throw new Error("data/site.json имеет неверную структуру.");
  }

  return parsed;
}

async function connectToGitHub(settings) {
  github = settings;

  await githubRequest(
    `/repos/${encodeRepoSegment(github.owner)}/${encodeRepoSegment(github.repo)}`,
    { method: "GET" }
  );

  cmsData = await loadDataFromRepository();
  saveConnectionSettings(github);
  sessionStorage.setItem("portfolioGithubToken", github.token);

  connectView.classList.add("hidden");
  cmsView.classList.remove("hidden");

  repoBadge.textContent = `${github.owner}/${github.repo}`;
  branchBadge.textContent = `${github.branch}${github.directory ? ` · /${github.directory}` : ""}`;

  fillStaticForms();
  selectedProjectIndex = Math.min(
    selectedProjectIndex,
    Math.max(cmsData.projects.length - 1, 0)
  );
  renderProjectNavigation();
  renderProjectEditor();
  setSection(activeSection);
}

connectForm.addEventListener("submit", async event => {
  event.preventDefault();
  connectError.textContent = "";

  const settings = {
    owner: githubOwner.value.trim(),
    repo: githubRepo.value.trim(),
    branch: githubBranch.value.trim() || "main",
    directory: normalizeDirectory(githubDirectory.value),
    token: githubToken.value.trim()
  };

  if (!settings.owner || !settings.repo || !settings.token) {
    connectError.textContent = "Заполни owner, repository и token.";
    return;
  }

  const submit = connectForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Подключаюсь…";

  try {
    await connectToGitHub(settings);
  } catch (error) {
    github = null;
    connectError.textContent =
      `${error.message} Проверь репозиторий, ветку и разрешение Contents: Read and write.`;
  } finally {
    submit.disabled = false;
    submit.textContent = "Подключиться к GitHub";
  }
});

disconnectBtn.addEventListener("click", () => {
  sessionStorage.removeItem("portfolioGithubToken");
  github = null;
  cmsView.classList.add("hidden");
  connectView.classList.remove("hidden");
  githubToken.value = "";
});

navItems.forEach(button => {
  button.addEventListener("click", () => setSection(button.dataset.section));
});

function setSection(section) {
  activeSection = SECTION_COPY[section] ? section : "profile";
  const copy = SECTION_COPY[activeSection];

  navItems.forEach(button => {
    button.classList.toggle("active", button.dataset.section === activeSection);
  });

  sections.forEach(panel => {
    panel.classList.toggle("active", panel.dataset.panel === activeSection);
  });

  projectNavWrap.classList.toggle("hidden", activeSection !== "projects");
  sectionEyebrow.textContent = copy.eyebrow;
  sectionTitle.textContent = copy.title;
  sectionDescription.textContent = copy.description;
}

function displayAsset(path) {
  const clean = safeAssetPath(path);
  if (!clean) return "";
  return pendingPreviewUrls.get(clean) || clean;
}

function rememberPreview(path, file) {
  const clean = safeAssetPath(path);
  if (!clean) return;

  const old = pendingPreviewUrls.get(clean);
  if (old?.startsWith("blob:")) URL.revokeObjectURL(old);

  pendingPreviewUrls.set(clean, URL.createObjectURL(file));
}

function fillStaticForms() {
  profileNameInput.value = cmsData.profile?.name || "";
  profileRoleInput.value = cmsData.profile?.role || "";
  profileLocationInput.value = cmsData.profile?.location || "";
  profileDomainInput.value = cmsData.profile?.domain || "";

  const avatar = safeAssetPath(cmsData.profile?.avatar);
  const avatarDisplay = displayAsset(avatar);

  avatarPath.textContent = avatar || "Фото не выбрано";
  avatarPreview.classList.toggle("has-photo", Boolean(avatarDisplay));
  avatarPreview.style.backgroundImage = avatarDisplay ? `url("${avatarDisplay}")` : "";

  aboutTitleInput.value = cmsData.about?.title || "";
  aboutTextInput.value = cmsData.about?.text || "";
  aboutSkillsInput.value = (cmsData.about?.skills || []).join(", ");
}

function collectStaticForms() {
  cmsData.profile = {
    name: profileNameInput.value.trim(),
    role: profileRoleInput.value.trim(),
    location: profileLocationInput.value.trim(),
    domain: profileDomainInput.value.trim(),
    avatar: cmsData.profile?.avatar || ""
  };

  cmsData.about = {
    title: aboutTitleInput.value.trim(),
    text: aboutTextInput.value.trim(),
    skills: aboutSkillsInput.value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)
  };
}

function extensionForFile(file) {
  const byMime = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };

  if (byMime[file.type]) return byMime[file.type];

  const match = String(file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "png";
}

function slugify(value) {
  const source = String(value || "project").trim().toLowerCase();

  const translit = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };

  const latin = [...source].map(char => translit[char] ?? char).join("");

  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || `project-${Date.now()}`;
}

async function uploadAsset(file, kind, title) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("Нужно выбрать изображение.");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Максимальный размер изображения — 12 МБ.");
  }

  const extension = extensionForFile(file);
  const slug = slugify(title);

  let path;

  if (kind === "avatar") {
    path = `assets/avatar.${extension}`;
  } else if (kind === "screenshot") {
    const random = Math.random().toString(16).slice(2, 8);
    path = `assets/${slug}-screen-${Date.now()}-${random}.${extension}`;
  } else {
    path = `assets/${slug}.${extension}`;
  }

  const content = await fileToBase64(file);
  await putRepoFile(path, content, `Portfolio: update ${path}`);

  rememberPreview(path, file);
  return path;
}

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files?.[0];
  if (!file) return;

  setSaveStatus("Загружаю аватар в GitHub…", "working");

  try {
    const path = await uploadAsset(file, "avatar", "avatar");
    cmsData.profile.avatar = path;
    fillStaticForms();
    await saveAll("Аватар и данные сохранены в GitHub.");
  } catch (error) {
    setSaveStatus(error.message, "error");
  } finally {
    avatarInput.value = "";
  }
});

function renderProjectNavigation() {
  projectNavList.innerHTML = "";

  cmsData.projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.className = "cms-project-nav-item";
    button.type = "button";
    button.classList.toggle("active", index === selectedProjectIndex);
    button.innerHTML = `
      <span>${escapeHtml(project.title || "Без названия")}</span>
      <small>${index + 1}</small>
    `;

    button.addEventListener("click", () => {
      try { collectCurrentProject(); } catch (_) {}
      selectedProjectIndex = index;
      renderProjectNavigation();
      renderProjectEditor();
      setSaveStatus("", "neutral");
    });

    projectNavList.appendChild(button);
  });
}

function currentProject() {
  return cmsData.projects[selectedProjectIndex] || null;
}

function renderProjectEditor() {
  const project = currentProject();

  if (!project) {
    projectEditor.innerHTML = `<div class="cms-project-empty">Создайте первую карточку проекта.</div>`;
    return;
  }

  const image = safeAssetPath(project.image);
  const imageDisplay = displayAsset(image);
  const screenshots = Array.isArray(project.screenshots)
    ? project.screenshots.map(safeAssetPath).filter(Boolean)
    : [];

  projectEditor.innerHTML = `
    <div class="cms-project-layout-v9">
      <div class="cms-image-panel">
        <div class="cms-image-preview ${imageDisplay ? "" : "empty"}" id="projectImagePreview"></div>

        <div class="cms-upload-box">
          <strong>Фото карточки</strong>
          <p>
            Изображение загружается напрямую в <code>assets/</code> в GitHub
            и переименовывается по названию проекта.
          </p>
          <label class="primary-btn raised-btn cms-file-button">
            Выбрать фото карточки
            <input id="projectImageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
          </label>
          <span class="cms-image-path">${escapeHtml(image || "Фото не выбрано")}</span>
        </div>
      </div>

      <div class="cms-project-fields">
        <label class="field-row">
          <span>Название карточки</span>
          <input class="admin-input inset-field" id="projectTitleInput" value="${escapeAttribute(project.title || "")}">
        </label>

        <label class="field-row">
          <span>Короткое описание на карточке</span>
          <textarea class="admin-input admin-textarea compact inset-field" id="projectDescriptionInput">${escapeHtml(project.description || "")}</textarea>
        </label>

        <label class="field-row">
          <span>Описание внутри страницы проекта</span>
          <textarea class="admin-input admin-textarea inset-field" id="projectDetailsInput">${escapeHtml(project.details || project.description || "")}</textarea>
        </label>

        <label class="cms-toggle-row">
          <input id="projectFavoriteInput" type="checkbox" ${project.favorite ? "checked" : ""}>
          <span>
            <strong>Избранный проект</strong>
            <small>Служебный флаг для будущих подборок.</small>
          </span>
        </label>

        <label class="cms-toggle-row">
          <input id="projectScreenshotsEnabledInput" type="checkbox" ${project.showScreenshots ? "checked" : ""}>
          <span>
            <strong>Показывать раздел со скриншотами</strong>
            <small>Если выключить — раздел не упоминается на странице проекта.</small>
          </span>
        </label>
      </div>
    </div>

    <div class="cms-screenshots-editor ${project.showScreenshots ? "" : "disabled"}">
      <div class="cms-screenshots-head">
        <div>
          <strong>Скриншоты страницы проекта</strong>
          <p>
            Выбирай изображения или вставляй скриншот через Ctrl+V.
            Каждый файл сохраняется в GitHub, затем обновляется data/site.json.
          </p>
        </div>

        <div class="cms-screenshot-actions">
          <span class="cms-paste-hint"><kbd>Ctrl</kbd> + <kbd>V</kbd></span>
          <label class="secondary-btn raised-btn cms-file-button">
            + Добавить скриншоты
            <input id="projectScreenshotsInput" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif">
          </label>
        </div>
      </div>

      <div class="cms-screenshot-grid">
        ${screenshots.length
          ? screenshots.map((path, index) => `
              <div class="cms-screenshot-item">
                <img src="${displayAsset(path)}" alt="Скриншот ${index + 1}">
                <button type="button" data-remove-screenshot="${index}" title="Убрать из проекта">×</button>
              </div>
            `).join("")
          : `<div class="cms-screenshot-empty">Скриншоты пока не добавлены.</div>`}
      </div>
    </div>

    <button class="cms-delete-project" id="deleteProjectBtn" type="button">Удалить эту карточку</button>
  `;

  const preview = document.getElementById("projectImagePreview");
  if (imageDisplay) preview.style.backgroundImage = `url("${imageDisplay}")`;

  const titleInput = document.getElementById("projectTitleInput");
  const descriptionInput = document.getElementById("projectDescriptionInput");
  const detailsInput = document.getElementById("projectDetailsInput");
  const favoriteInput = document.getElementById("projectFavoriteInput");
  const screenshotsEnabledInput = document.getElementById("projectScreenshotsEnabledInput");
  const imageInput = document.getElementById("projectImageInput");
  const screenshotsInput = document.getElementById("projectScreenshotsInput");
  const deleteButton = document.getElementById("deleteProjectBtn");

  [titleInput, descriptionInput, detailsInput, favoriteInput].forEach(input => {
    input.addEventListener("input", () => {
      collectCurrentProject();
      if (input === titleInput) renderProjectNavigation();
      markUnsaved();
    });
  });

  screenshotsEnabledInput.addEventListener("change", () => {
    collectCurrentProject();
    renderProjectEditor();
    markUnsaved();
  });

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    collectCurrentProject();
    const title = currentProject()?.title || currentProject()?.id || "project";
    setSaveStatus("Загружаю фото карточки в GitHub…", "working");

    try {
      currentProject().image = await uploadAsset(file, "card", title);
      renderProjectEditor();
      await saveAll("Фото карточки и данные сохранены.");
    } catch (error) {
      setSaveStatus(error.message, "error");
    }
  });

  screenshotsInput.addEventListener("change", async () => {
    const files = [...(screenshotsInput.files || [])];
    if (!files.length) return;
    await uploadProjectScreenshots(files, "Скриншоты сохранены в GitHub.");
  });

  projectEditor.querySelectorAll("[data-remove-screenshot]").forEach(button => {
    button.addEventListener("click", () => {
      collectCurrentProject();
      const index = Number(button.dataset.removeScreenshot);
      currentProject().screenshots.splice(index, 1);
      renderProjectEditor();
      markUnsaved();
    });
  });

  deleteButton.addEventListener("click", () => {
    const name = currentProject()?.title || "эту карточку";
    if (!confirm(`Удалить «${name}»?`)) return;

    cmsData.projects.splice(selectedProjectIndex, 1);
    selectedProjectIndex = Math.max(
      0,
      Math.min(selectedProjectIndex, cmsData.projects.length - 1)
    );

    renderProjectNavigation();
    renderProjectEditor();
    markUnsaved();
  });
}

function collectCurrentProject() {
  const project = currentProject();
  if (!project) return;

  const title = document.getElementById("projectTitleInput");
  const description = document.getElementById("projectDescriptionInput");
  const details = document.getElementById("projectDetailsInput");
  const favorite = document.getElementById("projectFavoriteInput");
  const screenshotsEnabled = document.getElementById("projectScreenshotsEnabledInput");

  if (!title || !description || !details || !favorite || !screenshotsEnabled) return;

  project.title = title.value.trim();
  project.description = description.value.trim();
  project.details = details.value.trim();
  project.favorite = favorite.checked;
  project.showScreenshots = screenshotsEnabled.checked;
  project.screenshots = Array.isArray(project.screenshots) ? project.screenshots : [];
}

async function uploadProjectScreenshots(files, successMessage) {
  const images = [...files].filter(file => String(file.type || "").startsWith("image/"));
  if (!images.length) return;

  collectCurrentProject();
  const project = currentProject();

  if (!project) {
    setSaveStatus("Сначала выбери проект.", "error");
    return;
  }

  project.screenshots = Array.isArray(project.screenshots) ? project.screenshots : [];

  setSaveStatus(
    images.length === 1
      ? "Загружаю скриншот в GitHub…"
      : `Загружаю скриншоты в GitHub: ${images.length}…`,
    "working"
  );

  try {
    for (const file of images) {
      const path = await uploadAsset(
        file,
        "screenshot",
        project.title || project.id || "project"
      );
      project.screenshots.push(path);
    }

    project.showScreenshots = true;
    renderProjectEditor();
    await saveAll(successMessage || "Скриншоты сохранены.");
  } catch (error) {
    setSaveStatus(error.message, "error");
  }
}

document.addEventListener("paste", async event => {
  const items = [...(event.clipboardData?.items || [])];
  const imageItems = items.filter(
    item => item.kind === "file" && item.type.startsWith("image/")
  );

  if (!imageItems.length) return;
  if (activeSection !== "projects" || !currentProject()) return;

  const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
  if (!files.length) return;

  event.preventDefault();

  await uploadProjectScreenshots(
    files,
    files.length === 1
      ? "Скриншот из буфера сохранён в GitHub."
      : `Из буфера сохранено скриншотов: ${files.length}.`
  );
});

addProjectBtn.addEventListener("click", () => {
  try { collectCurrentProject(); } catch (_) {}

  const id = `project-${Date.now()}`;

  cmsData.projects.push({
    id,
    title: "Новый проект",
    description: "",
    details: "",
    favorite: false,
    image: "",
    showScreenshots: true,
    screenshots: []
  });

  selectedProjectIndex = cmsData.projects.length - 1;
  renderProjectNavigation();
  renderProjectEditor();
  markUnsaved();
});

saveBtn.addEventListener("click", () => saveAll());

async function saveAll(successMessage = "Изменения отправлены в GitHub.") {
  collectStaticForms();
  collectCurrentProject();

  setSaveStatus("Создаю коммит data/site.json…", "working");
  saveBtn.disabled = true;

  try {
    const json = JSON.stringify(cmsData, null, 2) + "\n";
    await putRepoFile(
      "data/site.json",
      utf8ToBase64(json),
      "Portfolio: update site content"
    );

    setSaveStatus(
      `${successMessage} GitHub Pages обновит сайт после публикации нового коммита.`,
      "success"
    );
  } catch (error) {
    setSaveStatus(error.message, "error");
  } finally {
    saveBtn.disabled = false;
  }
}

function markUnsaved() {
  setSaveStatus("Есть несохранённые изменения.", "neutral");
}

function setSaveStatus(message, type = "neutral") {
  saveStatus.textContent = message;
  saveStatus.dataset.type = type;
}

async function tryRestoreSession() {
  prefillConnection();

  const token = sessionStorage.getItem("portfolioGithubToken");
  if (!token) return;

  const settings = loadSavedConnectionSettings();

  if (!settings.owner || !settings.repo) return;

  try {
    await connectToGitHub({ ...settings, token });
  } catch (error) {
    sessionStorage.removeItem("portfolioGithubToken");
    github = null;
    connectError.textContent = `Автоподключение не удалось: ${error.message}`;
  }
}

tryRestoreSession();
