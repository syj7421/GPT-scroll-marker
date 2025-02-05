/********************************************
 * CONFIG & GLOBALS
 ********************************************/
const MARKERS_LIMIT = 20;
const MAX_URL_ENTRIES = 50;
const CHAT_GPT_SCROLLABLE_SELECTOR = 'main .overflow-y-auto';

let markers = [];
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default marker color

// Cache for the scrollable element
let cachedScrollable = null;

/********************************************
 * Load Global Marker Color from Storage
 ********************************************/
// When the content script loads, get the stored global marker color
chrome.storage.local.get(["selectedColor"], (data) => {
  if (data.selectedColor) {
    currentMarkerColor = data.selectedColor;
  }
});

/********************************************
 * HELPER FUNCTIONS
 ********************************************/
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/********************************************
 * MAIN UI ELEMENTS (CONTROLS & TOOLTIP)
 ********************************************/
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';
document.body.appendChild(controlsContainer);

let tooltip = qs('#custom-tooltip');
if (!tooltip) {
  tooltip = document.createElement('div');
  tooltip.id = 'custom-tooltip';
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
}

/********************************************
 * BUTTON CONFIGURATION & SETUP
 ********************************************/
const buttonsConfig = [
  {
    label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 1c.552 0 1 .448 1 1v5h5c.552 0 1 .448 1 1s-.448 1-1 1H9v5c0 .552-.448 1-1 1s-1-.448-1-1V9H2c-.552 0-1-.448-1-1s.448-1 1-1h5V2c0-.552.448-1 1-1z"/>
            </svg>`,
    action: handleCreateMarker,
    className: 'create-btn',
    tooltip: 'Add a marker at the current position'
  },
  {
    label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
              <path fill="currentColor" d="M2.5 3a.5.5 0 0 1 .5-.5H5V1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a.5.5 0 0 1 0 1H2a.5.5 0 0 1 0-1zM3 4h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z"/>
            </svg>`,
    action: toggleDeleteMode,
    className: 'delete-btn',
    tooltip: 'To delete markers: Click this button, then click on the markers you want to remove!'
  },
  {
    label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 15.5a.5.5 0 0 1-.5-.5V3.707L3.854 7.354a.5.5 0 1 1-.708-.708l4.5-4.5a.5.5 0 0 1 .708 0l4.5 4.5a.5.5 0 1 1-.708.708L8.5 3.707V15a.5.5 0 0 1-.5.5z"/>
            </svg>`,
    action: () => navigateMarkers(-1),
    className: 'up-btn',
    tooltip: 'Go to the previous marker'
  },
  {
    label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 .5a.5.5 0 0 1 .5.5v11.293l3.646-3.647a.5.5 0 1 1 .708.708l-4.5 4.5a.5.5 0 0 1-.708 0l-4.5-4.5a.5.5 0 1 1-.708-.708L7.5 12.293V1a.5.5 0 0 1 .5-.5z"/>
            </svg>`,
    action: () => navigateMarkers(1),
    className: 'down-btn',
    tooltip: 'Go to the next marker'
  }
];

buttonsConfig.forEach(({ label, action, className, tooltip: tipText }) => {
  const btn = document.createElement('button');
  btn.className = className;
  btn.innerHTML = label;
  btn.addEventListener('click', action);
  btn.addEventListener('mouseenter', e => showTooltip(e, tipText));
  btn.addEventListener('mousemove', e => showTooltip(e, tipText));
  btn.addEventListener('mouseleave', hideTooltip);
  controlsContainer.appendChild(btn);
});

/********************************************
 * TOOLTIP FUNCTIONS (for control buttons)
 ********************************************/
function showTooltip(event, text) {
  tooltip.textContent = text;
  const offset = 20;
  tooltip.style.left = `${event.pageX - tooltip.offsetWidth - offset}px`;
  tooltip.style.top = `${event.pageY - offset}px`;
  tooltip.style.display = 'block';
}
function hideTooltip() {
  tooltip.style.display = 'none';
}

/********************************************
 * SCROLLABLE ELEMENT & DEBOUNCING
 ********************************************/
