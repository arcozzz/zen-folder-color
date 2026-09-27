// ==UserScript==
// @name           Folder Color Picker
// @description    Ajoute "Folder Color" dans le menu clic droit des folders Zen
// @include        main
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "zen-folder-colors";

  function loadColors() {
    try {
      return JSON.parse(Services.prefs.getStringPref(STORAGE_KEY, "{}"));
    } catch { return {}; }
  }

  function saveColors(map) {
    Services.prefs.setStringPref(STORAGE_KEY, JSON.stringify(map));
  }

  function ensureStyleSheet() {
    if (document.getElementById("zen-folder-color-style")) return;
    const style = document.createElement("style");
    style.id = "zen-folder-color-style";
    style.textContent = `
      [data-custom-color] {
        background-color: color-mix(in srgb, var(--folder-accent-color) 18%, transparent) !important;
        border-left: 3px solid var(--folder-accent-color) !important;
        border-radius: 6px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getFolderId(el) {
    if (!el) return null;
    return (
      el.getAttribute("data-folder-id") ||
      el.getAttribute("zen-folder-id") ||
      el.getAttribute("zen-workspace-id") ||
      null
    );
  }

  function applyColor(folderId, color) {
    const selectors = [
      `[data-folder-id="${folderId}"]`,
      `[zen-folder-id="${folderId}"]`,
      `[zen-workspace-id="${folderId}"]`,
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.setProperty("--folder-accent-color", color);
        el.setAttribute("data-custom-color", color);
      });
    }
    ensureStyleSheet();
  }

  function applyAllColors() {
    const colors = loadColors();
    for (const [id, color] of Object.entries(colors)) {
      applyColor(id, color);
    }
  }

  function showColorPicker(folderId, folderEl) {
    const colors = loadColors();
    const current = colors[folderId] || "#7c6af7";
    const input = document.createElement("input");
    input.type = "color";
    input.value = current;
    input.style.cssText = "position:fixed;top:-200px;left:-200px;opacity:0;";
    document.body.appendChild(input);
    input.addEventListener("change", () => {
      const color = input.value;
      const c = loadColors();
      c[folderId] = color;
      saveColors(c);
      applyColor(folderId, color);
      input.remove();
    });
    input.addEventListener("cancel", () => input.remove());
    setTimeout(() => input.click(), 50);
    setTimeout(() => { if (input.parentNode) input.remove(); }, 60000);
  }

  let currentTarget = null;

  function injectIntoMenu(menu) {
    if (!menu || menu.querySelector(".zen-folder-color-item")) return;
    const ns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    const sep = document.createElementNS(ns, "menuseparator");
    sep.className = "zen-folder-color-sep";
    const item = document.createElementNS(ns, "menuitem");
    item.className = "zen-folder-color-item";
    item.setAttribute("label", "🎨 Folder Color…");
    item.addEventListener("command", () => {
      if (!currentTarget) return;
      let el = currentTarget;
      let folderId = getFolderId(el);
      if (!folderId) {
        const ancestor = el.closest("[data-folder-id],[zen-folder-id],[zen-workspace-id]");
        if (ancestor) folderId = getFolderId(ancestor);
      }
      if (!folderId) { console.warn("[FolderColor] id introuvable sur", el); return; }
      showColorPicker(folderId, el);
    });
    const resetItem = document.createElementNS(ns, "menuitem");
    resetItem.className = "zen-folder-color-reset";
    resetItem.setAttribute("label", "✖ Reset Folder Color");
    resetItem.addEventListener("command", () => {
      if (!currentTarget) return;
      let el = currentTarget;
      let folderId = getFolderId(el);
      if (!folderId) {
        const ancestor = el.closest("[data-folder-id],[zen-folder-id],[zen-workspace-id]");
        if (ancestor) folderId = getFolderId(ancestor);
      }
      if (!folderId) return;
      const c = loadColors();
      delete c[folderId];
      saveColors(c);
      document.querySelectorAll(`[data-folder-id="${folderId}"],[zen-folder-id="${folderId}"],[zen-workspace-id="${folderId}"]`)
        .forEach(t => { t.style.removeProperty("--folder-accent-color"); t.removeAttribute("data-custom-color"); });
    });
    menu.appendChild(sep);
    menu.appendChild(item);
    menu.appendChild(resetItem);
    menu.addEventListener("popupshowing", (e) => {
      currentTarget = e.explicitOriginalTarget || e.originalTarget || e.target;
    });
  }

  function init() {
    ensureStyleSheet();
    applyAllColors();
    const menuIds = ["tabContextMenu", "zenWorkspaceContextMenu", "placesContext"];
    for (const id of menuIds) {
      const menu = document.getElementById(id);
      if (menu) injectIntoMenu(menu);
    }
    new MutationObserver(() => {
      for (const id of menuIds) {
        const menu = document.getElementById(id);
        if (menu) injectIntoMenu(menu);
      }
      applyAllColors();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (gBrowserInit?.delayedStartupFinished) {
    init();
  } else {
    window.addEventListener("MozAfterPaint", function onPaint() {
      window.removeEventListener("MozAfterPaint", onPaint);
      setTimeout(init, 500);
    });
  }
})();
