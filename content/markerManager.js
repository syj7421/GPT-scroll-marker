/********************************************
 * markerManager.js
 ********************************************/

// Pull in constants and DOM utilities:
const MARKERS_LIMIT = window.MARKERS_LIMIT;
const MAX_URL_ENTRIES = window.MAX_URL_ENTRIES;
const CHAT_GPT_SCROLLABLE_SELECTOR = window.CHAT_GPT_SCROLLABLE_SELECTOR;
const qs = window.qs;
const qsa = window.qsa;
const MAX_LABEL_CHARS = 100;

/********************************************
 * INTERNAL STATE
 ********************************************/
window.markers = [];             // Holds marker objects: { marker: <DOMElement>, scrollPosition, ratio }
window.currentMarkerIndex = 0;
window.isDeleteMode = false;
window.currentMarkerColor = "#1385ff";
window.cachedScrollable = null;  // Cache for the scrollable element

/********************************************
 * SCROLLABLE ELEMENT FUNCTIONS
 ********************************************/
window.getMainScrollableElement = function() {
  // Reuse the cached element if valid
  if (
    window.cachedScrollable &&
    document.contains(window.cachedScrollable) &&
    window.cachedScrollable.scrollHeight > window.cachedScrollable.clientHeight
  ) {
    return window.cachedScrollable;
  }

  // Try your known selector first
  let el = qs(CHAT_GPT_SCROLLABLE_SELECTOR);
  if (el && el.scrollHeight > el.clientHeight) {
    window.cachedScrollable = el;
    return el;
  }

  // Fallback: search entire DOM
  const candidates = qsa('*').filter(elem => {
    const style = getComputedStyle(elem);
    const rect = elem.getBoundingClientRect();
    return (
      elem.scrollHeight > elem.clientHeight &&
      ['scroll', 'auto'].includes(style.overflowY) &&
      rect.width > 0 &&
      rect.height > 0 &&
      !elem.closest('nav') &&
      !elem.closest('#composer-background')
    );
  });
  el = candidates.sort((a, b) =>
    (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight)
  )[0] || null;
  window.cachedScrollable = el;
  return el;
};

/********************************************
 * MARKER CREATION, LABEL & DELETION
 ********************************************/
window.handleCreateMarker = function() {
  const scrollable = window.getMainScrollableElement();
  if (!scrollable) return;

  if (window.markers.length >= MARKERS_LIMIT) {
    alert(`You can create up to ${MARKERS_LIMIT} markers!`);
    return;
  }

  const scrollPosition = scrollable.scrollTop;
  const ratio = scrollable.scrollHeight > scrollable.clientHeight
    ? scrollPosition / scrollable.scrollHeight
    : 0;

  // Prevent duplicate markers (within 5px tolerance)
  if (window.markers.some(m => Math.abs(m.scrollPosition - scrollPosition) < 5)) return;

  const markerEl = createMarkerElement(scrollPosition, ratio, scrollable);
  markerEl.addEventListener('click', e => {
    e.stopPropagation();
    if (window.isDeleteMode) {
      window.deleteMarker(markerEl);
    } else {
      scrollToPosition(scrollable, scrollPosition);
    }
  });

  window.markers.push({ marker: markerEl, scrollPosition, ratio });
  window.updateMarkers(scrollable);
  window.updateDeleteButtonState(); // Called to refresh the UI state
  window.saveMarkersToStorage();
};

/**
 * Creates the marker <button> element with an editable label.
 */
