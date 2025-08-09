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
let resizeObserverRef = null;
let mutationObserverRef = null;

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
    if (resizeObserverRef) resizeObserverRef.disconnect();
    resizeObserverRef = new ResizeObserver(debounceRepositionMarkers);
    resizeObserverRef.observe(scrollable);

    // Observe the scrollable container for structural/content changes
    if (mutationObserverRef) mutationObserverRef.disconnect();
    const mutationCallback = (records) => {
      // Ignore mutations originating from our own markers or controls to prevent hover flicker
      const shouldReposition = records.some(r => {
        const target = r.target;
        const insideMarker = target.closest && target.closest('.scroll-marker');
        const insideControls = window.controlsContainer && window.controlsContainer.contains(target);
        return !insideMarker && !insideControls;
      });
      if (shouldReposition) debounceRepositionMarkers();
    };
    mutationObserverRef = new MutationObserver(mutationCallback);
    mutationObserverRef.observe(scrollable, { childList: true, subtree: true });
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
  // Cleanup old observers
  if (resizeObserverRef) {
    try { resizeObserverRef.disconnect(); } catch (_) {}
    resizeObserverRef = null;
  }
  if (mutationObserverRef) {
    try { mutationObserverRef.disconnect(); } catch (_) {}
    mutationObserverRef = null;
  }
  window.clearMarkers();
  initMarkers();
}

// SPA-friendly URL change detection without polling
let currentLocation = window.location.href;
function onUrlMaybeChanged() {
  if (window.location.href !== currentLocation) {
    currentLocation = window.location.href;
    handleChatChange();
  }
}

// Patch history methods
const originalPushState = history.pushState;
history.pushState = function(...args) {
  const ret = originalPushState.apply(this, args);
  onUrlMaybeChanged();
  return ret;
};
const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
  const ret = originalReplaceState.apply(this, args);
  onUrlMaybeChanged();
  return ret;
};
window.addEventListener('popstate', onUrlMaybeChanged);

// Fallback: periodic check in case SPA navigation doesn't trigger popstate
setInterval(onUrlMaybeChanged, 1500);

new MutationObserver(() => {
  if (window.controlsContainer && !document.body.contains(window.controlsContainer)) {
    document.body.appendChild(window.controlsContainer);
  }
}).observe(document.body, { childList: true, subtree: true });

// 6. Kick off
initMarkers();
