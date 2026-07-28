const detailRoot = document.getElementById("projectDetail");
const detailTopTitle = document.getElementById("detailTopTitle");

function getProjectId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function renderProject(project) {
  document.title = `${project.title} — Portfolio`;
  detailTopTitle.textContent = project.title;

  const cover = safeAssetPath(project.image);
  const screenshots = Array.isArray(project.screenshots)
    ? project.screenshots.map(safeAssetPath).filter(Boolean)
    : [];

  const showScreenshots = Boolean(project.showScreenshots) && screenshots.length > 0;
  const initialImage = showScreenshots ? screenshots[0] : cover;

  detailRoot.innerHTML = `
    <div class="detail-v9-copy">
      <span class="eyebrow">PROJECT</span>
      <h1>${escapeHtml(project.title)}</h1>
      <p class="detail-v9-lead">${escapeHtml(project.details || project.description || "")}</p>

    </div>

    <div class="detail-v9-media ${showScreenshots ? "" : "gallery-disabled"}">
      ${showScreenshots ? `
        <div class="detail-v9-gallery-title">
          <span>Скриншоты</span>
          <small>${screenshots.length}</small>
        </div>

        <div class="detail-v9-main-shot">
          <img id="mainScreenshot" src="${initialImage}" alt="${escapeAttribute(project.title)}">
        </div>

        <div class="detail-v9-thumbs" id="screenshotThumbs">
          ${screenshots.map((path, index) => `
            <button class="detail-v9-thumb ${index === 0 ? "active" : ""}" type="button" data-src="${path}">
              <img src="${path}" alt="Скриншот ${index + 1}">
            </button>
          `).join("")}
        </div>
      ` : `
        <div class="detail-v9-cover-only">
          ${cover
            ? `<img src="${cover}" alt="${escapeAttribute(project.title)}">`
            : `<div class="detail-v9-no-image">Изображение проекта не добавлено</div>`}
        </div>
      `}
    </div>
  `;

  const main = document.getElementById("mainScreenshot");
  if (main) {
    detailRoot.querySelectorAll(".detail-v9-thumb").forEach(button => {
      button.addEventListener("click", () => {
        const src = safeAssetPath(button.dataset.src);
        if (!src) return;

        main.src = src;
        detailRoot.querySelectorAll(".detail-v9-thumb").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
      });
    });
  }
}

async function initProjectPage() {
  const data = await loadData();
  const id = safeProjectId(getProjectId());
  const project = data.projects.find(item => item.id === id);

  if (!project) {
    detailRoot.innerHTML = `
      <div class="detail-v9-loading">
        Проект не найден.<br><a href="index.html">Вернуться на главную</a>
      </div>`;
    return;
  }

  renderProject(project);
}

initProjectPage();
