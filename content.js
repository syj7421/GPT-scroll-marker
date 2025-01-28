/********************************************
 * CONFIG & GLOBALS
 ********************************************/
const markers = [];
const markersLimit = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default color for markers
const MAX_URL_ENTRIES = 50;

// Known ChatGPT scroll container (update if ChatGPT changes its DOM)
const CHAT_GPT_SCROLLABLE_SELECTOR = 'main .overflow-y-auto';

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
    if (!mainScrollable) return;  // Guard against null container

    if (markers.length >= markersLimit) {
        alert("You can create up to " + markersLimit + " markers!");
        return;
    }

    const scrollPosition = mainScrollable.scrollTop;
    const totalScrollableHeight = mainScrollable.scrollHeight;

    // Avoid duplicate markers at the same position
    const markerExists = markers.some((m) => m.scrollPosition === scrollPosition);
    if (markerExists) return;

    // Create marker
    const marker = createMarkerElement(scrollPosition, totalScrollableHeight, mainScrollable);

    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDeleteMode) {
            deleteMarker(marker);
        } else {
            scrollToPosition(mainScrollable, scrollPosition);
        }
    });

    markers.push({ marker, scrollPosition });
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
function createMarkerElement(scrollPosition, totalScrollableHeight, scrollableElement, storedTitle) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';
    marker.style.position = 'absolute';

    // Create a tooltip box for entering title
    const tooltipBox = document.createElement('div');
    tooltipBox.className = 'tooltip-box';
    tooltipBox.style.display = 'none'; // hidden by default

    // Create input field if no stored title
    const inputField = document.createElement('input');
    inputField.style.backgroundColor = 'transparent';
    inputField.style.border = 'transparent';
    inputField.style.outline = 'none';
    inputField.type = 'text';
    inputField.placeholder = 'Enter title';
    tooltipBox.appendChild(inputField);

    // If there's a stored title, show that directly
    if (storedTitle) {
        tooltipBox.textContent = storedTitle;
        inputField.style.display = 'none';
    }

    // Append tooltip box to marker
    marker.appendChild(tooltipBox);

    // Save title to storage on Enter key
    inputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const title = inputField.value.trim();
            if (title !== '') {
                tooltipBox.style.display = 'none'; // hide the tooltip
                saveMarkerTitleToStorage(scrollPosition, title);

                // Show the saved title on hover
                marker.addEventListener('mouseenter', () => {
                    tooltipBox.style.display = 'block';
                });
                marker.addEventListener('mouseleave', () => {
                    tooltipBox.style.display = 'none';
                });

                tooltipBox.textContent = title;
            }
        }
    });

    // Position and style
    marker.style.top = `${(scrollPosition / totalScrollableHeight) * 100}%`;
    const scrollBarWidth = scrollableElement.offsetWidth - scrollableElement.clientWidth;
    marker.style.right = `${scrollBarWidth + 5}px`;
    marker.style.backgroundColor = currentMarkerColor;

    // Hover events for tooltip
    marker.addEventListener('mouseenter', () => {
        tooltipBox.style.display = 'block';
    });
    marker.addEventListener('mouseleave', () => {
        tooltipBox.style.display = 'none';
    });

    return marker;
}

function updateMarkers(scrollableContainer) {
    if (!scrollableContainer) return;
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
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
    allButtons.forEach((btn) => {
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

    // Optionally, click the marker to show the tooltip or do any extra logic
    markers[currentMarkerIndex].marker.click();
}

function calculateMarkerVisibility(marker, scrollableElement) {
    const { scrollPosition } = marker;
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
    // Attempt known ChatGPT query
    let el = document.querySelector(CHAT_GPT_SCROLLABLE_SELECTOR);
    if (el && el.scrollHeight > el.clientHeight) {
        return el;
    }

    // Fallback: find the largest scrollable element that isn't inside nav
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
        if (mutation.attributeName === 'class') {
            updateIslandStyles();
        }
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
    }
    else if (message.action === "show_widget") {
        const widget = document.querySelector('.island');
        if (widget) widget.style.display = "";
    }
    else if (message.action === "colour_change") {
        currentMarkerColor = message.color;
        const scrollMarkers = document.querySelectorAll('.scroll-marker');
        scrollMarkers.forEach(marker => {
            marker.style.backgroundColor = currentMarkerColor;
        });
    }
});

