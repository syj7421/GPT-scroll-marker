/********************************************
 * contentScript.js
 ********************************************/

/**
 * This file is loaded last in the manifest, after:
 *   - config.js
 *   - domUtils.js
 *   - markerManager.js
 *   - uiManager.js
 *
 * It orchestrates the initialization and watchers.
 */

// 1. Initialize the floating UI
window.initUI();

// 2. Listen for color changes and widget hide/show actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "hide_widget") {
    if (window.controlsContainer) {
      window.controlsContainer.style.display = "none";
    }
  } else if (message.action === "show_widget") {
    if (window.controlsContainer) {
      window.controlsContainer.style.display = "";
    }
  } else if (message.action === "colour_change") {
    // Update global marker color
    window.currentMarkerColor = message.color;
    // Repaint all existing markers
    window.qsa('.scroll-marker').forEach(marker => {
      marker.style.backgroundColor = window.currentMarkerColor;
    });
  }
});

// 3. Setup marker initialization and watchers
async function initMarkers() {
  const scrollable = await waitForMainScrollableElement();
  // Load the global marker color from storage
  chrome.storage.sync.get(["selectedColor"], data => {
    if (data.selectedColor) {
      window.currentMarkerColor = data.selectedColor;
    }
    // Now load markers for this page
    window.loadMarkersForCurrentUrl(scrollable);

    // Watch for size/DOM changes to reposition markers
    new ResizeObserver(debounceRepositionMarkers).observe(scrollable);
    if (scrollable.firstChild) {
      new MutationObserver(debounceRepositionMarkers).observe(scrollable.firstChild, { childList: true, subtree: true });
    }
  });
}

function waitForMainScrollableElement() {
  const existingEl = window.getMainScrollableElement();
  if (existingEl) return Promise.resolve(existingEl);

  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const el = window.getMainScrollableElement();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

let repositionTimeout;
function debounceRepositionMarkers() {
  if (repositionTimeout) clearTimeout(repositionTimeout);
  repositionTimeout = setTimeout(() => {
    window.repositionMarkers();
  }, 100);
}

// 4. Detect URL changes (e.g., single-page-app style) and re-init
function handleChatChange() {
  window.clearMarkers();
  initMarkers();
}

let currentLocation = window.location.href;
setInterval(() => {
  if (window.location.href !== currentLocation) {
    currentLocation = window.location.href;
    handleChatChange();
  }
}, 1500);

// 5. Keep the controls/markers in the DOM if the page re-renders
setInterval(() => {
  if (window.controlsContainer && !document.body.contains(window.controlsContainer)) {
    document.body.appendChild(window.controlsContainer);
  }
  const scrollable = window.getMainScrollableElement();
  if (scrollable) {
    window.markers.forEach(({ marker }) => {
      if (!scrollable.contains(marker)) {
        scrollable.appendChild(marker);
      }
    });
  }
}, 3000);

new MutationObserver(() => {
  if (window.controlsContainer && !document.body.contains(window.controlsContainer)) {
    document.body.appendChild(window.controlsContainer);
  }
}).observe(document.body, { childList: true, subtree: true });

// 6. Kick off
initMarkers();
