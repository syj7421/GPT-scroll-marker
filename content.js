/********************************************
 * CONFIG & GLOBALS
 ********************************************/
const markers = [];
const markersLimit = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default marker color
const MAX_URL_ENTRIES = 50;
let repositionDebounceTimer = null; // Used to debounce repositioning

// Known ChatGPT scroll container (update if ChatGPT changes its DOM)
const CHAT_GPT_SCROLLABLE_SELECTOR = 'main .overflow-y-auto';

/********************************************
 * MAIN UI ELEMENTS (CONTROLS & TOOLTIP)
 ********************************************/
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';

// Create tooltip element if it doesn’t exist
let tooltip = document.getElementById('custom-tooltip');
if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
}

// Button configurations (using inline SVG code)
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

// Create buttons and attach event listeners
buttons.forEach(({ label, action, className, tooltip: tooltipText }) => {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = label;
    button.addEventListener('click', action);
    button.addEventListener('mouseenter', (e) => showTooltip(e, tooltipText));
    button.addEventListener('mousemove', (e) => showTooltip(e, tooltipText));
    button.addEventListener('mouseleave', hideTooltip);
    controlsContainer.appendChild(button);
});

document.body.appendChild(controlsContainer);

/********************************************
 * TOOLTIP FUNCTIONS
 ********************************************/
function showTooltip(event, text) {
    tooltip.textContent = text;
    const tooltipWidth = tooltip.offsetWidth;
    const offset = 20;
    tooltip.style.left = `${event.pageX - tooltipWidth - offset}px`;
    tooltip.style.top = `${event.pageY - offset}px`;
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
}

function hideTooltip() {
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
}

/********************************************
 * MARKER CREATION & DELETION
 ********************************************/
async function handleCreateMarker() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;

    if (markers.length >= markersLimit) {
        alert(`You can create up to ${markersLimit} markers!`);
        return;
    }

    const scrollPosition = mainScrollable.scrollTop;
    const totalScrollableHeight = mainScrollable.scrollHeight;
    const clientHeight = mainScrollable.clientHeight;

    // Avoid duplicate markers (allow a small tolerance)
    const markerExists = markers.some(m => Math.abs(m.scrollPosition - scrollPosition) < 5);
    if (markerExists) return;

    // Compute the ratio relative to the scrollable range:
    // (scrollPosition) / (scrollHeight - clientHeight)
    const ratio = totalScrollableHeight > clientHeight 
                  ? (scrollPosition / (totalScrollableHeight - clientHeight)) 
                  : 0;

    // Create marker element
    const markerElement = createMarkerElement(scrollPosition, totalScrollableHeight, clientHeight, mainScrollable);
    markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDeleteMode) {
            deleteMarker(markerElement);
        } else {
            scrollToPosition(mainScrollable, scrollPosition);
        }
    });

    markers.push({ marker: markerElement, scrollPosition, ratio });
    updateMarkers(mainScrollable);
    updateDeleteButtonState();
    await saveMarkersToStorage();
}

function deleteMarker(markerElement) {
    const idx = markers.findIndex(m => m.marker === markerElement);
    if (idx > -1) {
        markers.splice(idx, 1);
        markerElement.remove();
        updateDeleteButtonState();
        saveMarkersToStorage();
    }
}

/********************************************
 * MARKER VISUALS & UPDATING
 ********************************************/
function createMarkerElement(scrollPosition, totalScrollableHeight, clientHeight, scrollableElement, storedTitle) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';
    marker.style.position = 'absolute';

    // Create a tooltip box for entering a title
    const tooltipBox = document.createElement('div');
    tooltipBox.className = 'tooltip-box';
    tooltipBox.style.display = 'none';

    // Input field for marker title
    const inputField = document.createElement('input');
    inputField.style.backgroundColor = 'transparent';
    inputField.style.border = 'none';
    inputField.style.outline = 'none';
    inputField.type = 'text';
    inputField.placeholder = 'Enter title';
    tooltipBox.appendChild(inputField);

    // If a stored title is provided, display it instead of the input
    if (storedTitle) {
        tooltipBox.textContent = storedTitle;
        inputField.style.display = 'none';
    }

    marker.appendChild(tooltipBox);

    inputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const title = inputField.value.trim();
            if (title !== '') {
                tooltipBox.style.display = 'none';
                saveMarkerTitleToStorage(scrollPosition, title);
                marker.addEventListener('mouseenter', () => tooltipBox.style.display = 'block');
                marker.addEventListener('mouseleave', () => tooltipBox.style.display = 'none');
                tooltipBox.textContent = title;
            }
        }
    });

    // Compute the ratio relative to the scrollable range and position the marker
    const ratio = totalScrollableHeight > clientHeight 
                  ? (scrollPosition / (totalScrollableHeight - clientHeight)) 
                  : 0;
    marker.style.top = `${ratio * 100}%`;
    const scrollBarWidth = scrollableElement.offsetWidth - scrollableElement.clientWidth;
    marker.style.right = `${scrollBarWidth + 5}px`;
    marker.style.backgroundColor = currentMarkerColor;

    // Show/hide tooltip box on hover
    marker.addEventListener('mouseenter', () => tooltipBox.style.display = 'block');
    marker.addEventListener('mouseleave', () => tooltipBox.style.display = 'none');

    return marker;
}