function getMainScrollableElement() {
  if (
    cachedScrollable &&
    document.contains(cachedScrollable) &&
    cachedScrollable.scrollHeight > cachedScrollable.clientHeight
  ) {
    return cachedScrollable;
  }
  let el = qs(CHAT_GPT_SCROLLABLE_SELECTOR);
  if (el && el.scrollHeight > el.clientHeight) {
    cachedScrollable = el;
    return el;
  }
  // Fallback: search the entire DOM (expensive, so only done once)
  const candidates = qsa('*').filter(elem => {
    const style = getComputedStyle(elem);
    const rect = elem.getBoundingClientRect();
    return (
      elem.scrollHeight > elem.clientHeight &&
      ['scroll', 'auto'].includes(style.overflowY) &&
      rect.width > 0 &&
      rect.height > 0 &&
      !elem.closest('nav') &&
      !elem.closest('#composer-background')
    );
  });
  el = candidates.sort((a, b) =>
    (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight)
  )[0] || null;
  cachedScrollable = el;
  return el;
}

let repositionTimeout;
function debounceRepositionMarkers() {
  if (repositionTimeout) clearTimeout(repositionTimeout);
  repositionTimeout = setTimeout(() => {
    repositionMarkers();
  }, 100);
}

/********************************************
 * MARKER CREATION, LABEL & DELETION
 ********************************************/
function handleCreateMarker() {
  const scrollable = getMainScrollableElement();
  if (!scrollable) return;

  if (markers.length >= MARKERS_LIMIT) {
    alert(`You can create up to ${MARKERS_LIMIT} markers!`);
    return;
  }

  const scrollPosition = scrollable.scrollTop;
  const ratio = scrollable.scrollHeight > scrollable.clientHeight
    ? scrollPosition / scrollable.scrollHeight
    : 0;

  // Prevent duplicate markers (within 5px tolerance)
  if (markers.some(m => Math.abs(m.scrollPosition - scrollPosition) < 5)) return;

  const markerEl = createMarkerElement(scrollPosition, ratio, scrollable);
  markerEl.addEventListener('click', e => {
    e.stopPropagation();
    isDeleteMode
      ? deleteMarker(markerEl)
      : scrollToPosition(scrollable, scrollPosition);
  });
  markers.push({ marker: markerEl, scrollPosition, ratio });
  updateMarkers(scrollable);
  updateDeleteButtonState();
  saveMarkersToStorage();
}

/**
 * Creates a marker element with its editable label.
 * The label (class "marker-label") supports editing with a 5-line limit.
 */
