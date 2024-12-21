/********************************************
 * GLOBAL STATE & CONFIG
 ********************************************/
const markers = [];
const markersLimit = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default color for markers
const MAX_URL_ENTRIES = 100;       // optional limit for local storage keys

/********************************************
 * MARKER TRACK (PINNED) 
 ********************************************/
// We'll create a pinned container (markerTrack) on the right side
// Markers will be absolutely placed inside it, 
// using top = ratio * trackHeight => top = (ratio * 100)% for easy debugging.

const markerTrack = document.createElement('div');
markerTrack.className = 'marker-track';
document.body.appendChild(markerTrack);

// Basic styling for the pinned track:
markerTrack.style.position = 'fixed';
markerTrack.style.top = '60px';
markerTrack.style.right = '20px';
markerTrack.style.width = '14px';    // about the same width as markers
markerTrack.style.height = '60%';    // occupy 60% of viewport height
markerTrack.style.zIndex = '9999';   
markerTrack.style.borderRadius = '6px';
// You can give it a subtle background so you can see it:
markerTrack.style.backgroundColor = 'rgba(0,0,0,0.03)';

/********************************************
 * MAIN UI ELEMENTS (CONTROLS & TOOLTIP)
 ********************************************/
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';

let tooltip = document.getElementById('custom-tooltip');
if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
}

// Define buttons
const buttons = [
    { 
        label: `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 1c.552 0 1 .448 1 1v5h5c.552 0 1 .448 1 1s-.448 1-1 1H9v5c0 .552-.448 1-1 1s-1-.448-1-1V9H2c-.552 0-1-.448-1-1s.448-1 1-1h5V2c0-.552.448-1 1-1z"/>
            </svg>
        `,
        action: handleCreateMarker, 
        className: 'create-btn',
        tooltip: 'Add a marker at the current position' 
    },
    { 
        label: `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M2.5 3a.5.5 0 0 1 .5-.5H5V1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a.5.5 0 0 1 0 1H2a.5.5 0 0 1 0-1zM3 4h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z"/>
            </svg>
        `,
        action: toggleDeleteMode, 
        className: 'delete-btn',
        tooltip: 'Click this button to delete markers!' 
    },
    { 
        label: `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 15.5a.5.5 0 0 1-.5-.5V3.707L3.854 7.354a.5.5 0 1 1-.708-.708l4.5-4.5a.5.5 0 0 1 .708 0l4.5 4.5a.5.5 0 1 1-.708.708L8.5 3.707V15a.5.5 0 0 1-.5.5z"/>
            </svg>
        `,
        action: () => navigateMarkers(-1),
        className: 'up-btn',
        tooltip: 'Go to the previous marker' 
    },
    { 
        label: `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 .5a.5.5 0 0 1 .5.5v11.293l3.646-3.647a.5.5 0 1 1 .708.708l-4.5 4.5a.5.5 0 0 1-.708 0l-4.5-4.5a.5.5 0 1 1-.708-.708L7.5 12.293V1a.5.5 0 0 1 .5-.5z"/>
            </svg>
        `,
        action: () => navigateMarkers(1),
        className: 'down-btn',
        tooltip: 'Go to the next marker' 
    }
];

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
 * LOCAL STORAGE
 ********************************************/
function getCurrentChatUrl() {
    return window.location.href;
}

/** Load markers from local storage for the current URL. */
async function loadMarkersForCurrentUrl() {
    const currentUrl = getCurrentChatUrl();
    try {
        const data = await chrome.storage.local.get([currentUrl]);
        console.log("Loaded markers:", data[currentUrl]);
        const stored = data[currentUrl] || [];

        markers.length = 0; // Clear in-memory

        const mainScrollable = getMainScrollableElement();
        if (!mainScrollable) {
            console.log("No main scrollable found, cannot create markers yet.");
            return;
        }

        // Re-create markers from stored data
        stored.forEach(m => {
            const { scrollPosition, ratio, color } = m;
            const marker = createMarkerElement(scrollPosition, mainScrollable.scrollHeight, ratio);
            marker.style.backgroundColor = color || currentMarkerColor;

            // Add click event
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isDeleteMode) {
                    deleteMarker(marker);
                } else {
                    scrollToPosition(mainScrollable, scrollPosition);
                }
            });

            markers.push({ marker, scrollPosition, ratio });
        });

        updateMarkers();        // pin them into markerTrack
        updateDeleteButtonState();
    } catch (err) {
        console.error("Error loading markers:", err);
    }
}

