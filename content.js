// const markersMap = new Map(); // Store markers for the main scrollable element

// function getScrollableElement() {
//     let scrollableElement = null;
//     document.querySelectorAll('*').forEach(el => {
//         if (
//             el.scrollHeight > el.clientHeight &&
//             (getComputedStyle(el).overflowY === 'scroll' || getComputedStyle(el).overflowY === 'auto')
//         ) {
//             scrollableElement = el;
//         }
//     });

//     // Fallback to document.scrollingElement or document.body
//     return scrollableElement || document.scrollingElement || document.body;
// }

// function createMarker() {
//     console.log("Marker created");
//     const scrollableElement = getScrollableElement();
//     const scrollY = scrollableElement.scrollTop;
//     const scrollableHeight = scrollableElement.scrollHeight;
//     const viewportHeight = scrollableElement.clientHeight;

//     // Calculate the marker's position as a percentage of the scrollable content
//     const markerRatio = scrollY / (scrollableHeight - viewportHeight);
//     const marker = document.createElement('div');
//     marker.classList.add('marker');
//     marker.style.position = 'fixed'; // Fixed to the viewport
//     marker.style.right = '0px'; // Adjust to be next to the scroll bar
//     marker.style.width = '8px'; // Marker width
//     marker.style.height = '8px'; // Marker height
//     marker.style.backgroundColor = 'red'; // Color for visibility
//     marker.style.borderRadius = '50%';
//     marker.dataset.ratio = markerRatio; // Store the ratio for repositioning

//     // Append marker to the document
//     document.body.appendChild(marker);

//     updateMarkerPosition(marker, scrollableElement);

//     // Save marker to map for dynamic updates
//     if (!markersMap.has(scrollableElement)) {
//         markersMap.set(scrollableElement, []);
//     }
//     markersMap.get(scrollableElement).push(marker);
// }

// function updateMarkerPosition(marker, scrollableElement) {
//     const markerRatio = parseFloat(marker.dataset.ratio); // Marker ratio of the scrollable area
//     const viewportHeight = scrollableElement.clientHeight; // Visible area height
//     const scrollBarHeight = viewportHeight / scrollableElement.scrollHeight * viewportHeight; // Actual scrollbar height

//     // Calculate position relative to the top of the scrollbar
//     const markerPosition = markerRatio * (viewportHeight - scrollBarHeight);

//     // Position marker at the top of the corresponding scrollbar position
//     marker.style.top = `${markerPosition}px`;
// }

// function updateAllMarkers() {
//     markersMap.forEach((markers, scrollableElement) => {
//         markers.forEach(marker => updateMarkerPosition(marker, scrollableElement));
//     });
// }

// // Recalculate marker positions on scroll and window resize
// window.addEventListener('scroll', updateAllMarkers);
// window.addEventListener('resize', updateAllMarkers);


function createMarker() {
    const scrollables = getScrollableElement();
    const mainPage = scrollables.at(-1); // Safely get the last element
    console.log("Total height:", mainPage.scrollHeight);
    console.log("Current position relative to top:", mainPage.scrollTop);
}

function getScrollableElement() {
    let scrollableElements = [];
    document.querySelectorAll('*').forEach(el => {
        if (
            el.scrollHeight > el.clientHeight &&
            (getComputedStyle(el).overflowY === 'scroll' || getComputedStyle(el).overflowY === 'auto')
        ) {
            // Exclude navbar if it has a unique class or identifier
            if (!el.classList.contains('navbar')) {
                scrollableElements.push(el);
            }
        }
    });

    // Fallback to document.scrollingElement or document.body
    const defaultElement = document.scrollingElement || document.body;
    return scrollableElements.length > 0 ? scrollableElements : [defaultElement];
}

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
getScrollableElement();

document.body.appendChild(island);
