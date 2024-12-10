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
    marker.style.top = `${(scrollPosition / effectiveHeight) * 100}%`;

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
            !el.classList.contains('navbar');
    });

    return scrollables.at(-1) || document.scrollingElement || document.body;
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
    button.classList.add(`${label.toLowerCase()}-btn`);
    button.addEventListener('click', onClick);
    return button;
}

// reset markers when other chat stream is clicked
document.querySelector('nav').addEventListener('click', (event) => {
    if (event.target.closest('nav')) {
        // Remove all elements with the class 'scroll-marker', reset 
        document.querySelectorAll('.scroll-marker').forEach(marker => marker.remove());
        markers.length = 0;
        currentMarkerIndex = 0;
    }
});