/** Save markers to local storage for the current URL. */
async function saveMarkersToLocalStorage() {
    const currentUrl = getCurrentChatUrl();
    const toStore = markers.map(m => ({
        scrollPosition: m.scrollPosition,
        ratio: m.ratio,
        color: m.marker.style.backgroundColor
    }));

    const dataToStore = { [currentUrl]: toStore };
    console.log("Saving markers:", dataToStore);

    try {
        await chrome.storage.local.set(dataToStore);
        await checkAndEvictIfNeeded(currentUrl);
    } catch (err) {
        console.error("Error saving markers:", err);
    }
}

/** Evict older URLs if we exceed MAX_URL_ENTRIES. */
async function checkAndEvictIfNeeded(currentUrl) {
    try {
        const allData = await chrome.storage.local.get(null);
        const allKeys = Object.keys(allData);

        if (allKeys.length > MAX_URL_ENTRIES) {
            const oldestUrl = allKeys[0];
            if (oldestUrl !== currentUrl) {
                await chrome.storage.local.remove(oldestUrl);
            } else if (allKeys.length > 1) {
                await chrome.storage.local.remove(allKeys[1]);
            }
        }
    } catch (err) {
        console.error("Error evicting old keys:", err);
    }
}

/********************************************
 * MARKER CREATION & DELETION
 ********************************************/
/**
 * Called when user clicks "Add marker"
 * We'll store both scrollPosition & ratio
 */
function handleCreateMarker() {
    if (markers.length >= markersLimit) {
        alert("You can create up to " + markersLimit + " markers!");
        return;
    }

    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) {
        console.log("No main scrollable found. Marker not created.");
        return;
    }

    const scrollPosition = mainScrollable.scrollTop;
    const totalScrollableHeight = mainScrollable.scrollHeight;
    if (totalScrollableHeight === 0) return;

    // The ratio is how far down the user scrolled
    // e.g. scrollPosition / totalScrollableHeight
    // We do NOT clamp here, but if user is near bottom, ratio ~ 1
    const ratio = scrollPosition / totalScrollableHeight;

    // Avoid duplicates
    const alreadyExists = markers.some(m => m.scrollPosition === scrollPosition);
    if (alreadyExists) return;

    // Create the DOM element
    const marker = createMarkerElement(scrollPosition, totalScrollableHeight, ratio);
    marker.style.backgroundColor = currentMarkerColor;

    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDeleteMode) {
            deleteMarker(marker);
        } else {
            scrollToPosition(mainScrollable, scrollPosition);
        }
    });

    markers.push({ marker, scrollPosition, ratio });
    updateMarkers();
    updateDeleteButtonState();

    saveMarkersToLocalStorage();
}

/** Delete marker in-memory & DOM */
function deleteMarker(markerElement) {
    const idx = markers.findIndex(m => m.marker === markerElement);
    if (idx > -1) {
        markers.splice(idx, 1);
        markerElement.remove();
        updateDeleteButtonState();
        saveMarkersToLocalStorage();
    }
}

/********************************************
 * MARKER VISUALS & UPDATING
 ********************************************/
/**
 * The "Create marker" logic you prefer:
 * marker.style.top = (scrollPosition / totalScrollableHeight) * 100 + '%'
 * BUT we actually store ratio for reloading, so we do:
 * top = ratio * 100 + '%'
 *
 * We'll place the marker in our pinned track, not in the chat container.
 */
function createMarkerElement(scrollPosition, totalScrollableHeight, ratio) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';

    // We'll store .dataset.ratio so we can reposition them in updateMarkers()
    marker.dataset.ratio = ratio;
    return marker;
}