function updateMarkers(scrollableContainer) {
    if (!scrollableContainer) return;
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
    // Remove any existing marker elements first
    scrollableContainer.querySelectorAll('.scroll-marker').forEach(el => el.remove());
    markers.forEach(({ marker }) => scrollableContainer.appendChild(marker));
}

/********************************************
 * DELETE MODE
 ********************************************/
function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    const deleteButton = controlsContainer.querySelector('.delete-btn');
    deleteButton.classList.toggle('active', isDeleteMode);
    setButtonsState(isDeleteMode);
}

function setButtonsState(disable) {
    const allButtons = controlsContainer.querySelectorAll('button');
    allButtons.forEach(btn => {
        if (!btn.classList.contains('delete-btn')) {
            btn.disabled = disable;
            btn.style.opacity = disable ? '0.5' : '1';
        }
    });
}

function updateDeleteButtonState() {
    const deleteButton = controlsContainer.querySelector('.delete-btn');
    const noMarkers = markers.length === 0;
    deleteButton.disabled = noMarkers;
    deleteButton.style.opacity = noMarkers ? '0.5' : '1';

    if (noMarkers && isDeleteMode) {
        isDeleteMode = false;
        document.body.style.cursor = 'default';
        deleteButton.classList.remove('active');
        setButtonsState(false);
    }
}

/********************************************
 * MARKER NAVIGATION
 ********************************************/
function navigateMarkers(direction) {
    if (!markers.length) return;
    currentMarkerIndex = (currentMarkerIndex + direction + markers.length) % markers.length;

    const mainScrollable = getMainScrollableElement();
    if (mainScrollable) {
        const { scrollPosition, visible } = calculateMarkerVisibility(markers[currentMarkerIndex], mainScrollable);
        if (!visible) {
            scrollToPosition(mainScrollable, scrollPosition);
        }
    }
    // Optionally trigger a click on the marker to show its tooltip
    markers[currentMarkerIndex].marker.click();
}

function calculateMarkerVisibility(markerObj, scrollableElement) {
    const { scrollPosition } = markerObj;
    const scrollTop = scrollableElement.scrollTop;
    const clientHeight = scrollableElement.clientHeight;
    const visible = (scrollPosition >= scrollTop && scrollPosition <= (scrollTop + clientHeight));
    return { scrollPosition, visible };
}

/********************************************
 * SCROLL & DOM HELPERS
 ********************************************/
function scrollToPosition(element, position) {
    element.scrollTo({ top: position, behavior: 'smooth' });
}

function getMainScrollableElement() {
    // Try the known ChatGPT selector first
    let el = document.querySelector(CHAT_GPT_SCROLLABLE_SELECTOR);
    if (el && el.scrollHeight > el.clientHeight) return el;

    // Fallback: find the largest scrollable element not inside a <nav>
    const scrollableElements = Array.from(document.querySelectorAll('*')).filter(elem => {
        const styles = getComputedStyle(elem);
        const rect = elem.getBoundingClientRect();
        return (
            elem.scrollHeight > elem.clientHeight &&
            ['scroll', 'auto'].includes(styles.overflowY) &&
            rect.height > 0 && rect.width > 0 &&
            !elem.closest('nav')
        );
    });
    const sortedElements = scrollableElements.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        const aScrollSize = a.scrollHeight - a.clientHeight;
        const bScrollSize = b.scrollHeight - b.clientHeight;
        const aVisibleArea = aRect.height * aRect.width;
        const bVisibleArea = bRect.height * bRect.width;
        return (bScrollSize - aScrollSize) || (bVisibleArea - aVisibleArea);
    });
    return sortedElements[0] || null;
}

/********************************************
 * RESET MARKERS
 ********************************************/
