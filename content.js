const markers = [];
let currentMarkerIndex = 0;

// Initialize and render controls
const controlsContainer = document.createElement('div');
controlsContainer.className = 'island';

['Create', 'Up', 'Down'].forEach((label, idx) => {
    const actions = [handleCreateMarker, () => navigateMarkers(-1), () => navigateMarkers(1)];
    controlsContainer.appendChild(createControlButton(label, actions[idx]));
});

document.body.appendChild(controlsContainer);

// Create a new marker at the current scroll position
function handleCreateMarker() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;

    const scrollPosition = mainScrollable.scrollTop; // Current scroll position
    const totalScrollableHeight = mainScrollable.scrollHeight; // Total scrollable content height

    // Create a marker with the correct position
    const marker = createMarkerElement(scrollPosition, totalScrollableHeight, mainScrollable);

    // Add click event to scroll to the marker's position
    marker.addEventListener('click', () => scrollToPosition(mainScrollable, scrollPosition));

    // Add marker to the list and update DOM
    markers.push({ marker, scrollPosition });
    updateMarkers(mainScrollable);
}

// Navigate markers in the specified direction
function navigateMarkers(direction) {
    if (!markers.length) return;
    currentMarkerIndex = (currentMarkerIndex + direction + markers.length) % markers.length;

    // Scroll to the marker's position
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

// Update DOM markers and sort them
function updateMarkers(scrollableContainer) {
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);

    // Remove existing markers
    scrollableContainer.querySelectorAll('.scroll-marker').forEach(el => el.remove());

    // Append sorted markers to the scrollable container
    markers.forEach(({ marker }) => scrollableContainer.appendChild(marker));
}

// Create a marker element
function createMarkerElement(scrollPosition, totalScrollableHeight, scrollableElement) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';

    // Calculate the position of the marker
    marker.style.position = 'absolute';
    marker.style.top = `${(scrollPosition / totalScrollableHeight) * 100}%`; // Relative to scroll height

    // Calculate the scroll bar width and adjust marker placement
    const scrollBarWidth = scrollableElement.offsetWidth - scrollableElement.clientWidth;
    marker.style.right = `${scrollBarWidth + 5}px`; // Place next to the scroll bar with a small offset

    return marker;
}

// Create reusable control buttons
function createControlButton(label, onClick) {
    const button = document.createElement('button');
    button.className = `${label.toLowerCase()}-btn`;
    button.textContent = label;
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

// Calculate marker visibility and position
function calculateMarkerVisibility(marker, scrollableElement) {
    const { scrollPosition } = marker;
    const scrollTop = scrollableElement.scrollTop;
    const clientHeight = scrollableElement.clientHeight;

    const visibleTop = scrollTop;
    const visibleBottom = scrollTop + clientHeight;

    const visible = scrollPosition >= visibleTop && scrollPosition <= visibleBottom;

    return { scrollPosition, visible };
}
