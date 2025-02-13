# ChatGPT Scroll Marker Chrome Extension

## Try it out!
Click this link to download this Chrome Extension:
[GPT Scroll Marker - Chrome Web Store
](https://chromewebstore.google.com/detail/gpt-scroll-marker/iimeacnpfifgmoliimmpannigpfiielk)
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/SbCpyCoVo10/0.jpg)](https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID_HERE)



## Why This Extension?
ChatGPT conversations often get lengthy, making it difficult to revisit key insights or references from past interactions. Manually scrolling back is frustrating and inefficient. This extension provides an easy way to mark important sections in your chat and instantly jump to them later, saving time and improving workflow.

## Challenges & Solution
### The Problem
- ChatGPT lacks a built-in bookmarking or navigation system.
- Users must manually scroll to find past messages.
- Conversations reset when switching between chats, losing important references.

### How This Extension Solves It
- Inline Bookmarking – Add markers at specific messages for quick access.
- One-Click Navigation – Click a marker to jump instantly to the saved position.
- Per-Conversation Storage – Markers persist per chat session, so you don’t lose references when switching between conversations.

## What I Learned
- DOM Manipulation – Dynamically identifying and updating markers inside ChatGPT’s scrollable chat area.
- Chrome Extension APIs – Using chrome.storage.sync to ensure markers persist across devices.
- UX/UI Design – Developing an intuitive, non-intrusive interface with tooltips, draggable controls, and a delete mode.

## Key Features
### Unique Aspects
1. Per-Conversation Markers
  - Detects a unique URL key for each ChatGPT chat, ensuring that markers are saved only for that specific conversation.
2. Cloud Sync Across Devices
  - Uses chrome.storage.sync to keep markers stored across multiple Chrome browsers, making them available on any device.
3. Effortless Navigation
  - Click markers to scroll instantly to saved positions.
  - Edit labels (up to 5 lines) for quick reference.
  - One-click delete mode to remove unwanted markers.

### Additional Enhancements
- Marker Limit & Storage – Up to 20 markers per conversation and 50 stored URLs.
- Automatic Repositioning – Markers automatically adjust when content changes or the window resizes.
- Draggable Controls – Move the control panel anywhere on the screen.
- Dark Mode Awareness – The UI adapts to ChatGPT’s dark mode for a seamless look.

## Tools Used
- Vanilla JavaScript
- CSS