function clearMarkers() {
    const mainScrollable = getMainScrollableElement();
    if (mainScrollable) {
        mainScrollable.querySelectorAll('.scroll-marker').forEach(el => el.remove());
    }
    markers.length = 0;
    currentMarkerIndex = 0;
    updateDeleteButtonState();
}

/********************************************
 * DRAGGABLE CONTROLS
 ********************************************/
let isDragging = false, offsetX = 0, offsetY = 0;
controlsContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - controlsContainer.getBoundingClientRect().left;
    offsetY = e.clientY - controlsContainer.getBoundingClientRect().top;
    controlsContainer.classList.add('dragging');
});
document.addEventListener('mousemove', (e) => {
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
    const island = document.querySelector('.island');
    if (!island) return;
    if (isDarkMode()) {
        island.classList.remove('island-bright');
        island.classList.add('island-dark');
    } else {
        island.classList.remove('island-dark');
        island.classList.add('island-bright');
    }
}
updateIslandStyles();
const darkModeObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.attributeName === 'class') updateIslandStyles();
    }
});
darkModeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

/********************************************
 * CHROME EXTENSION MESSAGING
 ********************************************/
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "hide_widget") {
        const widget = document.querySelector('.island');
        if (widget) widget.style.display = "none";
    } else if (message.action === "show_widget") {
        const widget = document.querySelector('.island');
        if (widget) widget.style.display = "";
    } else if (message.action === "colour_change") {
        currentMarkerColor = message.color;
        document.querySelectorAll('.scroll-marker').forEach(marker => {
            marker.style.backgroundColor = currentMarkerColor;
        });
    }
});

/********************************************
 * SYNC STORAGE FUNCTIONS
 ********************************************/
function getCurrentChatUrl() {
    return window.location.href;
}

async function loadMarkersForCurrentUrl(mainScrollable) {
    const currentUrl = getCurrentChatUrl();
    try {
        const data = await new Promise((resolve) =>
            chrome.storage.sync.get([currentUrl], resolve)
        );
        const stored = data[currentUrl] || [];
        markers.length = 0; // Clear in-memory markers
        console.log("markers:", stored.length, stored);

        // Load user-selected marker color (if any)
        chrome.storage.sync.get(["selectedColor"], (data) => {
            if (data.selectedColor) currentMarkerColor = data.selectedColor;
        });

        stored.forEach(m => {
            const { scrollPosition, ratio, color, title } = m;
            const totalScrollableHeight = mainScrollable.scrollHeight;
            const clientHeight = mainScrollable.clientHeight;
            const markerEl = createMarkerElement(scrollPosition, totalScrollableHeight, clientHeight, mainScrollable, title);
            if (color) markerEl.style.backgroundColor = color;
            markerEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isDeleteMode) {
                    deleteMarker(markerEl);
                } else {
                    scrollToPosition(mainScrollable, scrollPosition);
                }
            });
            markers.push({ marker: markerEl, scrollPosition, ratio });
        });
        updateMarkers(mainScrollable);
        updateDeleteButtonState();
    } catch (err) {
        console.error("Error loading markers:", err);
    }
}

async function saveMarkersToStorage() {
    const currentUrl = getCurrentChatUrl();
    const toStore = markers.map(m => ({
        scrollPosition: m.scrollPosition,
        ratio: m.ratio,
        color: m.marker.style.backgroundColor,
        title: m.marker.querySelector('.tooltip-box').textContent || ''
    }));
    const dataToStore = { [currentUrl]: toStore };
    try {
        await new Promise((resolve) =>
            chrome.storage.sync.set(dataToStore, resolve)
        );
        await checkAndEvictIfNeeded(currentUrl);
    } catch (err) {
        console.error("Error saving markers:", err);
    }
}

async function saveMarkerTitleToStorage(scrollPosition, title) {
    const currentUrl = getCurrentChatUrl();
    try {
        const data = await new Promise((resolve) =>
            chrome.storage.sync.get([currentUrl], resolve)
        );
        const storedMarkers = data[currentUrl] || [];
        const markerIndex = storedMarkers.findIndex(m => Math.abs(m.scrollPosition - scrollPosition) < 5);
        if (markerIndex !== -1) {
            storedMarkers[markerIndex].title = title;
        } else {
            storedMarkers.push({ scrollPosition, title });
        }
        const dataToStore = { [currentUrl]: storedMarkers };
        await new Promise((resolve) =>
            chrome.storage.sync.set(dataToStore, resolve)
        );
    } catch (err) {
        console.error("Error saving marker title:", err);
    }
}