function createMarkerElement(scrollPosition, ratio, container, storedLabel = '') {
  const marker = document.createElement('button');
  marker.className = 'scroll-marker';
  marker.style.position = 'absolute';
  marker.style.top = `${ratio * 100}%`;
  marker.style.right = `${container.offsetWidth - container.clientWidth + 5}px`;
  // Always use the global marker color
  marker.style.backgroundColor = currentMarkerColor;

  const markerLabel = document.createElement('div');
  markerLabel.className = 'marker-label';
  markerLabel.textContent = storedLabel;
  markerLabel.style.display = 'none';

  const showLabel = () => markerLabel.style.display = 'block';
  const hideLabel = e => {
    if (!marker.contains(e.relatedTarget) && !markerLabel.contains(e.relatedTarget)) {
      markerLabel.style.display = 'none';
    }
  };

  marker.addEventListener('mouseenter', showLabel);
  marker.addEventListener('mouseleave', hideLabel);
  markerLabel.addEventListener('mouseenter', showLabel);
  markerLabel.addEventListener('mouseleave', hideLabel);

  markerLabel.addEventListener('click', e => {
    e.stopPropagation();
    markerLabel.contentEditable = true;
    markerLabel.focus();
  });

  // Enforce 5-line limit for marker label
  const maxLines = 5;
  markerLabel.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const lines = markerLabel.innerText.split('\n');
      if (lines.length >= maxLines) {
        e.preventDefault();
      }
    }
  });
  markerLabel.addEventListener('input', () => {
    const lines = markerLabel.innerText.split('\n');
    if (lines.length > maxLines) {
      markerLabel.innerText = lines.slice(0, maxLines).join('\n');
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(markerLabel);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
  markerLabel.addEventListener('blur', () => {
    markerLabel.contentEditable = false;
    saveMarkersToStorage();
  });

  marker.appendChild(markerLabel);
  return marker;
}

function deleteMarker(markerEl) {
  markers = markers.filter(m => m.marker !== markerEl);
  markerEl.remove();
  updateDeleteButtonState();
  saveMarkersToStorage();
}

function updateMarkers(container) {
  if (!container) return;
  markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
  qsa('.scroll-marker', container).forEach(el => el.remove());
  markers.forEach(m => container.appendChild(m.marker));
}

/********************************************
 * DELETE MODE FUNCTIONS
 ********************************************/
function toggleDeleteMode() {
  isDeleteMode = !isDeleteMode;
  const deleteBtn = qs('.delete-btn', controlsContainer);
  deleteBtn.classList.toggle('active', isDeleteMode);
  qsa('button', controlsContainer).forEach(btn => {
    if (!btn.classList.contains('delete-btn')) {
      btn.disabled = isDeleteMode;
      btn.style.opacity = isDeleteMode ? '0.5' : '1';
    }
  });
}

function updateDeleteButtonState() {
  const deleteBtn = qs('.delete-btn', controlsContainer);
  const noMarkers = markers.length === 0;
  deleteBtn.disabled = noMarkers;
  deleteBtn.style.opacity = noMarkers ? '0.5' : '1';
  if (noMarkers && isDeleteMode) {
    isDeleteMode = false;
    deleteBtn.classList.remove('active');
    qsa('button', controlsContainer).forEach(btn => {
      if (!btn.classList.contains('delete-btn')) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  }
}

/********************************************
 * MARKER NAVIGATION & SCROLL HELPERS
 ********************************************/
function navigateMarkers(direction) {
  if (!markers.length) return;
  currentMarkerIndex = (currentMarkerIndex + direction + markers.length) % markers.length;
  const scrollable = getMainScrollableElement();
  if (scrollable) {
    const { scrollPosition } = markers[currentMarkerIndex];
    if (scrollPosition < scrollable.scrollTop ||
        scrollPosition > scrollable.scrollTop + scrollable.clientHeight) {
      scrollToPosition(scrollable, scrollPosition);
    }
  }
  markers[currentMarkerIndex].marker.click();
}

function scrollToPosition(element, position) {
  element.scrollTo({ top: position, behavior: 'smooth' });
}

/********************************************
 * GET MAIN SCROLLABLE ELEMENT (with caching)
 ********************************************/
function getMainScrollableElement() {
  if (
    cachedScrollable &&
    document.contains(cachedScrollable) &&
    cachedScrollable.scrollHeight > cachedScrollable.clientHeight
  ) {
    return cachedScrollable;
  }
  let el = qs(CHAT_GPT_SCROLLABLE_SELECTOR);
  if (el && el.scrollHeight > el.clientHeight) {
    cachedScrollable = el;
    return el;
  }
  const candidates = qsa('*').filter(elem => {
    const style = getComputedStyle(elem);
    const rect = elem.getBoundingClientRect();
    return (elem.scrollHeight > elem.clientHeight &&
            ['scroll', 'auto'].includes(style.overflowY) &&
            rect.width > 0 && rect.height > 0 &&
            !elem.closest('nav') &&
            !elem.closest('#composer-background'));
  });
  el = candidates.sort((a, b) =>
         (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight)
  )[0] || null;
  cachedScrollable = el;
  return el;
}

/********************************************
 * RESET & REPOSITION FUNCTIONS
 ********************************************/
function clearMarkers() {
  const scrollable = getMainScrollableElement();
  if (scrollable) qsa('.scroll-marker', scrollable).forEach(el => el.remove());
  markers = [];
  currentMarkerIndex = 0;
  updateDeleteButtonState();
}

function repositionMarkers() {
  const scrollable = getMainScrollableElement();
  if (!scrollable) return;
  const { scrollHeight, clientHeight, offsetWidth, clientWidth } = scrollable;
  const scrollBarWidth = offsetWidth - clientWidth;
  markers.forEach(m => {
    const ratio = scrollHeight > clientHeight ? m.scrollPosition / scrollHeight : 0;
    m.ratio = ratio;
    m.marker.style.top = `${ratio * 100}%`;
    m.marker.style.right = `${scrollBarWidth + 5}px`;
    m.marker.style.backgroundColor = currentMarkerColor;
  });
  updateMarkers(scrollable);
}

/********************************************
 * DRAGGABLE CONTROLS
 ********************************************/
let isDragging = false, offsetX = 0, offsetY = 0;
controlsContainer.addEventListener('mousedown', e => {
  isDragging = true;
  const rect = controlsContainer.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  controlsContainer.classList.add('dragging');
});
document.addEventListener('mousemove', e => {
  if (isDragging) {
    controlsContainer.style.left = `${e.clientX - offsetX}px`;
    controlsContainer.style.top = `${e.clientY - offsetY}px`;
    controlsContainer.style.right = 'unset';
    controlsContainer.style.bottom = 'unset';
  }
});
document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    controlsContainer.classList.remove('dragging');
  }
});

/********************************************
 * DARK MODE DETECTION & STYLING
 ********************************************/
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}
function updateIslandStyles() {
  controlsContainer.classList.toggle('island-dark', isDarkMode());
  controlsContainer.classList.toggle('island-bright', !isDarkMode());
}
updateIslandStyles();
new MutationObserver(mutations => {
  mutations.forEach(m => {
    if (m.attributeName === 'class') updateIslandStyles();
  });
}).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