/********************************************
 * SYNC STORAGE (instead of local)
 ********************************************/
function getCurrentChatUrl() {
    return window.location.href;
}

async function loadMarkersForCurrentUrl() {
    const currentUrl = getCurrentChatUrl();
    try {
        const data = await chrome.storage.sync.get([currentUrl]);
        const stored = data[currentUrl] || [];

        markers.length = 0; // Clear in-memory

        const mainScrollable = getMainScrollableElement();
        if (!mainScrollable) {
            return;
        }

        // Also load user-selected marker color (if any)
        chrome.storage.sync.get(["selectedColor"], (data) => {
            if (data.selectedColor) {
                currentMarkerColor = data.selectedColor;
            }
        });

        stored.forEach(m => {
            const { scrollPosition, ratio, color, title } = m;
            const totalScrollableHeight = mainScrollable.scrollHeight;
            const marker = createMarkerElement(scrollPosition, totalScrollableHeight, mainScrollable, title);

            if (color) {
                marker.style.backgroundColor = color;
            }

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
        await chrome.storage.sync.set(dataToStore);
        await checkAndEvictIfNeeded(currentUrl);
    } catch (err) {
        console.error("Error saving markers:", err);
    }
}

async function saveMarkerTitleToStorage(scrollPosition, title) {
    const currentUrl = getCurrentChatUrl();
    try {
        const data = await chrome.storage.sync.get([currentUrl]);
        const storedMarkers = data[currentUrl] || [];

        // Find the marker with the same scrollPosition and update its title
        const markerIndex = storedMarkers.findIndex(m => m.scrollPosition === scrollPosition);
        if (markerIndex !== -1) {
            storedMarkers[markerIndex].title = title;
        } else {
            storedMarkers.push({ scrollPosition, title });
        }

        // Save updated markers
        const dataToStore = { [currentUrl]: storedMarkers };
        await chrome.storage.sync.set(dataToStore);
    } catch (err) {
        console.error("Error saving marker title:", err);
    }
}

async function checkAndEvictIfNeeded(currentUrl) {
    try {
        const allData = await chrome.storage.sync.get(null);
        const allKeys = Object.keys(allData);

        if (allKeys.length > MAX_URL_ENTRIES) {
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
/**
 * This function:
 * 1) Waits for the main scrollable to exist
 * 2) Loads markers for the current URL
 * 3) Sets up a container observer for changes
 */
async function initOrReinitMarkers() {
    const mainScrollable = await waitForMainScrollableElement();
    // Once we have a non-null container, load
    await loadMarkersForCurrentUrl();
    listenForContainerChanges();
}

/**
 * If ChatGPT re-mounts/replaces the container, clear & re-init
 */
function listenForContainerChanges() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;

    const containerObserver = new MutationObserver(() => {
        // If container is emptied or replaced
        if (mainScrollable.children.length === 0) {
            handleChatChange();
        }
    });

    containerObserver.observe(mainScrollable, {
        childList: true,
        subtree: true,
    });
}

/**
 * Clears markers and re-initializes them.
 */
function handleChatChange() {
    clearMarkers();
    initOrReinitMarkers();
}

/**
 * Promise-based approach to wait for the container to appear.
 */
function waitForMainScrollableElement() {
    return new Promise((resolve) => {
        const immediateCheck = getMainScrollableElement();
        if (immediateCheck) {
            resolve(immediateCheck);
            return;
        }
        const obs = new MutationObserver(() => {
            const el = getMainScrollableElement();
            if (el) {
                obs.disconnect();
                resolve(el);
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
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
 * START
 ********************************************/
initOrReinitMarkers();
