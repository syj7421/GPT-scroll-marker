// File: scrollMarkerManager.js

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

    const scrollPosition = mainScrollable.scrollTop;
    const effectiveHeight = getEffectiveHeight(mainScrollable);

    const marker = createMarkerElement(scrollPosition, effectiveHeight);
    marker.addEventListener('click', () => scrollToPosition(mainScrollable, scrollPosition));

    markers.push({ marker, scrollPosition });
    updateMarkers();
}

// Navigate markers in the specified direction
function navigateMarkers(direction) {
    if (!markers.length) return;
    currentMarkerIndex = (currentMarkerIndex + direction + markers.length) % markers.length;
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
    return element.scrollHeight - (document.querySelector('#composer-background')?.offsetHeight || 0);
}

// Update DOM markers and sort them
function updateMarkers() {
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
    document.querySelectorAll('.scroll-marker').forEach(el => el.remove());
    markers.forEach(({ marker }) => document.body.appendChild(marker));
}

// Create a marker element
function createMarkerElement(scrollPosition, effectiveHeight) {
    const marker = document.createElement('button');
    marker.className = 'scroll-marker';
    marker.style.top = `${(scrollPosition / effectiveHeight) * 100}%`;
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
        document.querySelectorAll('.scroll-marker').forEach(el => el.remove());
        markers.length = 0;
        currentMarkerIndex = 0;
    }
});
