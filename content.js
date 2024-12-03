const markersMap = new Map(); // Store markers for each scrollable element

function getScrollableElement() {
    const candidates = document.querySelectorAll('*');
    const scrollableElements = Array.from(candidates).filter(el => {
        const style = getComputedStyle(el);
        return ['auto', 'scroll'].includes(style.overflowY) && el.scrollHeight > el.clientHeight;
    });
    return scrollableElements.length > 0
        ? scrollableElements[scrollableElements.length - 1]
        : document.scrollingElement || document.body;
}

function createMarker() {
    const scrollableElement = getScrollableElement();
    const scrollY = scrollableElement.scrollTop;
    const scrollableHeight = scrollableElement.scrollHeight;
    const viewportHeight = scrollableElement.clientHeight;

    // Calculate the marker's position as a percentage of the scrollable content
    const markerRatio = scrollY / scrollableHeight;
    const marker = document.createElement('div');
    marker.classList.add('marker');
    marker.style.position = 'absolute';
    marker.style.left = '0'; // Adjust as needed for visual placement
    marker.dataset.ratio = markerRatio; // Store the ratio for repositioning

    // Append marker to the scrollable element
    scrollableElement.appendChild(marker);

    updateMarkerPosition(marker, scrollableElement);

    // Save marker to map for dynamic updates
    if (!markersMap.has(scrollableElement)) {
        markersMap.set(scrollableElement, []);
    }
    markersMap.get(scrollableElement).push(marker);
}

function updateMarkerPosition(marker, scrollableElement) {
    const markerRatio = parseFloat(marker.dataset.ratio);
    const viewportHeight = scrollableElement.clientHeight;
    const markerPosition = markerRatio * viewportHeight;
    marker.style.top = `${markerPosition}px`;
}

function updateAllMarkers() {
    markersMap.forEach((markers, scrollableElement) => {
        markers.forEach(marker => updateMarkerPosition(marker, scrollableElement));
    });
}

// Recalculate marker positions on window resize
window.addEventListener('resize', updateAllMarkers);

// UI Creation (Unchanged from Original Code)
const island = document.createElement('div');
const upBtn = document.createElement('button');
const downBtn = document.createElement('button');
const createMarkBtn = document.createElement('button');

upBtn.textContent = "Up";
downBtn.textContent = "Down";
createMarkBtn.textContent = "Create";

island.classList.add('island');
upBtn.classList.add('up-btn');
downBtn.classList.add('down-btn');
createMarkBtn.classList.add('create-mark');

createMarkBtn.addEventListener('click', createMarker);
island.appendChild(createMarkBtn);
island.appendChild(upBtn);
island.appendChild(downBtn);

document.body.appendChild(island);
