const markers = [];
let currentMarkerIndex = 0;

// Create buttons and container for marker controls
const controlsContainer = document.createElement('div');
controlsContainer.classList.add('island');

const createButton = createControlButton('Create', handleCreateMarker);
const upButton = createControlButton('Up', navigateMarkers.bind(null, -1));
const downButton = createControlButton('Down', navigateMarkers.bind(null, 1));

controlsContainer.append(createButton, upButton, downButton);
document.body.appendChild(controlsContainer);

// Create marker and attach to scrollable element
function handleCreateMarker() {
    const mainScrollable = getMainScrollableElement();
    if (!mainScrollable) return;

    const scrollPosition = mainScrollable.scrollTop;
    const effectiveHeight = getEffectiveHeight(mainScrollable);

    const marker = document.createElement('button');
    marker.classList.add('scroll-marker');
    marker.style.top = `${(scrollPosition / effectiveHeight) * 100}%`; // Fixed template literal syntax

    marker.addEventListener('click', () => scrollToPosition(mainScrollable, scrollPosition));

    markers.push({ marker, scrollPosition });
    updateMarkers();
}

// Navigate between markers
function navigateMarkers(direction) {
    if (!markers.length) return;
    currentMarkerIndex = (currentMarkerIndex + direction + markers.length) % markers.length;
    markers[currentMarkerIndex].marker.click();
}

// Scroll to a specific position
function scrollToPosition(element, position) {
    element.scrollTo({ top: position, behavior: 'smooth' });
}

// Get the main scrollable element
function getMainScrollableElement() {
    const scrollables = Array.from(document.querySelectorAll('*')).filter(el => {
        const styles = getComputedStyle(el);
        return el.scrollHeight > el.clientHeight &&
            (styles.overflowY === 'scroll' || styles.overflowY === 'auto') &&
            !el.closest('nav'); // Exclude elements that are within a <nav> tag or are <nav> tags themselves
    });
    return scrollables.at(-1) || null; // Return the last scrollable element or null
}

// Calculate the effective scrollable height
function getEffectiveHeight(element) {
    const footerHeight = document.querySelector('#composer-background')?.offsetHeight || 0;
    return element.scrollHeight - footerHeight;
}

// Update markers in the DOM and ensure sorted order
function updateMarkers() {
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
    document.querySelectorAll('.scroll-marker').forEach(marker => marker.remove());
    markers.forEach(({ marker }) => document.body.appendChild(marker));
}

// Create reusable control buttons
function createControlButton(label, onClick) {
    const button = document.createElement('button');
    button.textContent = label;
    button.classList.add(`${label.toLowerCase()}-btn`); // Use backticks for template literals
    button.addEventListener('click', onClick);
    return button;
}

// Reset markers when a click occurs on a descendant of <nav> or the specific button
document.addEventListener('click', (event) => {
    const navElement = event.target.closest('nav');
    const isNewChatButton = event.target.closest('button[aria-label="New chat"]');

    if ((navElement && document.contains(navElement)) || isNewChatButton) {
        // Remove all elements with the class 'scroll-marker'
        console.log("Either a descendant of <nav> or the 'New chat' button was clicked.");
        document.querySelectorAll('.scroll-marker').forEach(marker => marker.remove());

        // Clear the markers array and reset the current marker index
        markers.length = 0; // Clear the array
        currentMarkerIndex = 0;
    }
});
