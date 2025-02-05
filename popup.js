/********************************************
 * POPUP.JS
 ********************************************/

document.addEventListener("DOMContentLoaded", () => {
    // Retrieve stored widget state and selected color from storage
    chrome.storage.sync.get(["selectedColor", "isWidgetHidden"], (data) => {
      const storedColor = data.selectedColor || "#1385ff"; // default color
      const widgetState = data.isWidgetHidden || false;
    
      const hideTheWidgetBtn = document.getElementById("hide-the-widget-btn");
      // Remove any gradient and use the stored color
      hideTheWidgetBtn.style.backgroundImage = "none";
      hideTheWidgetBtn.style.backgroundColor = storedColor;
    
      // Pre-check the corresponding radio (if your UI has radio inputs)
      const colorRadio = document.querySelector(`input[value="${storedColor}"]`);
      if (colorRadio) {
        colorRadio.checked = true;
      }
    
      let isHidden = widgetState;
      hideTheWidgetBtn.textContent = isHidden ? "Show the Widget" : "Hide the Widget";
    
      // Send the initial widget state to the content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: isHidden ? "hide_widget" : "show_widget"
        });
      });
    
      // Toggle the widget (hide/show) on button click
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
        chrome.storage.sync.set({ isWidgetHidden: isHidden });
      });
    });
    
    // Listen for color changes (could be a color input or radio buttons)
    const colorPicker = document.getElementById("color-picker");
    colorPicker.addEventListener("change", (event) => {
      const selectedColor = event.target.value;
      const hideTheWidgetBtn = document.getElementById("hide-the-widget-btn");
    
      // Update button style with the new color
      hideTheWidgetBtn.style.backgroundImage = "none";
      hideTheWidgetBtn.style.backgroundColor = selectedColor;
    
      // Save the selected color in storage so that it persists
      chrome.storage.sync.set({ selectedColor });
    
      // Notify the content script about the color change so that all markers update
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "colour_change",
          color: selectedColor
        });
      });
    });
  });
  