function createMarkerElement(scrollPosition, ratio, container, storedLabel = '') {
  const marker = document.createElement('button');
  marker.className = 'scroll-marker';
  marker.style.position = 'absolute';
  marker.style.top = `${ratio * 100}%`;
  marker.style.right = `${container.offsetWidth - container.clientWidth + 5}px`;
  // Always use the global marker color
  marker.style.backgroundColor = window.currentMarkerColor;

  const markerLabel = document.createElement('div');
  markerLabel.className = 'marker-label';
  markerLabel.textContent = (storedLabel || '').slice(0, MAX_LABEL_CHARS);
  markerLabel.style.visibility = 'hidden';
  markerLabel.style.opacity = '0';

  const showLabel = () => { 
    // Don't show label if "Show all labels" is active
    if (window.areAllLabelsVisible) return;
    
    markerLabel.style.visibility = 'visible';
    markerLabel.style.opacity = '1';
    marker.classList.add('label-visible');
  };
  const hideLabel = (e) => {
    // Don't hide label if "Show all labels" is active
    if (window.areAllLabelsVisible) return;
    
    if (!marker.contains(e.relatedTarget) && !markerLabel.contains(e.relatedTarget)) {
      markerLabel.style.visibility = 'hidden';
      markerLabel.style.opacity = '0';
      marker.classList.remove('label-visible');
    }
  };

  marker.addEventListener('mouseenter', showLabel);
  marker.addEventListener('mouseleave', hideLabel);
  markerLabel.addEventListener('mouseenter', showLabel);
  markerLabel.addEventListener('mouseleave', hideLabel);

  // Make label editable on click
  markerLabel.addEventListener('click', e => {
    e.stopPropagation();
    markerLabel.contentEditable = true;
    markerLabel.focus();
  });

  // Enforce 5-line limit and 100-char cap
  const maxLines = 5;
  markerLabel.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const lines = markerLabel.innerText.split('\n');
      if (lines.length >= maxLines || markerLabel.innerText.length >= MAX_LABEL_CHARS) {
        e.preventDefault();
      }
    }
  });

  markerLabel.addEventListener('input', () => {
    let text = markerLabel.innerText;
    const lines = text.split('\n');
    let changed = false;
    if (lines.length > maxLines) {
      text = lines.slice(0, maxLines).join('\n');
      changed = true;
    }
    if (text.length > MAX_LABEL_CHARS) {
      text = text.slice(0, MAX_LABEL_CHARS);
      changed = true;
    }
    if (changed) {
      markerLabel.innerText = text;
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(markerLabel);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });

  markerLabel.addEventListener('blur', () => {
    markerLabel.contentEditable = false;
    window.saveMarkersToStorage();
  });

  marker.appendChild(markerLabel);
  return marker;
}

window.deleteMarker = function(markerEl) {
  window.markers = window.markers.filter(m => m.marker !== markerEl);
  markerEl.remove();
  window.updateDeleteButtonState();
  window.saveMarkersToStorage();
};

window.updateMarkers = function(container) {
  if (!container) return;
  window.markers.sort((a, b) => a.scrollPosition - b.scrollPosition);
  qsa('.scroll-marker', container).forEach(el => el.remove());
  window.markers.forEach(m => container.appendChild(m.marker));
};

/********************************************
 * MARKER NAVIGATION & SCROLL HELPERS
 ********************************************/
window.navigateMarkers = function(direction) {
  if (!window.markers.length) return;
  window.currentMarkerIndex =
    (window.currentMarkerIndex + direction + window.markers.length) %
    window.markers.length;

  const scrollable = window.getMainScrollableElement();
  if (scrollable) {
    const { scrollPosition } = window.markers[window.currentMarkerIndex];
    // Scroll if marker is off-screen
    if (
      scrollPosition < scrollable.scrollTop ||
      scrollPosition > scrollable.scrollTop + scrollable.clientHeight
    ) {
      scrollToPosition(scrollable, scrollPosition);
    }
  }
  // Force the marker's click event so the label shows
  window.markers[window.currentMarkerIndex].marker.click();
};

function scrollToPosition(element, position) {
  element.scrollTo({ top: position, behavior: 'smooth' });
}

/********************************************
 * RESET & REPOSITION
 ********************************************/
window.clearMarkers = function() {
  const scrollable = window.getMainScrollableElement();
  if (scrollable) {
    qsa('.scroll-marker', scrollable).forEach(el => el.remove());
  }
  window.markers = [];
  window.currentMarkerIndex = 0;
  window.updateDeleteButtonState();
};

window.repositionMarkers = function() {
  const scrollable = window.getMainScrollableElement();
  if (!scrollable) return;
  const { scrollHeight, clientHeight, offsetWidth, clientWidth } = scrollable;
  const scrollBarWidth = offsetWidth - clientWidth;

  window.markers.forEach(m => {
    const ratio = scrollHeight > clientHeight ? m.scrollPosition / scrollHeight : 0;
    m.ratio = ratio;
    m.marker.style.top = `${ratio * 100}%`;
    m.marker.style.right = `${scrollBarWidth + 5}px`;
    m.marker.style.backgroundColor = window.currentMarkerColor;
  });
  // Avoid removing/re-adding markers during reposition to prevent hover flicker
};

