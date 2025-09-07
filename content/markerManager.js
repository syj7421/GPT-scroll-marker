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
/**
 * Marker object shape (업데이트):
 * {
 *   marker: <DOMButton>,
 *   scrollPosition: number,      // absolute px (cache)
 *   ratio: number,               // for UI top% only
 *   anchor: { type:'article', id: string } | null, // <article data-turn-id="...">
 *   localOffset: number          // px offset from article top
 * }
 */
window.markers = [];
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
 * ANCHOR HELPERS (article + local offset)
 ********************************************/

// 컨테이너 좌표계 기준 element의 top(px)
function topWithinScrollable(scrollable, el) {
  const baseTop = scrollable.getBoundingClientRect().top;
  const rectTop = el.getBoundingClientRect().top;
  return Math.round(rectTop - baseTop + scrollable.scrollTop);
}

// 스크롤탑(혹은 중앙)을 기준으로 가장 가까운 <article[data-turn-id]> 찾기
function findNearestArticle(scrollable, mode = 'top') {
  const articles = Array.from(scrollable.querySelectorAll('article[data-turn-id]'))
    .filter(a => a.offsetParent !== null && a.getBoundingClientRect().height > 0);

  if (!articles.length) return null;

  const topNow = scrollable.scrollTop;
  const ref = (mode === 'center') ? (topNow + scrollable.clientHeight / 2) : topNow;

  let best = null;
  let bestDist = Infinity;

  for (const a of articles) {
    const at = topWithinScrollable(scrollable, a);
    const d = Math.abs(at - ref);
    if (d < bestDist) {
      bestDist = d;
      best = { el: a, id: a.getAttribute('data-turn-id'), top: at, dist: d };
    }
  }
  return best; // { el, id, top, dist }
}

// 앵커 + 로컬오프셋 → 현재 절대 좌표(px) 환산
function resolveMarkerAbsoluteTop(scrollable, m) {
  if (m?.anchor?.type === 'article' && m.anchor.id) {
    const sel = `article[data-turn-id="${CSS.escape(m.anchor.id)}"]`;
    const a = scrollable.querySelector(sel);
    if (a) {
      const aTop = topWithinScrollable(scrollable, a);
      const offset = Number.isFinite(m.localOffset) ? m.localOffset : 0;
      return Math.max(0, aTop + offset);
    }
  }
  // 폴백: 앵커를 못 찾을 때(아직 lazy-load 전 등) 최근 캐시/구버전 절대값 사용
  return m?.scrollPosition || 0;
}

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

  // 가장 가까운 article 앵커와 로컬 오프셋(px)
  const nearest = findNearestArticle(scrollable, 'top');
  const anchor = nearest ? { type: 'article', id: nearest.id } : null;
  const localOffset = nearest ? (scrollPosition - nearest.top) : 0;

  const ratio = scrollable.scrollHeight > scrollable.clientHeight
    ? scrollPosition / scrollable.scrollHeight
    : 0;

  // Prevent duplicate markers (within 5px tolerance) - 절대좌표 기준
  if (window.markers.some(m => Math.abs(m.scrollPosition - scrollPosition) < 5)) return;

  const markerEl = createMarkerElement(scrollPosition, ratio, scrollable);
  markerEl.addEventListener('click', e => {
    e.stopPropagation();
    if (window.isDeleteMode) {
      window.deleteMarker(markerEl);
    } else {
      const entry = window.markers.find(m => m.marker === markerEl);
      const target = resolveMarkerAbsoluteTop(scrollable, entry);
      scrollToPosition(scrollable, target);
    }
  });

  window.markers.push({ marker: markerEl, scrollPosition, ratio, anchor, localOffset });
  window.updateMarkers(scrollable);
  window.updateDeleteButtonState();
  window.updateLabelsButtonState(); 
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
    if (window.areAllLabelsVisible) return;
    markerLabel.style.visibility = 'visible';
    markerLabel.style.opacity = '1';
    marker.classList.add('label-visible');
  };
  const hideLabel = (e) => {
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
  window.updateLabelsButtonState(); 
  window.saveMarkersToStorage();
};

window.updateMarkers = function(container) {
  if (!container) return;
  // 표시용 정렬은 절대 좌표 캐시 기준
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
    const entry = window.markers[window.currentMarkerIndex];
    const scrollPosition = resolveMarkerAbsoluteTop(scrollable, entry);

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
  window.updateLabelsButtonState(); 
};

window.repositionMarkers = function() {
  const scrollable = window.getMainScrollableElement();
  if (!scrollable) return;
  const { scrollHeight, clientHeight, offsetWidth, clientWidth } = scrollable;
  const scrollBarWidth = offsetWidth - clientWidth;

  window.markers.forEach(m => {
    // ★ 앵커 기반으로 현재 절대 좌표 재산출 (핵심)
    m.scrollPosition = resolveMarkerAbsoluteTop(scrollable, m);

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
    chrome.storage.local.get([perChatKey, "markersMap", currentUrl], syncData => {
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
    // 앵커가 있으면 현재 레이아웃 기준 절대 좌표로 복원
    let sp = resolveMarkerAbsoluteTop(scrollable, {
      anchor: m.anchor || null,
      localOffset: m.localOffset || 0,
      scrollPosition: m.scrollPosition || 0
    });

    const ratio = scrollable.scrollHeight > scrollable.clientHeight
      ? sp / scrollable.scrollHeight
      : 0;

    const markerEl = createMarkerElement(sp, ratio, scrollable, (m.title || '').slice(0, MAX_LABEL_CHARS));
    markerEl.style.backgroundColor = window.currentMarkerColor;
    markerEl.addEventListener('click', e => {
      e.stopPropagation();
      if (window.isDeleteMode) {
        window.deleteMarker(markerEl);
      } else {
        const entry = window.markers.find(x => x.marker === markerEl);
        const target = resolveMarkerAbsoluteTop(scrollable, entry);
        scrollToPosition(scrollable, target);
      }
    });

    window.markers.push({
      marker: markerEl,
      scrollPosition: sp,
      ratio,
      anchor: m.anchor || null,
      localOffset: m.localOffset || 0
    });
  });

  window.updateMarkers(scrollable);
  window.updateDeleteButtonState();
  window.updateLabelsButtonState(); 
}

window.saveMarkersToStorage = function() {
  const currentUrl = window.getCurrentChatUrl();
  const perChatKey = `mm:${currentUrl}`;
  const dataToStore = window.markers.map(m => {
    const label = qs('.marker-label', m.marker);
    return {
      scrollPosition: m.scrollPosition, // cache/compat
      anchor: m.anchor || null,
      localOffset: Number.isFinite(m.localOffset) ? m.localOffset : 0,
      title: label ? (label.textContent || '').slice(0, MAX_LABEL_CHARS) : ''
    };
  });
  try {
    chrome.storage?.local?.set({ [perChatKey]: dataToStore }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Storage error:', chrome.runtime.lastError);
      } else {
        checkAndEvictIfNeeded(currentUrl);
      }
    });
  } catch (err) {
    console.warn('Extension context invalidated:', err);
  }
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