/********************************************
 * CHROME EXTENSION MESSAGING
 ********************************************/
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "hide_widget") {
    controlsContainer.style.display = "none";
  } else if (message.action === "show_widget") {
    controlsContainer.style.display = "";
  } else if (message.action === "colour_change") {
    // Update the global marker color and repaint all markers
    currentMarkerColor = message.color;
    qsa('.scroll-marker').forEach(marker => {
      marker.style.backgroundColor = currentMarkerColor;
    });
  }
});

/********************************************
 * STORAGE FUNCTIONS
 ********************************************/
function getCurrentChatUrl() {
  return window.location.href;
}

function loadMarkersForCurrentUrl(scrollable) {
  const currentUrl = getCurrentChatUrl();
  chrome.storage.sync.get([currentUrl], data => {
    const stored = data[currentUrl] || [];
    markers = [];
    stored.forEach(m => {
      const ratio = scrollable.scrollHeight > scrollable.clientHeight
        ? m.scrollPosition / scrollable.scrollHeight
        : 0;
      const markerEl = createMarkerElement(m.scrollPosition, ratio, scrollable, m.title);
      // Always use the global marker color
      markerEl.style.backgroundColor = currentMarkerColor;
      markerEl.addEventListener('click', e => {
        e.stopPropagation();
        isDeleteMode
          ? deleteMarker(markerEl)
          : scrollToPosition(scrollable, m.scrollPosition);
      });
      markers.push({ marker: markerEl, scrollPosition: m.scrollPosition, ratio });
    });
    updateMarkers(scrollable);
    updateDeleteButtonState();
  });
}

function saveMarkersToStorage() {
  const currentUrl = getCurrentChatUrl();
  // Save only scroll position and label; the marker color is global.
  const dataToStore = markers.map(m => ({
    scrollPosition: m.scrollPosition,
    title: qs('.marker-label', m.marker).textContent || ''
  }));
  chrome.storage.sync.set({ [currentUrl]: dataToStore }, () => {
    checkAndEvictIfNeeded(currentUrl);
  });
}

function checkAndEvictIfNeeded(currentUrl) {
  chrome.storage.sync.get(null, allData => {
    const keys = Object.keys(allData);
    if (keys.length > MAX_URL_ENTRIES) {
      const keyToRemove = keys[0] === currentUrl && keys.length > 1 ? keys[1] : keys[0];
      chrome.storage.sync.remove(keyToRemove);
    }
  });
}

/********************************************
 * INIT & URL CHANGE DETECTION
 ********************************************/
async function waitForMainScrollableElement() {
  const existingEl = getMainScrollableElement();
  if (existingEl) return existingEl;
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const el = getMainScrollableElement();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

async function initMarkers() {
  const scrollable = await waitForMainScrollableElement();
  // Load the global marker color from storage (in case it was updated)
  chrome.storage.local.get(["selectedColor"], (data) => {
    if (data.selectedColor) {
      currentMarkerColor = data.selectedColor;
    }
    loadMarkersForCurrentUrl(scrollable);
    new ResizeObserver(debounceRepositionMarkers).observe(scrollable);
    new MutationObserver(debounceRepositionMarkers).observe(scrollable.firstChild, { childList: true, subtree: true });
  });
}

function handleChatChange() {
  clearMarkers();
  initMarkers();
}

let currentLocation = window.location.href;
setInterval(() => {
  if (window.location.href !== currentLocation) {
    currentLocation = window.location.href;
    handleChatChange();
  }
}, 1500);

/********************************************
 * ENSURE CONTROLS & MARKERS REMAIN IN THE DOM
 ********************************************/
setInterval(() => {
  if (!document.body.contains(controlsContainer)) {
    document.body.appendChild(controlsContainer);
  }
  const scrollable = getMainScrollableElement();
  if (scrollable) {
    markers.forEach(({ marker }) => {
      if (!scrollable.contains(marker)) scrollable.appendChild(marker);
    });
  }
}, 3000);

new MutationObserver(() => {
  if (!document.body.contains(controlsContainer)) {
    document.body.appendChild(controlsContainer);
  }
}).observe(document.body, { childList: true, subtree: true });

/********************************************
 * START
 ********************************************/
initMarkers();
