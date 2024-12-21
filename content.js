/********************************************
 * GLOBAL STATE & CONFIG
 ********************************************/
const markers = [];
const markersLimit = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default color for markers

/********************************************
 * MAIN UI ELEMENTS (CONTROLS & TOOLTIP)
 ********************************************/
// Create container for controls (the "island")
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';

// Create (or retrieve) the tooltip
let tooltip = document.getElementById('custom-tooltip');
if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
}

// Add controls (buttons) with corresponding actions and tooltips
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
        tooltip: 'To delete markers: Click this button, then click on the markers you want to remove!' 
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

// Append buttons and set up tooltips
buttons.forEach(({ label, action, className, tooltip: tooltipText }) => {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = label;
    button.addEventListener('click', action);

    // Tooltip events
    button.addEventListener('mouseenter', (e) => showTooltip(e, tooltipText));
    button.addEventListener('mousemove', (e) => showTooltip(e, tooltipText));
    button.addEventListener('mouseleave', hideTooltip);

    controlsContainer.appendChild(button);
});

// Insert the controls container into the DOM
document.body.appendChild(controlsContainer);

/********************************************
 * TOOLTIP FUNCTIONS
 ********************************************/
function showTooltip(event, text) {
    tooltip.textContent = text;

    // Position the tooltip to the left of the cursor
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
// Create a new marker at the current scroll position
function handleCreateMarker() {
    if (markers.length >= markersLimit) {
        alert("You can create up to " + markersLimit + " markers!");
        return;
    }

    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;

    const scrollPosition = mainScrollable.scrollTop;
    const totalScrollableHeight = mainScrollable.scrollHeight;

    // Avoid duplicate markers at the same position
    const markerExists = markers.some((m) => m.scrollPosition === scrollPosition);
    if (markerExists) {
        return;
    }

    // Create marker (DOM element) with the current color
    const marker = createMarkerElement(scrollPosition, totalScrollableHeight, mainScrollable);

    // Marker click behavior
    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDeleteMode) {
            deleteMarker(marker);  // Delete in delete mode
        } else {
            scrollToPosition(mainScrollable, scrollPosition);  // Scroll in normal mode
        }
    });

    markers.push({ marker, scrollPosition });
    updateMarkers(mainScrollable);
    updateDeleteButtonState();
}

// Delete a marker
function deleteMarker(markerElement) {
    const index = markers.findIndex(({ marker }) => marker === markerElement);
    if (index > -1) {
        markers.splice(index, 1);
        markerElement.remove();
        updateDeleteButtonState();
    }
}

/********************************************
 * MARKER VISUALS & UPDATING
 ********************************************/
// Create the DOM element for a marker
function createMarkerElement(scrollPosition, totalScrollableHeight, scrollableElement) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';
    marker.style.position = 'absolute';

    // Calculate vertical position as a percentage
    marker.style.top = `${(scrollPosition / totalScrollableHeight) * 100}%`;

    // Offset from the scrollbar
    const scrollBarWidth = scrollableElement.offsetWidth - scrollableElement.clientWidth;
    marker.style.right = `${scrollBarWidth + 5}px`;

    // Apply current color
    marker.style.backgroundColor = currentMarkerColor;
    return marker;
}

// Re-inject all markers into scrollable container
function updateMarkers(scrollableContainer) {
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
    scrollableContainer.querySelectorAll('.scroll-marker').forEach(el => el.remove());
    markers.forEach(({ marker }) => scrollableContainer.appendChild(marker));
}

/********************************************
 * DELETE MODE & BUTTON STATES
 ********************************************/
function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;

    // Toggle delete button active state
    const deleteButton = controlsContainer.querySelector('.delete-btn');
    deleteButton.classList.toggle('active', isDeleteMode);

    // Disable/enable other buttons while in delete mode
    setButtonsState(isDeleteMode);
}

// Disable all but the delete button (or enable them back)
function setButtonsState(disable) {
    const allButtons = controlsContainer.querySelectorAll('button');
    allButtons.forEach((btn) => {
        if (!btn.classList.contains('delete-btn')) {
            btn.disabled = disable;
            btn.style.opacity = disable ? '0.5' : '1';
        }
    });
}

// Update the delete button state (e.g., disable if no markers)
function updateDeleteButtonState() {
    const deleteButton = controlsContainer.querySelector('.delete-btn');
    const noMarkers = markers.length === 0;

    deleteButton.disabled = noMarkers;
    deleteButton.style.opacity = noMarkers ? '0.5' : '1';

    // If we have no markers and we're in delete mode, exit delete mode
    if (noMarkers && isDeleteMode) {
        isDeleteMode = false;
        document.body.style.cursor = 'default';
        deleteButton.classList.remove('active');
        setButtonsState(false); // re-enable buttons
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

    // Trigger marker click (for any side-effects you want)
    markers[currentMarkerIndex].marker.click();
}

// Check if the marker is in the visible range
function calculateMarkerVisibility(marker, scrollableElement) {
    const { scrollPosition } = marker;
    const scrollTop = scrollableElement.scrollTop;
    const clientHeight = scrollableElement.clientHeight;
    
    const visible = scrollPosition >= scrollTop && scrollPosition <= (scrollTop + clientHeight);
    return { scrollPosition, visible };
}

/********************************************
 * SCROLL & DOM HELPERS
 ********************************************/
// Smoothly scroll to a specified position
function scrollToPosition(element, position) {
    element.scrollTo({ top: position, behavior: 'smooth' });
}

// Retrieve the main scrollable element (prioritizing largest scrollable area)
function getMainScrollableElement() {
    const scrollableElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
            const styles = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                el.scrollHeight > el.clientHeight && 
                ['scroll', 'auto'].includes(styles.overflowY) && 
                rect.height > 0 && rect.width > 0 &&
                !el.closest('nav') // exclude nav
            );
        });

    // Sort by scrollable content size, then visible area
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
 * RESET MARKERS ON SPECIFIC EVENTS
 ********************************************/
document.addEventListener('click', ({ target }) => {
    // If the user clicks navigation or "New chat", remove all markers
    if (target.closest('nav') || target.closest('button[aria-label="New chat"]')) {
        const mainScrollable = getMainScrollableElement();
        if (mainScrollable) {
            mainScrollable.querySelectorAll('.scroll-marker').forEach(el => el.remove());
        }
        markers.length = 0;
        currentMarkerIndex = 0;
        updateDeleteButtonState();
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

// Initial mode check
updateIslandStyles();

// Observe <html> for class changes (e.g., toggling dark mode)
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.attributeName === 'class') {
            updateIslandStyles();
        }
    }
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

/********************************************
 * MESSAGES FROM THE CHROME EXTENSION
 ********************************************/
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "hide_widget") {
        const widget = document.querySelector('.island');
        if (widget) {
            widget.style.display = "none";
        }
    }
    else if (message.action === "show_widget") {
        const widget = document.querySelector('.island');
        if (widget) {
            widget.style.display = "";
        }
    }
    else if (message.action === "colour_change") {
        // Update the current marker color
        currentMarkerColor = message.color;

        // Update all existing scroll markers
        const scrollMarkers = document.querySelectorAll('.scroll-marker');
        scrollMarkers.forEach(marker => {
            marker.style.backgroundColor = currentMarkerColor;
        });
    }
});
