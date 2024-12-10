function createMarker() {
    const scrollables = getScrollableElement();
    const mainPage = scrollables.at(-1); // Safely get the last element

    // Get current scroll position
    const currentScrollPosition = mainPage.scrollTop;
    console.log("Total height:", mainPage.scrollHeight);
    console.log("Current position relative to top:", currentScrollPosition);

    // Create a marker button
    const marker = document.createElement('button');
    marker.textContent = "●";
    marker.classList.add('scroll-marker');

    // Place marker proportionally based on the scroll position
    marker.style.top = `${(currentScrollPosition / (mainPage.scrollHeight - mainPage.clientHeight)) * 100}%`;

    // Add click event to teleport to the marker position
    marker.addEventListener('click', () => {
        mainPage.scrollTo({
            top: currentScrollPosition,
            behavior: 'smooth',
        });
    });

    // Insert the marker into the sorted `markers` array
    markers.push({ marker, scrollPosition: currentScrollPosition });
    markers.sort((a, b) => a.scrollPosition - b.scrollPosition); // Sort by scroll position

    // Update the DOM order of markers (optional but keeps UI consistent with array order)
    document.body.querySelectorAll('.scroll-marker').forEach((m) => m.remove());
    markers.forEach(({ marker }) => {
        document.body.appendChild(marker);
    });
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

const markers = [];
let idx = 0;

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

downBtn.addEventListener('click', () => {
    if (markers.length <= 0) {
        return;
    }
    idx = (idx + 1) % markers.length;
    markers[idx].marker.click();
});

upBtn.addEventListener('click', () => {
    if (markers.length <= 0) {
        return;
    }
    idx = (idx - 1 + markers.length) % markers.length;
    markers[idx].marker.click();
});

island.appendChild(createMarkBtn);
island.appendChild(upBtn);
island.appendChild(downBtn);
getScrollableElement();

document.body.appendChild(island);
