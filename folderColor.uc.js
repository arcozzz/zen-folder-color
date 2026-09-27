// ==UserScript==
// @name           Folder Color Picker
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==

(function () {
  console.log("TEST FOLDER COLOR CHARGÉ");
  const STORAGE_KEY = "zen-folder-colors";

  function loadColors() {
    try { return JSON.parse(Services.prefs.getStringPref(STORAGE_KEY, "{}")); }
    catch { return {}; }
  }

  function saveColors(map) {
    Services.prefs.setStringPref(STORAGE_KEY, JSON.stringify(map));
  }

  function ensureStyle() {
    if (document.getElementById("zfc-style")) return;
    const s = document.createElement("style");
    s.id = "zfc-style";
    s.textContent = `
      zen-folder[data-zfc] {
        background-color: color-mix(in srgb, var(--zfc) 18%, transparent) !important;
        border-left: 3px solid var(--zfc) !important;
        border-radius: 6px !important;
      }
    `;
    document.head.appendChild(s);
  }

  function applyAll() {
    ensureStyle();
    const colors = loadColors();
    for (const [id, color] of Object.entries(colors)) {
      const el = document.querySelector(`zen-folder[id="${id}"]`);
      if (el) {
        el.style.setProperty("--zfc", color);
        el.setAttribute("data-zfc", "1");
      }
    }
  }

  function getFolderEl(el) {
    while (el && el !== document.body) {
      if (el.tagName && el.tagName.toLowerCase() === "zen-folder") return el;
      el = el.parentElement;
    }
    return null;
  }

  let lastTarget = null;

  function injectMenu(menu) {
    if (!menu || menu.querySelector(".zfc-item")) return;
    const ns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    const sep = document.createElementNS(ns, "menuseparator");
    sep.className = "zfc-sep";

    const pick = document.createElementNS(ns, "menuitem");
    pick.className = "zfc-item";
    pick.setAttribute("label", "🎨 Folder Color…");
    pick.addEventListener("command", () => {
      const folderEl = getFolderEl(lastTarget);
      if (!folderEl) { console.warn("[FolderColor] pas de zen-folder trouvé"); return; }
      const folderId = folderEl.getAttribute("id");
      const colors = loadColors();
      const input = document.createElement("input");
      input.type = "color";
      input.value = colors[folderId] || "#7c6af7";
      input.style.cssText = "position:fixed;top:-999px;left:-999px;opacity:0;";
      document.body.appendChild(input);
      input.addEventListener("change", () => {
        const c = loadColors();
        c[folderId] = input.value;
        saveColors(c);
        folderEl.style.setProperty("--zfc", input.value);
        folderEl.setAttribute("data-zfc", "1");
        ensureStyle();
        input.remove();
      });
      input.addEventListener("cancel", () => input.remove());
      setTimeout(() => input.click(), 50);
    });

    const reset = document.createElementNS(ns, "menuitem");
    reset.className = "zfc-reset";
    reset.setAttribute("label", "✖ Reset Folder Color");
    reset.addEventListener("command", () => {
      const folderEl = getFolderEl(lastTarget);
      if (!folderEl) return;
      const folderId = folderEl.getAttribute("id");
      const c = loadColors();
      delete c[folderId];
      saveColors(c);
      folderEl.style.removeProperty("--zfc");
      folderEl.removeAttribute("data-zfc");
    });

    menu.appendChild(sep);
    menu.appendChild(pick);
    menu.appendChild(reset);

    menu.addEventListener("popupshowing", e => {
      lastTarget = e.explicitOriginalTarget || e.originalTarget || e.target;
    });
  }

  function setup() {
    applyAll();
    ["zenFolderActions", "tabContextMenu", "zenWorkspaceContextMenu"].forEach(id => {
      injectMenu(document.getElementById(id));
    });
    new MutationObserver(() => {
      ["zenFolderActions", "tabContextMenu", "zenWorkspaceContextMenu"].forEach(id => {
        injectMenu(document.getElementById(id));
      });
      applyAll();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  setTimeout(setup, 2000);
})();
