/********************************************
 * CONFIG & GLOBALS
 ********************************************/
const markers = [];
const MARKERS_LIMIT = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default marker color
const MAX_URL_ENTRIES = 50;

// Known ChatGPT scroll container selector
const CHAT_GPT_SCROLLABLE_SELECTOR = 'main .overflow-y-auto';

/********************************************
 * MAIN UI ELEMENTS (CONTROLS & TOOLTIP)
 ********************************************/
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';
document.body.appendChild(controlsContainer);

// Tooltip element
let tooltip = document.getElementById('custom-tooltip');
if (!tooltip) {
  tooltip = document.createElement('div');
  tooltip.id = 'custom-tooltip';
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
}

// Button configurations with inline SVG icons
const buttons = [
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

buttons.forEach(({ label, action, className, tooltip: tipText }) => {
  const button = document.createElement('button');
  button.className = className;
  button.innerHTML = label;
  button.addEventListener('click', action);
  button.addEventListener('mouseenter', e => showTooltip(e, tipText));
  button.addEventListener('mousemove', e => showTooltip(e, tipText));
  button.addEventListener('mouseleave', hideTooltip);
  controlsContainer.appendChild(button);
});

/********************************************
 * TOOLTIP FUNCTIONS
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
 * MARKER CREATION & DELETION
 ********************************************/
function handleCreateMarker() {
  const scrollable = getMainScrollableElement();
  if (!scrollable) return;

  if (markers.length >= MARKERS_LIMIT) {
    alert(`You can create up to ${MARKERS_LIMIT} markers!`);
    return;
  }

  const scrollPosition = scrollable.scrollTop;
  const totalHeight = scrollable.scrollHeight;
  const clientHeight = scrollable.clientHeight;

  // Prevent duplicate markers (within 5px tolerance)
  if (markers.some(m => Math.abs(m.scrollPosition - scrollPosition) < 5)) return;

  const ratio = totalHeight > clientHeight
    ? scrollPosition / totalHeight 
    : 0;
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

function deleteMarker(markerEl) {
  const idx = markers.findIndex(m => m.marker === markerEl);
  if (idx > -1) {
    markers.splice(idx, 1);
    markerEl.remove();
    updateDeleteButtonState();
    saveMarkersToStorage();
  }
}

/**
 * Creates a marker element.
 * @param {number} scrollPosition – The absolute scrollTop value.
 * @param {number} ratio – The computed ratio (scrollPosition / (scrollHeight - clientHeight)).
 * @param {HTMLElement} container – The scrollable container.
 * @param {string} [storedTitle=''] – Optional title to display.
 */
function createMarkerElement(scrollPosition, ratio, container, storedTitle = '') {
  const marker = document.createElement('button');
  marker.className = 'scroll-marker';
  marker.style.position = 'absolute';
  marker.style.top = `${ratio * 100}%`;
  const scrollBarWidth = container.offsetWidth - container.clientWidth;
  marker.style.right = `${scrollBarWidth + 5}px`;
  marker.style.backgroundColor = currentMarkerColor;

  // Tooltip box (for displaying a title, if any)
  const tooltipBox = document.createElement('div');
  tooltipBox.className = 'tooltip-box';
  tooltipBox.style.display = 'none';
  if (storedTitle) tooltipBox.textContent = storedTitle;
  marker.appendChild(tooltipBox);

  marker.addEventListener('mouseenter', () => tooltipBox.style.display = 'block');
  marker.addEventListener('mouseleave', () => tooltipBox.style.display = 'none');

  return marker;
}

function updateMarkers(container) {
  if (!container) return;
  // Sort markers in ascending order of scroll position.
  markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
  // Remove existing markers then reappend in sorted order.
  container.querySelectorAll('.scroll-marker').forEach(el => el.remove());
  markers.forEach(m => container.appendChild(m.marker));
}

/********************************************
 * DELETE MODE FUNCTIONS
 ********************************************/
function toggleDeleteMode() {
  isDeleteMode = !isDeleteMode;
  const deleteBtn = controlsContainer.querySelector('.delete-btn');
  deleteBtn.classList.toggle('active', isDeleteMode);
  // Disable all other buttons when in delete mode.
  controlsContainer.querySelectorAll('button').forEach(btn => {
    if (!btn.classList.contains('delete-btn')) {
      btn.disabled = isDeleteMode;
      btn.style.opacity = isDeleteMode ? '0.5' : '1';
    }
  });
}

function updateDeleteButtonState() {
  const deleteBtn = controlsContainer.querySelector('.delete-btn');
  const noMarkers = markers.length === 0;
  deleteBtn.disabled = noMarkers;
  deleteBtn.style.opacity = noMarkers ? '0.5' : '1';

  // If there are no markers, ensure delete mode is off.
  if (noMarkers && isDeleteMode) {
    isDeleteMode = false;
    deleteBtn.classList.remove('active');
    controlsContainer.querySelectorAll('button').forEach(btn => {
      if (!btn.classList.contains('delete-btn')) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  }
}

/********************************************
 * MARKER NAVIGATION
 ********************************************/
function navigateMarkers(direction) {
  if (!markers.length) return;
  currentMarkerIndex = (currentMarkerIndex + direction + markers.length) % markers.length;
  const scrollable = getMainScrollableElement();
  if (scrollable) {
    const markerObj = markers[currentMarkerIndex];
    const scrollTop = scrollable.scrollTop;
    const clientHeight = scrollable.clientHeight;
    // Scroll if the marker is not currently visible.
    if (markerObj.scrollPosition < scrollTop || markerObj.scrollPosition > scrollTop + clientHeight) {
      scrollToPosition(scrollable, markerObj.scrollPosition);
    }
  }
  // Optionally trigger the marker’s click to show its tooltip.
  markers[currentMarkerIndex].marker.click();
}

/********************************************
 * SCROLL & DOM HELPERS
 ********************************************/
function scrollToPosition(element, position) {
  element.scrollTo({ top: position, behavior: 'smooth' });
}

function getMainScrollableElement() {
  // Try the known ChatGPT selector first.
  const el = document.querySelector(CHAT_GPT_SCROLLABLE_SELECTOR);
  if (el && el.scrollHeight > el.clientHeight) return el;

  // Fallback: return the largest scrollable element not inside a <nav>.
  const candidates = Array.from(document.querySelectorAll('*')).filter(elem => {
    const style = getComputedStyle(elem);
    const rect = elem.getBoundingClientRect();
    return (elem.scrollHeight > elem.clientHeight &&
            ['scroll', 'auto'].includes(style.overflowY) &&
            rect.width > 0 && rect.height > 0 &&
            !elem.closest('nav')) && !elem.closest('#composer-background');;
  });
  return candidates.sort((a, b) =>
    (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight)
  )[0] || null;
}


/********************************************
 * RESET & REPOSITION
 ********************************************/
function clearMarkers() {
  const scrollable = getMainScrollableElement();
  if (scrollable) {
    scrollable.querySelectorAll('.scroll-marker').forEach(el => el.remove());
  }
  markers.length = 0;
  currentMarkerIndex = 0;
  updateDeleteButtonState();
}

function repositionMarkers() {

  console.log("it is called");
  const scrollable = getMainScrollableElement();
  if (!scrollable) return;
  const totalHeight = scrollable.scrollHeight;
  const clientHeight = scrollable.clientHeight;
  const scrollBarWidth = scrollable.offsetWidth - scrollable.clientWidth;
  markers.forEach(m => {
    const ratio = totalHeight > clientHeight
      ? m.scrollPosition / totalHeight 
      : 0;
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
  mutations.forEach(mutation => {
    if (mutation.attributeName === 'class') updateIslandStyles();
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
    currentMarkerColor = message.color;
    document.querySelectorAll('.scroll-marker').forEach(marker => {
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
    markers.length = 0;
    stored.forEach(m => {
      const { scrollPosition, title, color } = m;
      const totalHeight = scrollable.scrollHeight;
      const clientHeight = scrollable.clientHeight;
      const ratio = totalHeight > clientHeight
        ? scrollPosition / totalHeight
        : 0;
      const markerEl = createMarkerElement(scrollPosition, ratio, scrollable, title);
      if (color) markerEl.style.backgroundColor = color;
      markerEl.addEventListener('click', e => {
        e.stopPropagation();
        isDeleteMode
          ? deleteMarker(markerEl)
          : scrollToPosition(scrollable, scrollPosition);
      });
      markers.push({ marker: markerEl, scrollPosition, ratio });
    });
    updateMarkers(scrollable);
    updateDeleteButtonState();
  });
}

function saveMarkersToStorage() {
  const currentUrl = getCurrentChatUrl();
  const dataToStore = markers.map(m => ({
    scrollPosition: m.scrollPosition,
    color: m.marker.style.backgroundColor,
    title: m.marker.querySelector('.tooltip-box').textContent || ''
  }));
  chrome.storage.sync.set({ [currentUrl]: dataToStore }, () => {
    checkAndEvictIfNeeded(currentUrl);
  });
}

function checkAndEvictIfNeeded(currentUrl) {
  chrome.storage.sync.get(null, allData => {
    const keys = Object.keys(allData);
    if (keys.length > MAX_URL_ENTRIES) {
      // Remove the oldest key (or the second oldest if currentUrl is the oldest)
      const keyToRemove = keys[0] === currentUrl && keys.length > 1 ? keys[1] : keys[0];
      chrome.storage.sync.remove(keyToRemove);
    }
  });
}

/********************************************
 * INIT & RE-INIT LOGIC
 ********************************************/
async function initMarkers() {
  const scrollable = await waitForMainScrollableElement();
  loadMarkersForCurrentUrl(scrollable);
  new ResizeObserver(repositionMarkers).observe(scrollable);
  new MutationObserver(repositionMarkers).observe(scrollable.firstChild,  { childList: true, subtree: true });
}

function handleChatChange() {
  clearMarkers();
  initMarkers();
}

async function waitForMainScrollableElement() {
  // If the element is there, return immediately.
  const existingEl = getMainScrollableElement();
  if (existingEl) return existingEl;

  // Otherwise, wait for it to appear in the DOM.
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


/********************************************
 * URL CHANGE DETECTION
 ********************************************/
let currentLocation = window.location.href;
setInterval(() => {
  if (window.location.href !== currentLocation) {
    currentLocation = window.location.href;
    handleChatChange();
  }
}, 1000);

/********************************************
 * ENSURE ISLAND & MARKERS STAY IN THE DOM
 ********************************************/
function ensureIslandExists() {
  if (!document.body.contains(controlsContainer)) {
    document.body.appendChild(controlsContainer);
  }
}
new MutationObserver(ensureIslandExists).observe(document.body, { childList: true, subtree: true });
setInterval(ensureIslandExists, 1000);

function ensureMarkersExist() {
  const scrollable = getMainScrollableElement();
  if (!scrollable) return;
  markers.forEach(({ marker }) => {
    if (!scrollable.contains(marker)) {
      scrollable.appendChild(marker);
    }
  });
}
new MutationObserver(ensureMarkersExist).observe(getMainScrollableElement() || document.body, { childList: true, subtree: true });
setInterval(ensureMarkersExist, 1000);

/********************************************
 * START
 ********************************************/
initMarkers();
