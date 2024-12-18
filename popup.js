const hideTheWidgetBtn = document.getElementById("hide-the-widget-btn");
let isHidden = false;

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
});

const colorPicker = document.getElementById("color-picker");
colorPicker.addEventListener("change", (event) => {
    const selectedColor = event.target.value;
    hideTheWidgetBtn.style.backgroundColor = selectedColor;
});
