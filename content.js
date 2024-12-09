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

    // Style the marker
    marker.style.position = 'absolute';
    marker.style.right = '10px'; // Position next to the scrollbar
    marker.style.top = `${(currentScrollPosition / mainPage.scrollHeight) * 100}%`; // Place it proportional to the scroll position
    marker.style.transform = 'translateY(-50%)'; // Center the marker vertically
    marker.style.zIndex = '1000'; // Ensure it's above other elements
    marker.style.cursor = 'pointer';
    marker.style.background = '#FF5722';
    marker.style.border = 'none';
    marker.style.color = '#FFF';
    marker.style.borderRadius = '50%';
    marker.style.width = '20px';
    marker.style.height = '20px';

    // Add click event to teleport to the marker position
    marker.addEventListener('click', () => {
        mainPage.scrollTo({
            top: currentScrollPosition,
            behavior: 'smooth',
        });
    });

    // Append the marker to the body (you can change this to the scrollable container if needed)
    document.body.appendChild(marker);
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
