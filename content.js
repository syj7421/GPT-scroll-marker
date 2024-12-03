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


function getScrollableElement() {
    // Search for elements with scrollable content
    const candidates = document.querySelectorAll('*');
    const scrollableElements = [];
  
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if (['auto', 'scroll'].includes(style.overflowY) && el.scrollHeight > el.clientHeight) {
        scrollableElements.push(el); // Add the element to the array
      }
    }
    console.log(scrollableElements.length);
  
    // Return the first valid scrollable element or fallback
    return scrollableElements[1] || document.scrollingElement || document.body;
  }
function createMarker() {
const scrollableElement = getScrollableElement();
const scrollY = scrollableElement.scrollTop;
const scrollableHeight = scrollableElement.scrollHeight;
const viewportHeight = scrollableElement.clientHeight;
console.log('Scrollable Element:', getScrollableElement());
console.log('ScrollTop:', getScrollableElement().scrollTop);
console.log('ScrollHeight:', getScrollableElement().scrollHeight);


const markerPosition = (scrollY / scrollableHeight) * viewportHeight;

const marker = document.createElement('div');
marker.classList.add('marker');

marker.style.top = `${markerPosition}px`;
document.body.appendChild(marker);
}