/**
 * Places all markers into markerTrack, setting top = ratio * 100%
 * so they're pinned in that track container.
 */
function updateMarkers() {
    // Clear existing
    markerTrack.querySelectorAll('.scroll-marker').forEach(m => m.remove());

    // Sort by ratio
    markers.sort((a, b) => a.ratio - b.ratio);

    // Re-append them in order
    markers.forEach(({ marker, ratio }) => {
        // The user-specified logic was:
        // marker.style.top = ratio * 100 + '%'
        // We'll do that now:
        marker.style.position = 'absolute';
        marker.style.right = '5px';
        marker.style.top = (ratio * 100) + '%';
        // Then add to track
        markerTrack.appendChild(marker);
    });
}

/********************************************
 * DELETE MODE & BUTTON STATES
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
        const { scrollPosition } = markers[currentMarkerIndex];
        scrollToPosition(mainScrollable, scrollPosition);
    }

    markers[currentMarkerIndex].marker.click();
}

/********************************************
 * SCROLL & DOM HELPERS
 ********************************************/
function scrollToPosition(element, position) {
    element.scrollTo({ top: position, behavior: 'smooth' });
}

function getMainScrollableElement() {
    const scrollableElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
            const styles = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                el.scrollHeight > el.clientHeight &&
                ['scroll', 'auto'].includes(styles.overflowY) &&
                rect.width > 0 && rect.height > 0
            );
        });

    const sorted = scrollableElements.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        const aScrollSize = a.scrollHeight - a.clientHeight;
        const bScrollSize = b.scrollHeight - b.clientHeight;
        const aVisibleArea = aRect.width * aRect.height;
        const bVisibleArea = bRect.width * bRect.height;

        return (bScrollSize - aScrollSize) || (bVisibleArea - aVisibleArea);
    });

    return sorted[0] || null;
}

/********************************************
 * RESET MARKERS ON SPECIFIC EVENTS
 ********************************************/
document.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.closest('nav') || target.closest('button[aria-label="New chat"]')) {
        markerTrack.querySelectorAll('.scroll-marker').forEach(m => m.remove());
        markers.length = 0;
        currentMarkerIndex = 0;
        updateDeleteButtonState();
        await loadMarkersForCurrentUrl();
    }
});

/********************************************
 * DRAGGABLE CONTROLS (ISLAND)
 ********************************************/
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

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
    if (!island) {
        console.error("Island element not found.");
        return;
    }

    if (isDarkMode()) {
        island.classList.remove('island-bright');
        island.classList.add('island-dark');
    } else {
        island.classList.remove('island-dark');
        island.classList.add('island-bright');
    }
}

// Initial check
updateIslandStyles();

// Observe for class changes on <html> (e.g. dark mode toggles)
const darkObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.attributeName === 'class') {
            updateIslandStyles();
        }
    }
});
darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

/********************************************
 * MESSAGES FROM THE CHROME EXTENSION
 ********************************************/
chrome.runtime.onMessage.addListener((msg, sender, resp) => {
    if (msg.action === "hide_widget") {
        controlsContainer.style.display = "none";
        markerTrack.style.display = "none";
    }
    else if (msg.action === "show_widget") {
        controlsContainer.style.display = "";
        markerTrack.style.display = "";
    }
    else if (msg.action === "colour_change") {
        currentMarkerColor = msg.color;
        const scrollMarkers = document.querySelectorAll('.scroll-marker');
        scrollMarkers.forEach(m => {
            m.style.backgroundColor = currentMarkerColor;
        });
    }
});

/********************************************
 * WAIT FOR MAIN SCROLLABLE, THEN INIT
 ********************************************/
function waitForMainScrollableElement() {
    return new Promise((resolve) => {
        let el = getMainScrollableElement();
        if (el) return resolve(el);

        const obs = new MutationObserver(() => {
            el = getMainScrollableElement();
            if (el) {
                obs.disconnect();
                resolve(el);
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    });
}

waitForMainScrollableElement().then(() => {
    console.log("Found main scrollable; loading markers...");
    loadMarkersForCurrentUrl();
});
