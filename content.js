const markers = [];
const markersLimit = 20;
let currentMarkerIndex = 0;
let isDeleteMode = false;

// Initialize and render controls
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';

// Define buttons with their labels and actions
const buttons = [
    { label: '+', action: handleCreateMarker, className: 'create-btn' },
    { label: '🗑', action: toggleDeleteMode, className: 'delete-btn' },
    { label: '↑', action: () => navigateMarkers(-1), className: 'up-btn' },
    { label: '↓', action: () => navigateMarkers(1), className: 'down-btn' },
];


// Create and append each button
buttons.forEach(({ label, action, className }) => {
    const button = document.createElement('button');
    button.className = className; // Set button class explicitly
    button.textContent = label;
    if (className === 'delete-btn') {
        button.disabled = markers.length === 0; // Delete button starts disabled
        button.style.opacity = markers.length === 0 ? '0.5' : '1';
    }
    button.addEventListener('click', action);
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

    const marker = createMarkerElement(scrollPosition, totalScrollableHeight, mainScrollable);

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



// Toggle delete mode
function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;

    // Update cursor based on delete mode
    document.body.style.cursor = isDeleteMode
        ? 'url("https://icons.iconarchive.com/icons/papirus-team/papirus-status/512/user-trash-full-icon.png") 16 16, pointer'
        : 'default';

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
        console.log("Footer (#composer-background) does not exist.");
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
        console.log("Dark mode detected. Class updated to 'island-dark'.");
    } else {
        island.classList.remove('island-dark');
        island.classList.add('island-bright');
        console.log("Bright mode detected. Class updated to 'island-bright'.");
    }
}


// Initial check
updateIslandStyles();

// Create and configure the MutationObserver
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.attributeName === 'class') {
            console.log("Class attribute changed on <html>.");
            updateIslandStyles(); // Re-apply styles based on the new mode
        }
    }
});

// Start observing <html> for attribute changes
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