async function checkAndEvictIfNeeded(currentUrl) {
    try {
        const allData = await new Promise((resolve) =>
            chrome.storage.sync.get(null, resolve)
        );
        const allKeys = Object.keys(allData);
        if (allKeys.length > MAX_URL_ENTRIES) {
            // Remove the oldest key (or the second oldest if the current URL is oldest)
            const oldestUrl = allKeys[0];
            if (oldestUrl !== currentUrl) {
                await chrome.storage.sync.remove(oldestUrl);
            } else if (allKeys.length > 1) {
                await chrome.storage.sync.remove(allKeys[1]);
            }
        }
    } catch (err) {
        console.error("Error evicting old keys:", err);
    }
}

/********************************************
 * RE-INIT LOGIC
 ********************************************/
async function initOrReinitMarkers() {
    const mainScrollable = await waitForMainScrollableElement();
    await loadMarkersForCurrentUrl(mainScrollable);
    attachResizeObserver(mainScrollable);
}

function handleChatChange() {
    clearMarkers();
    initOrReinitMarkers();
}

function waitForMainScrollableElement() {
    return new Promise((resolve) => {
        const immediateCheck = getMainScrollableElement();
        if (immediateCheck) {
            console.log("Found scrollable container:", immediateCheck);
            resolve(immediateCheck);
            return;
        }
        const obs = new MutationObserver(() => {
            const el = getMainScrollableElement();
            if (el) {
                console.log("Found scrollable container via observer:", el);
                obs.disconnect();
                resolve(el);
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    });
}

/********************************************
 * ATTACH RESIZE OBSERVER
 ********************************************/
function attachResizeObserver(element) {
    if (!element) return;
    const resizeObserver = new ResizeObserver(() => {
        console.log('ResizeObserver: container resized.', element.scrollHeight);
        repositionMarkersIfNeeded();
    });
    resizeObserver.observe(element);
}

/********************************************
 * UPDATED REPOSITION FUNCTION
 * This recalculates each marker’s top position relative to the visible (client)
 * area. The formula uses:
 *   (absolute scrollPosition) / (scrollHeight - clientHeight)
 * so that if the scrollHeight increases (with clientHeight constant), the ratio
 * decreases and the marker moves upward.
 ********************************************/
function repositionMarkersIfNeeded() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;
    const newScrollHeight = mainScrollable.scrollHeight;
    const clientHeight = mainScrollable.clientHeight;
    const scrollBarWidth = mainScrollable.offsetWidth - mainScrollable.clientWidth;
    
    markers.forEach((m) => {
        // m.scrollPosition is the absolute pixel offset (unchanged)
        // Recompute ratio relative to the new scrollable range:
        const newRatio = newScrollHeight > clientHeight 
                         ? m.scrollPosition / (newScrollHeight - clientHeight) 
                         : 0;
        m.ratio = newRatio; // update stored ratio if desired
        // Update marker's top position based on the new ratio (as a percentage)
        m.marker.style.top = `${newRatio * 100}%`;
        // Update marker's right position in case the scrollbar width has changed
        m.marker.style.right = `${scrollBarWidth + 5}px`;
        // Ensure marker background color is up-to-date
        m.marker.style.backgroundColor = currentMarkerColor;
    });
    updateMarkers(mainScrollable);
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
 * START
 ********************************************/
initOrReinitMarkers();

/********************************************
 * ENSURE ISLAND STAYS IN THE DOM
 ********************************************/
function ensureIslandExists() {
    if (!document.body.contains(controlsContainer)) {
        // console.warn('Island was removed, re-adding it.');
        document.body.appendChild(controlsContainer);
    }
}

// MutationObserver to detect removal of the island
const islandObserver = new MutationObserver(() => {
    ensureIslandExists();
});
islandObserver.observe(document.body, { childList: true, subtree: true });

// Periodic check every 1 second (backup in case MutationObserver fails)
setInterval(ensureIslandExists, 1000);

/********************************************
 * ENSURE MARKERS STAY IN THE DOM
 ********************************************/
function ensureMarkersExist() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;
    // For each marker in our markers array, check if it is still a child of the container.
    markers.forEach(({ marker }) => {
        if (!mainScrollable.contains(marker)) {
            mainScrollable.appendChild(marker);
        }
    });
}

// Create a MutationObserver for the main scrollable container to monitor marker removal.
function observeMarkers() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;
    const markersObserver = new MutationObserver(() => {
        ensureMarkersExist();
    });
    markersObserver.observe(mainScrollable, { childList: true, subtree: true });
}

// Start the observer for markers.
observeMarkers();

// Also run a periodic check (backup) every 1 second.
setInterval(ensureMarkersExist, 1000);
