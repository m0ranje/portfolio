let siteData = deepClone(DEFAULT_DATA);
let filtered = [];
let activeIndex = 0;
let touchStartX = null;
let wheelLocked = false;
let isAnimating = false;

const carousel = document.getElementById("carousel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const detailsBtn = document.getElementById("detailsBtn");
const aboutModal = document.getElementById("aboutModal");
const closeModal = document.getElementById("closeModal");

const profileName = document.getElementById("profileName");
const profileRole = document.getElementById("profileRole");
const profileLocation = document.getElementById("profileLocation");
const profileAvatar = document.getElementById("profileAvatar");
const domainLabel = document.getElementById("siteDomain");
const aboutTitle = document.getElementById("aboutTitle");
const aboutText = document.getElementById("aboutText");
const skillChips = document.getElementById("skillChips");

function syncPublicInfo() {
  profileName.textContent = siteData.profile?.name || "";
  profileRole.textContent = siteData.profile?.role || "";
  profileLocation.textContent = siteData.profile?.location || "";
  domainLabel.textContent = siteData.profile?.domain || "portfolio.dev";

  const avatar = safeAssetPath(siteData.profile?.avatar);
  profileAvatar.classList.toggle("has-photo", Boolean(avatar));
  profileAvatar.style.backgroundImage = avatar ? `url("${avatar}")` : "";

  aboutTitle.textContent = siteData.about?.title || "";
  aboutText.textContent = siteData.about?.text || "";

  skillChips.innerHTML = "";
  (siteData.about?.skills || []).forEach(skill => {
    const chip = document.createElement("span");
    chip.textContent = skill;
    skillChips.appendChild(chip);
  });
}

function render() {
  filtered = Array.isArray(siteData.projects) ? [...siteData.projects] : [];

  if (!filtered.length) {
    carousel.innerHTML = `
      <article class="project-card active" style="--offset:0;--abs:0;--z:10">
        <div class="card-visual no-image"></div>
        <div class="card-info">
          <h2 class="card-title">Проектов пока нет</h2>
          <p class="card-desc">Добавьте карточку через админ-панель.</p>
        </div>
      </article>`;
    activeIndex = 0;
    return;
  }

  activeIndex = Math.max(0, Math.min(activeIndex, filtered.length - 1));
  carousel.innerHTML = "";

  filtered.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card";
    if (index === activeIndex) card.classList.add("active");

    let rawOffset = index - activeIndex;
    const count = filtered.length;

    if (rawOffset > count / 2) rawOffset -= count;
    if (rawOffset < -count / 2) rawOffset += count;

    const clamped = Math.max(-2, Math.min(2, rawOffset));
    const abs = Math.abs(clamped);

    card.style.setProperty("--offset", clamped);
    card.style.setProperty("--abs", abs);
    card.style.setProperty("--z", 20 - abs);
    card.dataset.hidden = Math.abs(rawOffset) > 2 ? "true" : "false";
    card.setAttribute("aria-label", project.title || "Проект");

    card.innerHTML = `
      <div class="card-visual">
        <span class="card-dots" aria-hidden="true">•••</span>
      </div>
      <div class="card-info">
        <h2 class="card-title">${escapeHtml(project.title || "Без названия")}</h2>
        <p class="card-desc">${escapeHtml(project.description || "")}</p>
      </div>
    `;

    const visual = card.querySelector(".card-visual");
    const image = safeAssetPath(project.image);

    if (image) {
      visual.style.backgroundImage =
        `linear-gradient(180deg, rgba(4,8,22,.03), rgba(4,8,22,.16)), url("${image}")`;
      visual.style.backgroundSize = "cover";
      visual.style.backgroundPosition = "center";
    } else {
      visual.classList.add("no-image");
    }

    card.addEventListener("click", () => {
      if (index !== activeIndex) {
        goToIndex(index);
        return;
      }

      const id = safeProjectId(project.id);
      if (id) {
        window.location.href = `project.html?id=${encodeURIComponent(id)}`;
      }
    });

    carousel.appendChild(card);
  });
}

function goToIndex(index) {
  if (isAnimating || !filtered.length) return;

  isAnimating = true;
  activeIndex = index;
  render();

  setTimeout(() => {
    isAnimating = false;
  }, 980);
}

function next() {
  if (!filtered.length || isAnimating) return;
  goToIndex((activeIndex + 1) % filtered.length);
}

function prev() {
  if (!filtered.length || isAnimating) return;
  goToIndex((activeIndex - 1 + filtered.length) % filtered.length);
}

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);

document.addEventListener("keydown", event => {
  if (event.key === "ArrowRight" && !document.querySelector("dialog[open]")) next();
  if (event.key === "ArrowLeft" && !document.querySelector("dialog[open]")) prev();
  if (event.key === "Escape" && aboutModal.open) aboutModal.close();
});

carousel.addEventListener("wheel", event => {
  if (Math.abs(event.deltaY) < 12 || wheelLocked || isAnimating) return;
  event.preventDefault();

  wheelLocked = true;
  event.deltaY > 0 ? next() : prev();

  setTimeout(() => {
    wheelLocked = false;
  }, 900);
}, { passive: false });

carousel.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

carousel.addEventListener("touchend", event => {
  if (touchStartX === null || isAnimating) return;

  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 42) delta < 0 ? next() : prev();

  touchStartX = null;
}, { passive: true });

function openAbout() {
  if (typeof aboutModal.showModal === "function") aboutModal.showModal();
}

detailsBtn.addEventListener("click", openAbout);
closeModal.addEventListener("click", () => aboutModal.close());

aboutModal.addEventListener("click", event => {
  const box = aboutModal.getBoundingClientRect();
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  ) {
    aboutModal.close();
  }
});

async function init() {
  siteData = await loadData();
  syncPublicInfo();
  render();
}

init();
