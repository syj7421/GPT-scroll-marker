const markers = [];
const markersLimit = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;
let currentMarkerColor = "#1385ff"; // Default color for markers


// Initialize and render controls
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';
// Ensure the tooltip container exists
let tooltip = document.getElementById('custom-tooltip');
if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'custom-tooltip';
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
}

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

// Tooltip positioning logic
const showTooltip = (event, text) => {
    tooltip.textContent = text;

    // Position the tooltip LEFT of the cursor
    const tooltipWidth = tooltip.offsetWidth;
    const offset = 20;

    tooltip.style.left = `${event.pageX - tooltipWidth - offset}px`;
    tooltip.style.top = `${event.pageY - offset}px`;
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
};

const hideTooltip = () => {
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
};

// Add buttons dynamically
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


// Append controls container to the body
document.body.appendChild(controlsContainer);


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

    // Check if a marker with the same position already exists
    const markerExists = markers.some((m) => m.scrollPosition === scrollPosition);
    if (markerExists) {
        return;
    }

    // Create marker with the current color
    const marker = createMarkerElement(scrollPosition, totalScrollableHeight, mainScrollable);

    marker.style.backgroundColor = currentMarkerColor; // Apply the current color

    // Add click handler for delete or scroll
    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDeleteMode) {
            deleteMarker(marker); // Delete the marker in delete mode
        } else {
            scrollToPosition(mainScrollable, scrollPosition); // Scroll in normal mode
        }
    });

    markers.push({ marker, scrollPosition });
    updateMarkers(mainScrollable);
    updateDeleteButtonState();
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


function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;

    // // Update cursor based on delete mode
    // document.body.style.cursor = 'url("https://icons.iconarchive.com/icons/papirus-team/papirus-status/512/user-trash-full-icon.png") 16 16, pointer';


    // Toggle delete button active state
    const deleteButton = controlsContainer.querySelector('.delete-btn');
    deleteButton.classList.toggle('active', isDeleteMode);

    // Disable or enable other buttons
    setButtonsState(isDeleteMode);
}


// Delete a marker
function deleteMarker(markerElement) {
    const index = markers.findIndex(({ marker }) => marker === markerElement);
    if (index > -1) {
        // Remove marker from array and DOM
        markers.splice(index, 1);
        markerElement.remove();

        // Update UI and button state
        updateDeleteButtonState();
    }
}


// Disable delete button when there are no markers
function updateDeleteButtonState() {
    const deleteButton = controlsContainer.querySelector('.delete-btn');
    const noMarkers = markers.length === 0;

    deleteButton.disabled = noMarkers;
    deleteButton.style.opacity = noMarkers ? '0.5' : '1';

    // Exit delete mode if no markers are left
    if (noMarkers && isDeleteMode) {
        isDeleteMode = false;

        // Reset cursor and button states
        document.body.style.cursor = 'default';
        deleteButton.classList.remove('active');
        setButtonsState(false); // Enable all buttons
    }
}


// Navigate markers in the specified direction
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

    markers[currentMarkerIndex].marker.click();
}

// Smoothly scroll to a specified position
function scrollToPosition(element, position) {
    element.scrollTo({ top: position, behavior: 'smooth' });
}

// Retrieve the main scrollable element
function getMainScrollableElement() {
    return Array.from(document.querySelectorAll('*'))
        .filter(el => {
            const styles = getComputedStyle(el);
            return el.scrollHeight > el.clientHeight &&
                ['scroll', 'auto'].includes(styles.overflowY) &&
                !el.closest('nav');
        })
        .at(-1) || null;
}

// Retrieve the main scrollable element
function getMainScrollableElement() {
    // Get all scrollable elements
    const scrollableElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
            const styles = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                el.scrollHeight > el.clientHeight && // Element can scroll
                ['scroll', 'auto'].includes(styles.overflowY) && // Scrollable style
                rect.height > 0 && rect.width > 0 && // Element is visible
                !el.closest('nav') // Exclude nav elements
            );
        });

    // Sort elements by content height and visible area
    const sortedElements = scrollableElements.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        
        const aScrollSize = a.scrollHeight - a.clientHeight; // Scrollable content
        const bScrollSize = b.scrollHeight - b.clientHeight;

        const aVisibleArea = aRect.height * aRect.width; // Visible area
        const bVisibleArea = bRect.height * bRect.width;

        // Prioritize by scrollable content first, then visible area
        return (bScrollSize - aScrollSize) || (bVisibleArea - aVisibleArea);
    });

    return sortedElements[0] || null;
}

// Calculate the scrollable height, excluding the footer
function getEffectiveHeight(element) {
    const querybox = document.querySelector('#composer-background');
    if (!querybox) {
        return element.clientHeight; // Use clientHeight for visible area
    }

    const footerHeight = querybox.offsetHeight || 0;

    // Subtract footerHeight from clientHeight for the effective visible area
    return element.clientHeight - footerHeight;
}

// Update markers
function updateMarkers(scrollableContainer) {
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
    scrollableContainer.querySelectorAll('.scroll-marker').forEach(el => el.remove());
    markers.forEach(({ marker }) => scrollableContainer.appendChild(marker));
}


// Create a marker element
function createMarkerElement(scrollPosition, totalScrollableHeight, scrollableElement) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';

    // Position marker visually
    marker.style.position = 'absolute';
    marker.style.top = `${(scrollPosition / totalScrollableHeight) * 100}%`;

    const scrollBarWidth = scrollableElement.offsetWidth - scrollableElement.clientWidth;
    marker.style.right = `${scrollBarWidth + 5}px`;

    // Apply the current color to the marker
    marker.style.backgroundColor = currentMarkerColor;

    return marker;
}

// Create control buttons
function createControlButton(label, onClick, isDelete = false) {
    const button = document.createElement('button');
    button.className = `${label === '🗑' ? 'delete-btn' : label.toLowerCase()}-btn`;
    button.textContent = label;
    button.disabled = isDelete && markers.length === 0;
    button.style.opacity = isDelete && markers.length === 0 ? '0.5' : '1';
    button.addEventListener('click', onClick);
    return button;
}
// Reset markers on specific events
document.addEventListener('click', ({ target }) => {
    if (target.closest('nav') || target.closest('button[aria-label="New chat"]')) {
        const mainScrollable = getMainScrollableElement();
        if (mainScrollable) {
            mainScrollable.querySelectorAll('.scroll-marker').forEach(el => el.remove());
        }
        markers.length = 0;
        currentMarkerIndex = 0;
    }
});

// Calculate marker visibility
function calculateMarkerVisibility(marker, scrollableElement) {
    const { scrollPosition } = marker;
    const scrollTop = scrollableElement.scrollTop;
    const clientHeight = scrollableElement.clientHeight;

    const visibleTop = scrollTop;
    const visibleBottom = scrollTop + clientHeight;

    const visible = scrollPosition >= visibleTop && scrollPosition <= visibleBottom;

    return { scrollPosition, visible };
}

// Listen for external resets
document.addEventListener('click', ({ target }) => {
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

// Make controls draggable
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
// Function to check dark mode
function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

// Function to update styles dynamically
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

// Create and configure the MutationObserver
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.attributeName === 'class') {
            updateIslandStyles(); // Re-apply styles based on the new mode
        }
    }
});

// Start observing <html> for attribute changes
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });


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