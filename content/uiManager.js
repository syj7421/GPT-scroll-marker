/********************************************
 * uiManager.js
 ********************************************/

window.controlsContainer = null;
window.tooltip = null;
window.areAllLabelsVisible = false;

/**
 * Initializes the floating UI container, tooltip, and control buttons.
 */
window.initUI = function() {
  // Create container if not existing
  window.controlsContainer = document.createElement('div');
  window.controlsContainer.className = 'island';
  document.body.appendChild(window.controlsContainer);

  // Tooltip element
  window.tooltip = qs('#custom-tooltip');
  if (!window.tooltip) {
    window.tooltip = document.createElement('div');
    window.tooltip.id = 'custom-tooltip';
    window.tooltip.className = 'tooltip';
    document.body.appendChild(window.tooltip);
  }

  // Button configuration
  const buttonsConfig = [
    {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 1c.552 0 1 .448 1 1v5h5c.552 0 1 .448 1 1s-.448 1-1 1H9v5c0 .552-.448 1-1 1s-1-.448-1-1V9H2c-.552 0-1-.448-1-1s.448-1 1-1h5V2c0-.552.448-1 1-1z"/>
              </svg>`,
      action: window.handleCreateMarker,
      className: 'create-btn',
      tooltip: 'Add a marker at the current position'
    },
    {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path fill="currentColor" d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
              </svg>`,
      action: window.toggleAllLabels,
      className: 'labels-btn',
      tooltip: 'Show/hide all marker labels'
    },
    {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M2.5 3a.5.5 0 0 1 .5-.5H5V1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a.5.5 0 0 1 0 1H2a.5.5 0 0 1 0-1zM3 4h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z"/>
              </svg>`,
      action: window.toggleDeleteMode,
      className: 'delete-btn',
      tooltip: 'To delete markers: Click this button, then click on the markers you want to remove!'
    },
    {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 15.5a.5.5 0 0 1-.5-.5V3.707L3.854 7.354a.5.5 0 1 1-.708-.708l4.5-4.5a.5.5 0 0 1 .708 0l4.5 4.5a.5.5 0 1 1-.708.708L8.5 3.707V15a.5.5 0 0 1-.5.5z"/>
              </svg>`,
      action: () => window.navigateMarkers(-1),
      className: 'up-btn',
      tooltip: 'Go to the previous marker'
    },
    {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 .5a.5.5 0 0 1 .5.5v11.293l3.646-3.647a.5.5 0 1 1 .708.708l-4.5 4.5a.5.5 0 0 1-.708 0l-4.5-4.5a.5.5 0 1 1-.708-.708L7.5 12.293V1a.5.5 0 0 1 .5-.5z"/>
              </svg>`,
      action: () => window.navigateMarkers(1),
      className: 'down-btn',
      tooltip: 'Go to the next marker'
    }
  ];

  buttonsConfig.forEach(({ label, action, className, tooltip: tipText }) => {
    const btn = document.createElement('button');
    btn.className = className;
    btn.innerHTML = label;
    btn.addEventListener('click', action);
    btn.addEventListener('mouseenter', e => showTooltip(e, tipText));
    btn.addEventListener('mousemove', e => showTooltip(e, tipText));
    btn.addEventListener('mouseleave', hideTooltip);
    window.controlsContainer.appendChild(btn);
  });

  // Make the container draggable
  makeContainerDraggable();
  observeDarkMode();
};

/********************************************
 * TOOLTIP
 ********************************************/
function showTooltip(event, text) {
  window.tooltip.textContent = text;
  const offset = 20;
  window.tooltip.style.left = `${event.pageX - window.tooltip.offsetWidth - offset}px`;
  window.tooltip.style.top = `${event.pageY - offset}px`;
  window.tooltip.style.display = 'block';
}
function hideTooltip() {
  window.tooltip.style.display = 'none';
}

/********************************************
 * DELETE MODE TOGGLE
 ********************************************/
window.toggleDeleteMode = function() {
  window.isDeleteMode = !window.isDeleteMode;
  const deleteBtn = qs('.delete-btn', window.controlsContainer);
  deleteBtn.classList.remove('active');
  deleteBtn.classList.toggle('active', window.isDeleteMode);

  // Disable other buttons while in delete mode
  qsa('button', window.controlsContainer).forEach(btn => {
    if (!btn.classList.contains('delete-btn')) {
      btn.disabled = window.isDeleteMode;
      btn.style.opacity = window.isDeleteMode ? '0.5' : '1';
    }
  });
  
  // If turning off delete mode, also turn off labels if they were on
  if (!window.isDeleteMode && window.areAllLabelsVisible) {
    window.toggleAllLabels();
  }
};

/**
 * Enables or disables the delete button based on marker presence.
 * Called whenever markers are added/removed.
 */
window.updateDeleteButtonState = function() {
  const deleteBtn = qs('.delete-btn', window.controlsContainer);
  const noMarkers = window.markers.length === 0;
  deleteBtn.disabled = noMarkers;
  deleteBtn.style.opacity = noMarkers ? '0.5' : '1';

  if (noMarkers && window.isDeleteMode) {
    // Turn off delete mode if we have no markers left
    window.isDeleteMode = false;
    deleteBtn.classList.remove('active');
    qsa('button', window.controlsContainer).forEach(btn => {
      if (!btn.classList.contains('delete-btn')) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  }
};

/**
 * Toggles the visibility of all marker labels on the page.
 */
window.toggleAllLabels = function() {
  const labelsBtn = qs('.labels-btn', window.controlsContainer);
  const isActive = labelsBtn.classList.contains('active');
  
  if (isActive) {
    // Hide all labels
    labelsBtn.classList.remove('active');
    window.areAllLabelsVisible = false;
    qsa('.marker-label').forEach(label => {
      label.style.visibility = 'hidden';
      label.style.opacity = '0';
    });
    qsa('.scroll-marker').forEach(marker => {
      marker.classList.remove('label-visible');
    });
  } else {
    // Show all labels
    labelsBtn.classList.add('active');
    window.areAllLabelsVisible = true;
    qsa('.marker-label').forEach(label => {
      label.style.visibility = 'visible';
      label.style.opacity = '1';
    });
    qsa('.scroll-marker').forEach(marker => {
      marker.classList.add('label-visible');
    });
  }
};

/********************************************
 * DRAGGABLE CONTAINER
 ********************************************/
function makeContainerDraggable() {
  let isDragging = false, offsetX = 0, offsetY = 0;

  window.controlsContainer.addEventListener('mousedown', e => {
    isDragging = true;
    const rect = window.controlsContainer.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    window.controlsContainer.classList.add('dragging');
  });

  document.addEventListener('mousemove', e => {
    if (isDragging) {
      window.controlsContainer.style.left = `${e.clientX - offsetX}px`;
      window.controlsContainer.style.top = `${e.clientY - offsetY}px`;
      window.controlsContainer.style.right = 'unset';
      window.controlsContainer.style.bottom = 'unset';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      window.controlsContainer.classList.remove('dragging');
    }
  });
}

/********************************************
 * DARK MODE DETECTION & STYLING
 ********************************************/
function observeDarkMode() {
  updateIslandStyles();
  new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.attributeName === 'class') updateIslandStyles();
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

function updateIslandStyles() {
  const container = window.controlsContainer;
  if (!container) return;

  const darkModeOn = document.documentElement.classList.contains('dark');
  container.classList.toggle('island-dark', darkModeOn);
  container.classList.toggle('island-bright', !darkModeOn);
}
