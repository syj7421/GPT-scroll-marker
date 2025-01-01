const hideTheWidgetBtn = document.getElementById("hide-the-widget-btn");
let isHidden = false;

// Retrieve stored state and apply it on popup load
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["selectedColor", "isWidgetHidden"], (data) => {
        // Default to #1385ff if no stored color
        const storedColor = data.selectedColor || "#1385ff";
        // Default to visible (false) if no stored state
        const widgetState = data.isWidgetHidden || false;

        // ** Remove the gradient to let the color show **
        hideTheWidgetBtn.style.backgroundImage = "none";
        hideTheWidgetBtn.style.backgroundColor = storedColor;

        // Pre-check the corresponding radio button
        const colorRadio = document.querySelector(`input[value="${storedColor}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }

        // Apply the stored widget state
        isHidden = widgetState;
        hideTheWidgetBtn.textContent = isHidden ? "Show the Widget" : "Hide the Widget";

        // Notify content script to apply the widget state on page load
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

    // Toggle the isHidden state
    isHidden = !isHidden;

    // Save the widget state in storage
    chrome.storage.local.set({ isWidgetHidden: isHidden });
});

const colorPicker = document.getElementById("color-picker");
colorPicker.addEventListener("change", (event) => {
    const selectedColor = event.target.value;

    // ** Remove the gradient to let the color show **
    hideTheWidgetBtn.style.backgroundImage = "none";
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