/********************************************
 * STORAGE FUNCTIONS
 ********************************************/
window.getCurrentChatUrl = function() {
  const url = window.location.href;
  if (url.includes('/c/')) {
    // Example logic if there's a "/c/" conversation path
    const parts = url.split('/c/')[1];
    const key = parts.split('?')[0].split('#')[0];
    return key;
  }
  return url;
};

window.loadMarkersForCurrentUrl = function(scrollable) {
  const currentUrl = window.getCurrentChatUrl();
  const perChatKey = `mm:${currentUrl}`;
  // Prefer local storage; migrate from sync if needed
  chrome.storage.local.get([perChatKey], localData => {
    const localStored = localData[perChatKey];
    if (Array.isArray(localStored) && localStored.length) {
      renderStoredMarkers(localStored, scrollable);
      return;
    }

    // Try migrating from sync (per-chat, markersMap, or legacy flat key)
    chrome.storage.sync.get([perChatKey, "markersMap", currentUrl], syncData => {
      const map = syncData.markersMap || {};
      let stored = syncData[perChatKey] || [];
      if (!stored.length && Array.isArray(map[currentUrl]) && map[currentUrl].length) {
        stored = map[currentUrl];
      }
      if (!stored.length && Array.isArray(syncData[currentUrl]) && syncData[currentUrl].length) {
        stored = syncData[currentUrl];
      }

      if (stored.length) {
        // Save migrated data to local and clean up sync sources
        chrome.storage.local.set({ [perChatKey]: stored });
        const toRemove = [perChatKey, currentUrl];
        const nextMap = { ...map };
        delete nextMap[currentUrl];
        const updates = {};
        if (Object.keys(nextMap).length) {
          updates.markersMap = nextMap;
        } else {
          toRemove.push('markersMap');
        }
        if (Object.keys(updates).length) chrome.storage.local.set(updates);
        chrome.storage.local.remove(toRemove);
      }

      renderStoredMarkers(stored, scrollable);
    });
  });
};

function renderStoredMarkers(stored, scrollable) {
  window.markers = [];
  (stored || []).forEach(m => {
    const ratio = scrollable.scrollHeight > scrollable.clientHeight
      ? m.scrollPosition / scrollable.scrollHeight
      : 0;

    const markerEl = createMarkerElement(m.scrollPosition, ratio, scrollable, (m.title || '').slice(0, MAX_LABEL_CHARS));
    markerEl.style.backgroundColor = window.currentMarkerColor;
    markerEl.addEventListener('click', e => {
      e.stopPropagation();
      if (window.isDeleteMode) {
        window.deleteMarker(markerEl);
      } else {
        scrollToPosition(scrollable, m.scrollPosition);
      }
    });

    window.markers.push({
      marker: markerEl,
      scrollPosition: m.scrollPosition,
      ratio
    });
  });

  window.updateMarkers(scrollable);
  window.updateDeleteButtonState();
}

window.saveMarkersToStorage = function() {
  const currentUrl = window.getCurrentChatUrl();
  const perChatKey = `mm:${currentUrl}`;
  const dataToStore = window.markers.map(m => {
    const label = qs('.marker-label', m.marker);
    return {
      scrollPosition: m.scrollPosition,
      title: label ? (label.textContent || '').slice(0, MAX_LABEL_CHARS) : ''
    };
  });

  chrome.storage.local.set({ [perChatKey]: dataToStore }, () => {
    checkAndEvictIfNeeded(currentUrl);
  });
};

function checkAndEvictIfNeeded(currentUrl) {
  chrome.storage.local.get(null, allData => {
    const mmPrefix = 'mm:';
    const mmKeys = Object.keys(allData).filter(k => k.startsWith(mmPrefix));
    if (mmKeys.length > MAX_URL_ENTRIES) {
      const currentKey = `${mmPrefix}${currentUrl}`;
      const keyToRemove = mmKeys.find(k => k !== currentKey) || mmKeys[0];
      if (keyToRemove) {
        chrome.storage.local.remove(keyToRemove);
      }
    }
  });
}

