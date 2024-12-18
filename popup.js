const hideTheWidgetBtn = document.getElementById("hide-the-widget-btn");
let isHidden = false;

// Retrieve stored state and apply it on popup load
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["selectedColor", "isWidgetHidden"], (data) => {
        const storedColor = data.selectedColor || "#1385ff"; // Default color if none is stored
        const widgetState = data.isWidgetHidden || false; // Default state is visible (false)

        hideTheWidgetBtn.style.backgroundColor = storedColor;

        // Pre-check the corresponding radio button
        const colorRadio = document.querySelector(`input[value="${storedColor}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }

        // Apply the stored widget state
        isHidden = widgetState;
        hideTheWidgetBtn.textContent = isHidden ? "Show the Widget" : "Hide the Widget";

        // Send a message to apply the widget state on page load
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: isHidden ? "hide_widget" : "show_widget" 
            });
        });
    });
});

hideTheWidgetBtn.addEventListener("click", () => {
    if (!isHidden) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "hide_widget" });
        });
        hideTheWidgetBtn.textContent = "Show the Widget";
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "show_widget" });
        });
        hideTheWidgetBtn.textContent = "Hide the Widget";
    }

    isHidden = !isHidden;

    // Save the widget state in storage
    chrome.storage.local.set({ isWidgetHidden: isHidden });
});

const colorPicker = document.getElementById("color-picker");
colorPicker.addEventListener("change", (event) => {
    const selectedColor = event.target.value;

    // Update the button background color
    hideTheWidgetBtn.style.backgroundColor = selectedColor;

    // Save the selected color in storage
    chrome.storage.local.set({ selectedColor });

    // Notify content script of the color change
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: "colour_change", 
            color: selectedColor 
        });
    });
});
