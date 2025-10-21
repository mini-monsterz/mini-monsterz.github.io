const canvas = document.getElementById("monsterCanvas");
const ctx = canvas.getContext("2d");

// tabs and layer order
const tabs = ["heads", "legs", "arms", "eye1", "eye2", "nose", "mouth", "colour"];
const layer_order = ["legs", "arms", "body", "shade", "heads", "eye1", "eye2", "nose", "mouth"];

// parts data
const parts = {
  body: { img: "assets/body/body.png", color: null, offsetY: 0 },
  shade: { img: "assets/body/shade.png", color: null, offsetY: 0 },
  heads: null,
  legs: null,
  arms: null,
  eye1: null,
  eye2: null,
  nose: null,
  mouth: null,
};

// default tab
let currentTab = "heads";

// html elements
const tabsDiv = document.getElementById("tabs");
const optionsDiv = document.getElementById("options");
const moveUp = document.getElementById("move-up");
const moveDown = document.getElementById("move-down");
const moveLeft = document.getElementById("move-left");
const moveRight = document.getElementById("move-right");

// init functions
initTabs();
updateOptions();
makeMonster();


// TAB INITIALISATION
function initTabs() {
  tabsDiv.innerHTML = "";
  tabs.forEach(tab => {
    const btn = document.createElement("div");
    btn.className = `tab${tab === currentTab ? " active" : ""}`;

    const icon = new Image();
    icon.src = `assets/icons/icon-${tab}.png`;
    icon.alt = tab;
    icon.width = icon.height = 66;

    btn.appendChild(icon);
    btn.onclick = () => setActiveTab(tab);
    tabsDiv.appendChild(btn);
  });
}

function setActiveTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.tab img[alt="${tab}"]`).parentElement.classList.add("active");
  updateOptions();
}


// --- OPTIONS
function updateOptions() {
  optionsDiv.innerHTML = "";

  // COLOUR TAB
  if (currentTab === "colour") {
    addColorControl("primary", "#adadad", "assets/icons/primary-label.png");
    addColorControl("secondary", "#9c959c", "assets/icons/secondary-label.png");
    return;
  }

  // PARTS TABS
  const noneBtn = createOptionButton("assets/icons/icon-none.png", "None", () => {
    parts[currentTab] = null;
    makeMonster();
  });
  optionsDiv.appendChild(noneBtn);

  fetchFolderImages(`assets/${currentTab}`).then(images =>
    images.forEach(src => {
      const fileName = src.split("/").pop().split(".")[0];
      const iconPath = ["eye1", "eye2"].includes(currentTab)
        ? `assets/icons/eyes/icon-${fileName}.png`
        : `assets/icons/${currentTab}/icon-${fileName}.png`;

      const btn = createOptionButton(iconPath, fileName, () => {
        const color = getDefaultColorForTab(currentTab);
        parts[currentTab] = { img: src, color, offsetY: 0 };
        makeMonster();
      });
      optionsDiv.appendChild(btn);
    })
  );
}


// UI HELP FUNCTIONS
function createOptionButton(iconSrc, fallbackText, onClick) {
  const btn = document.createElement("button");
  btn.className = "option-btn";

  const icon = new Image();
  icon.src = iconSrc;
  icon.alt = fallbackText;
  icon.onerror = () => {
    btn.textContent = fallbackText;
    icon.remove();
  };

  btn.appendChild(icon);
  btn.onclick = onClick;
  return btn;
}

function addColorControl(type, defaultColor, labelSrc) {
  const label = new Image();
  label.src = labelSrc;
  label.alt = `${type} Colour`;
  label.className = "color-label";

  const input = document.createElement("input");
  input.type = "color";
  input.value = parts[`${type}Color`] || defaultColor;
  input.oninput = e => {
    parts[`${type}Color`] = e.target.value;
    applyColorChanges();
    makeMonster();
  };

  optionsDiv.append(label, input);
}

function getDefaultColorForTab(tab) {
  if (["heads", "arms", "legs", "body"].includes(tab))
    return parts.primaryColor || "#adadad";
  if (["shade", "eye1", "eye2", "nose", "mouth"].includes(tab))
    return parts.secondaryColor || "#9c959c";
  return null;
}


// MAKE MONSTER
async function makeMonster() {
  // offscreen canvas so no flickering no epilepsy
  const buffer = document.createElement("canvas");
  buffer.width = canvas.width;
  buffer.height = canvas.height;
  const bctx = buffer.getContext("2d");

  parts.body ??= { img: "assets/body/body.png", color: null, offsetX: 0, offsetY: 0 };
  parts.shade ??= { img: "assets/body/shade.png", color: null, offsetX: 0, offsetY: 0 };

  // preload all images first
  const imagesToLoad = layer_order
    .filter(layer => parts[layer])
    .map(layer => loadImage(parts[layer].img).then(img => [layer, img]));
  const loadedImages = new Map(await Promise.all(imagesToLoad));

  // draw all parts on the buffer
  for (const layer of layer_order) {
    const part = parts[layer];
    if (!part) continue;

    const img = loadedImages.get(layer);
    if (!img) continue;

    const tinted = tintImage(img, part.color);
    const x = part.offsetX || 0;
    const y = part.offsetY || 0;

    if (layer === "eye2") {
      bctx.save();
      bctx.translate(canvas.width, 0);
      bctx.scale(-1, 1);
      bctx.drawImage(tinted, canvas.width - (x + img.width), y);
      bctx.restore();
    } else {
      bctx.drawImage(tinted, x, y);
    }
  }

  // final result
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(buffer, 0, 0);
}

function tintImage(img, color) {
  const off = document.createElement("canvas");
  off.width = img.width;
  off.height = img.height;
  const octx = off.getContext("2d");

  octx.drawImage(img, 0, 0);
  if (color) {
    octx.globalCompositeOperation = "source-atop";
    octx.fillStyle = color;
    octx.fillRect(0, 0, off.width, off.height);
  }
  return off;
}


// COLOR CHANGES
function applyColorChanges() {
  const primary = parts.primaryColor || "#adadad";
  const secondary = parts.secondaryColor || "#9c959c";

  setPartColors(["heads", "arms", "legs", "body"], primary);
  setPartColors(["shade", "eye1", "eye2", "nose", "mouth"], secondary);
}

function setPartColors(keys, color) {
  keys.forEach(k => { if (parts[k]) parts[k].color = color; });
}


// MOVEMENT CONTROLS
const stepSize = 6; // step size

const moveHandlers = {
  up: () => movePart("offsetY", -stepSize),
  down: () => movePart("offsetY", stepSize),
  left: () => movePart("offsetX", -stepSize, true),
  right: () => movePart("offsetX", stepSize, true),
};

moveUp.onclick = moveHandlers.up;
moveDown.onclick = moveHandlers.down;
moveLeft.onclick = moveHandlers.left;
moveRight.onclick = moveHandlers.right;

function movePart(axis, delta, checkX = false) {
  if (parts[currentTab] && (!checkX || canMoveX(currentTab))) {
    parts[currentTab][axis] = (parts[currentTab][axis] || 0) + delta;
    makeMonster();
  }
}

function canMoveX(tab) {
  return ["eye1", "eye2", "nose", "mouth", "arms"].includes(tab);
}


// IMAGE FUNCTIONS
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fetchFolderImages(folder) {
  const folderMap = {
    heads: "heads", legs: "legs", arms: "arms",
    eye1: "eyes", eye2: "eyes", nose: "noses",
    mouth: "mouths", body: "body"
  };

  const actualFolder = `assets/${folderMap[currentTab]}`;
  const images = {
    heads: makeImageList("head", 25),
    arms: makeImageList("arms", 15),
    legs: makeImageList("legs", 15),
    eyes: makeImageList("eye", 26),
    mouths: makeImageList("mouth", 22),
    noses: makeImageList("nose", 20)
  };

  const key = folderMap[currentTab];
  const files = images[key] || [];
  return Promise.resolve(files.map(f => `${actualFolder}/${f}`));
}

function makeImageList(prefix, count) {
  return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}.png`);
}
