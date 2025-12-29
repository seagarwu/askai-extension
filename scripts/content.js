console.log("[Content] content.js started.");
if (!window.hasAskAIInjected) {
    window.hasAskAIInjected = true;

/**
 * Content file that gets injected into the browser
 */
console.log("[Content] this is content script")



window.lastRightClickPosition = window.lastRightClickPosition || { x: 0, y: 0 };

document.addEventListener('contextmenu', function(event) {
    window.lastRightClickPosition = { x: event.clientX, y: event.clientY };
});

function createPopup(pageUrl, selectionText, position) {
    // Inject highlight.js CSS
    const highlightCssUrl = chrome.runtime.getURL('styles/github-dark.min.css');
    if (!document.querySelector(`link[href="${highlightCssUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = highlightCssUrl;
        document.head.appendChild(link);
    }
    // Combine context for AI and for saving, to avoid changing storage structure.
    let contextText = selectionText ? `URL: ${pageUrl}

${selectionText}` : pageUrl;

    let conversationHistory = [];
    let currentConversationId = null;
    // Add basic CSS for Markdown lists
    const style = document.createElement('style');
    style.textContent = `
        #myPopup ul,
        #myPopup ol {
            list-style-type: disc;
            margin-left: 20px;
            padding-left: 0;
        }
        #myPopup ol {
            list-style-type: decimal;
        }
        #myPopup li {
            margin-bottom: 5px;
        }
        .chat-label {
            font-size: 1.1em;
            color: #CC5500; /* 更深的橘色 */
        }
        .history-dropdown {
            display: none;
            position: absolute;
            background-color: #f9f9f9;
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
            z-index: 100000;
            border: 1px solid #ddd;
            max-height: 200px;
            overflow-y: auto;
        }
        .history-item {
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #000;
        }
        .history-item:hover {
            background-color: #f1f1f1;
        }
        .delete-history-item {
            color: #aaa;
            font-weight: bold;
            margin-left: 10px;
        }
        .delete-history-item:hover {
            color: #000;
        }
    `;
    document.head.appendChild(style);

    var popup = document.createElement("div");
    const defaultPopupWidth = Math.round(window.innerWidth / 2);
    const defaultPopupHeight = 450;
    popup.style.width = defaultPopupWidth + "px"; // Initial width for centering calculation
    popup.style.height = defaultPopupHeight + "px"; // Initial height for centering calculation
    popup.style.position = "fixed";
    // Calculate center position
    const centerX = (window.innerWidth - parseInt(popup.style.width, 10)) / 2;
    const centerY = (window.innerHeight - parseInt(popup.style.height, 10)) / 2;
    popup.style.top = centerY + "px";
    popup.style.left = centerX + "px";
    popup.style.backgroundColor = "#fafafa";
    popup.style.border = "1px solid #000";
    popup.style.padding = "0"; // 移除 padding
    popup.style.color = "#000";
    popup.style.maxHeight = "600px";
    popup.style.maxWidth = window.innerWidth + "px";
    popup.style.minWidth = "350px"; // Ensure a minimum width for usability
    popup.style.overflow = "hidden"; // 設置為 hidden
    popup.style.zIndex = "9999";
    popup.style.resize = "both";
    popup.style.display = "flex"; // 新增 flex 佈局
    popup.style.flexDirection = "row"; // 設置為水平方向
    popup.style.boxSizing = "border-box"; // 確保 padding 和 border 不影響寬高

    function centerPopup() {
        const rect = popup.getBoundingClientRect();
        const left = Math.max(0, (window.innerWidth - rect.width) / 2);
        const top = Math.max(0, (window.innerHeight - rect.height) / 2);
        popup.style.left = left + "px";
        popup.style.top = top + "px";
    }

    const minPopupWidth = 350;
    const minPopupHeight = 300;
    const maxPopupHeight = 600;
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function applyPopupSize(width, height) {
        if (Number.isFinite(width)) {
            const clampedWidth = clamp(Math.round(width), minPopupWidth, window.innerWidth);
            popup.style.width = clampedWidth + "px";
        }
        if (Number.isFinite(height)) {
            const clampedHeight = clamp(Math.round(height), minPopupHeight, maxPopupHeight);
            popup.style.height = clampedHeight + "px";
        }
        centerPopup();
    }

    chrome.storage.local.get(['popupWidth', 'popupHeight'], (result) => {
        if (Number.isFinite(result.popupWidth) || Number.isFinite(result.popupHeight)) {
            const width = Number.isFinite(result.popupWidth) ? result.popupWidth : defaultPopupWidth;
            const height = Number.isFinite(result.popupHeight) ? result.popupHeight : defaultPopupHeight;
            applyPopupSize(width, height);
        }
    });
    
    // Create a scrollable body for context, model select, and chat history
    var scrollableBody = document.createElement("div");
    scrollableBody.style.flexGrow = "1";
    scrollableBody.style.overflow = "auto";
    scrollableBody.style.padding = "10px"; // Apply padding here
    scrollableBody.style.minHeight = "0"; // Allow flex child to shrink without forcing overflow

    // Create a Popup div
    var contextDisplay = document.createElement("div");
    scrollableBody.appendChild(contextDisplay); // Append to scrollableBody

    // --- New Helper Function for Rendering Context ---
    function renderContextArea(url, selection) {
        contextDisplay.innerHTML = ''; // Clear previous content

        if (!url) return;

        const urlLink = document.createElement('a');
        urlLink.href = url;
        urlLink.textContent = url;
        urlLink.target = '_blank';
        urlLink.style.display = 'block';
        urlLink.style.wordBreak = 'break-all';
        contextDisplay.appendChild(urlLink);

        if (selection) {
            const separator = document.createElement('hr');
            separator.style.margin = '10px 0';
            contextDisplay.appendChild(separator);

            const selectionDiv = document.createElement('div');
            if (window.marked) {
                selectionDiv.innerHTML = window.marked.parse(selection, { breaks: true });
            } else {
                selectionDiv.textContent = selection;
            }
            contextDisplay.appendChild(selectionDiv);
        }
    }
    // --- End of Helper Function ---

    // Initial render on popup creation
    renderContextArea(pageUrl, selectionText);

    
    popup.classList.add("askai-popup");

    // Create a model selection dropdown
    var modelSelect = document.createElement("select");
    modelSelect.id = "modelSelect";
    var option1 = document.createElement("option");
    option1.value = "gpt-3.5-turbo";
    option1.textContent = "GPT-3.5 Turbo";
    modelSelect.appendChild(option1);
    var option2 = document.createElement("option");
    option2.value = "gpt-3.5-turbo-16k";
    option2.textContent = "GPT-3.5 Turbo 16k";
    modelSelect.appendChild(option2);
    var option3 = document.createElement("option");
    option3.value = "gemini-2.5-flash";
    option3.textContent = "Gemini 2.5 Flash";
    modelSelect.appendChild(option3);
    var option4 = document.createElement("option");
    option4.value = "gemini-2.5-flash-lite";
    option4.textContent = "Gemini 2.5 Flash Lite";
    modelSelect.appendChild(option4);
    modelSelect.value = "gemini-2.5-flash-lite";
    modelSelect.style.backgroundColor = "#3b2828ff"; // 固定背景顏色為白色
    modelSelect.style.color = "#000000"; // 固定字體顏色為黑色
    scrollableBody.appendChild(modelSelect);

    const defaultQuestion = "請翻譯成繁體中文。";

    // Create a container for the input and button
    var inputContainer = document.createElement("div");
    inputContainer.style.position = "relative"; // For positioning the dropdown
    inputContainer.style.display = "flex";
    inputContainer.style.width = "100%";
    inputContainer.style.gap = "5px";
    inputContainer.style.padding = "10px"; // 將原先 popup 的 padding 轉移到這裡
    inputContainer.style.borderTop = "1px solid #eee"; // 可選：增加一個上邊框
    inputContainer.style.flexShrink = "0"; // Keep Send button visible in tight layouts
    inputContainer.style.boxSizing = "border-box"; // Prevent padding from overflowing container width

    // Create a text input
    var textField = document.createElement("input");
    textField.type = "text";
    textField.id = "myTextField";
    textField.placeholder = defaultQuestion;
    textField.style.flexGrow = "1";
    textField.style.minWidth = "0"; // Allow input to shrink without clipping the button
    textField.style.backgroundColor = "#ffffff"; // 固定背景顏色為白色
    textField.style.color = "#000000"; // 固定字體顏色為黑色
    textField.autocomplete = "off";
    inputContainer.appendChild(textField);

    // Create the custom history dropdown
    const historyDropdown = document.createElement('div');
    historyDropdown.className = 'history-dropdown';
    inputContainer.appendChild(historyDropdown);

    // Create a button to search
    var button = document.createElement("button");
    button.textContent = "Send";
    inputContainer.appendChild(button);
    textField.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            button.click();
        }
    });

    textField.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent any parent click listeners from interfering
        if (historyDropdown.style.display === 'block') {
            historyDropdown.style.display = 'none';
            popup.style.overflow = 'hidden';
            if (rightPanel) rightPanel.style.overflow = 'hidden'; // Restore clipping
        } else {
            populateHistoryDropdown();
        }
    });

    function populateHistoryDropdown(filter = '') {
        chrome.storage.local.get(['inputHistory'], (result) => {
            const history = result.inputHistory || [];
            historyDropdown.innerHTML = '';
            const filteredHistory = history.filter(item => item.toLowerCase().includes(filter.toLowerCase()));

            if (filteredHistory.length > 0) {
                popup.style.overflow = 'visible'; // Allow dropdown to show
                if (rightPanel) rightPanel.style.overflow = 'visible'; // Also allow right panel to show overflow
                historyDropdown.style.display = 'block';
                // Position the dropdown just below the text field
                historyDropdown.style.top = `${textField.offsetTop + textField.offsetHeight}px`;
                historyDropdown.style.left = `${textField.offsetLeft}px`;
                historyDropdown.style.width = `${textField.offsetWidth}px`;
            } else {
                historyDropdown.style.display = 'none';
                popup.style.overflow = 'hidden'; // Restore clipping
                if (rightPanel) rightPanel.style.overflow = 'hidden'; // Restore clipping
                return;
            }

            filteredHistory.forEach(itemText => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'history-item';

                const textSpan = document.createElement('span');
                textSpan.textContent = itemText;
                textSpan.style.flexGrow = '1';
                textSpan.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent blur event on textfield
                    textField.value = itemText;
                    historyDropdown.style.display = 'none';
                    popup.style.overflow = 'hidden'; // Restore clipping
                    if (rightPanel) rightPanel.style.overflow = 'hidden'; // Restore clipping
                });

                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-history-item';
                deleteBtn.textContent = 'x';
                deleteBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent blur and other events
                    e.stopPropagation();
                    // Remove from storage
                    const newHistory = history.filter(h => h !== itemText);
                    chrome.storage.local.set({ inputHistory: newHistory }, () => {
                        // Remove from DOM
                        populateHistoryDropdown(textField.value);
                    });
                });

                itemDiv.appendChild(textSpan);
                itemDiv.appendChild(deleteBtn);
                historyDropdown.appendChild(itemDiv);
            });
        });
    }

    

    textField.addEventListener('blur', (event) => {
        // As per user request, blur event should not hide the dropdown.
        // The dropdown is now toggled only by clicking the input field.
    });

    textField.addEventListener('input', () => {
        populateHistoryDropdown(textField.value);
    });

    var resultText = document.createElement("div");
    // Removed flex-grow, overflowY, padding as they are now on scrollableBody
    scrollableBody.appendChild(resultText);

    popup.appendChild(scrollableBody); // Append scrollableBody here
    popup.appendChild(inputContainer); // Then append inputContainer

    // Create the two-column layout
    const leftPanel = document.createElement('div');
    leftPanel.style.width = '250px'; // Width for the history list
    leftPanel.style.borderRight = '1px solid #ccc';
    leftPanel.style.backgroundColor = '#f7f7f7';
    leftPanel.style.overflowY = 'auto';
    leftPanel.style.flexShrink = '0'; // Prevent sidebar from shrinking
    leftPanel.style.padding = '10px';
    leftPanel.innerHTML = ''; // Clear placeholder

    const ACTIVE_HISTORY_BG = '#e3ecff';
    const ACTIVE_HISTORY_BORDER = '#5b74ff';

    function setHistoryItemActiveState(element, isActive) {
        if (!element) return;
        element.dataset.active = isActive ? 'true' : 'false';
        element.style.backgroundColor = isActive ? ACTIVE_HISTORY_BG : 'transparent';
        element.style.borderLeft = isActive ? `3px solid ${ACTIVE_HISTORY_BORDER}` : '3px solid transparent';
    }

    function refreshActiveHistoryHighlight() {
        const historyItems = leftPanel.querySelectorAll('.history-item');
        historyItems.forEach((item) => {
            const itemId = item.getAttribute('data-conversation-id');
            const isActive = currentConversationId !== null && String(itemId) === String(currentConversationId);
            setHistoryItemActiveState(item, isActive);
        });
    }

    // --- Start of new display logic ---
    function renderHistoryList() {
        // --- Start of New Chat Button logic ---
        leftPanel.innerHTML = ''; // Clear everything first
        const newChatButton = document.createElement('button');
        newChatButton.textContent = '＋ New Chat';
        newChatButton.style.width = '100%';
        newChatButton.style.padding = '10px';
        newChatButton.style.marginBottom = '10px';
        newChatButton.style.border = '1px solid #ccc';
        newChatButton.style.backgroundColor = '#f0f0f0';
        newChatButton.style.cursor = 'pointer';

        newChatButton.addEventListener('click', () => {
            currentConversationId = null;
            conversationHistory = [];
            contextText = '';
            resultText.innerHTML = '';
            contextDisplay.innerHTML = '<p><i>New chat session. Ask anything.</i></p>';
            modelSelect.disabled = false;
            textField.value = '';
            textField.placeholder = 'Ask a new question...';
            navButtonsContainer.style.display = 'none';
            refreshActiveHistoryHighlight();
        });
        leftPanel.appendChild(newChatButton);
        // --- End of New Chat Button logic ---

        chrome.storage.local.get(['conversationLogs'], (result) => {
            const logs = result.conversationLogs || [];

            if (logs.length === 0) {
                const noHistory = document.createElement('div');
                noHistory.textContent = 'No saved conversations.';
                noHistory.style.padding = '8px 10px';
                noHistory.style.color = '#888';
                leftPanel.appendChild(noHistory);
                return;
            }

            logs.forEach(log => {
                const historyItem = document.createElement('div');
                historyItem.classList.add('history-item');
                historyItem.style.padding = '8px 10px';
                historyItem.style.borderBottom = '1px solid #e0e0e0';
                historyItem.style.cursor = 'pointer';
                historyItem.setAttribute('data-conversation-id', log.id);
                historyItem.style.display = 'flex';
                historyItem.style.justifyContent = 'space-between';
                historyItem.style.alignItems = 'center';
                historyItem.style.borderLeft = '3px solid transparent';

                const titleSpan = document.createElement('span');
                titleSpan.textContent = log.title;
                titleSpan.style.whiteSpace = 'nowrap';
                titleSpan.style.overflow = 'hidden';
                titleSpan.style.textOverflow = 'ellipsis';
                titleSpan.style.flexGrow = '1';

                const deleteBtn = document.createElement('span');
                deleteBtn.style.padding = '2px 5px';
                deleteBtn.style.borderRadius = '3px';
                deleteBtn.style.marginLeft = '10px';
                deleteBtn.style.color = '#999';
                deleteBtn.style.flexShrink = '0';
                deleteBtn.style.display = 'flex';
                deleteBtn.style.alignItems = 'center';
                deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

                // Hover effect for delete button
                deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.color = '#000'; deleteBtn.style.backgroundColor = '#e0e0e0'; });
                deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.color = '#999'; deleteBtn.style.backgroundColor = 'transparent'; });

                // --- Delete Logic ---
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idToDelete = log.id;
                    chrome.storage.local.get(['conversationLogs'], (res) => {
                        const updatedLogs = (res.conversationLogs || []).filter(l => l.id !== idToDelete);
                        chrome.storage.local.set({ conversationLogs: updatedLogs }, () => {
                            if (idToDelete === currentConversationId) {
                                newChatButton.click(); // Reset the UI if the active chat is deleted
                            }
                            renderHistoryList(); // Refresh the list
                        });
                    });
                });

                // --- Edit Title Logic ---
                titleSpan.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = titleSpan.textContent;
                    input.style.width = '100%';
                    input.style.border = '1px solid #999';
                    input.style.padding = '0px 2px';
                    input.style.margin = '0';
                    input.style.font = 'inherit';
                    input.style.backgroundColor = '#fff';
                    input.style.color = '#000';

                    historyItem.replaceChild(input, titleSpan);
                    input.focus();
                    input.select();

                    const saveTitle = () => {
                        const newTitle = input.value.trim();
                        if (newTitle && newTitle !== log.title) {
                            chrome.storage.local.get(['conversationLogs'], (res) => {
                                const currentLogs = res.conversationLogs || [];
                                const logIndex = currentLogs.findIndex(l => l.id === log.id);
                                if (logIndex !== -1) {
                                    currentLogs[logIndex].title = newTitle;
                                    chrome.storage.local.set({ conversationLogs: currentLogs }, () => {
                                        renderHistoryList(); // Refresh the whole list
                                    });
                                }
                            });
                        } else {
                            historyItem.replaceChild(titleSpan, input);
                        }
                    };

                    input.addEventListener('blur', saveTitle);
                    input.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') {
                            saveTitle();
                        } else if (ev.key === 'Escape') {
                            historyItem.replaceChild(titleSpan, input);
                        }
                    });
                });

                historyItem.appendChild(titleSpan);
                historyItem.appendChild(deleteBtn);

                // --- Click-to-Load Logic ---
                historyItem.addEventListener('click', () => {
                    chrome.storage.local.get(['conversationLogs'], (result) => {
                        const logs = result.conversationLogs || [];
                        const clickedLog = logs.find(l => l.id === log.id);
                        if (!clickedLog) {
                            console.error("Could not find clicked conversation.");
                            return;
                        }

                        // 1. Update state
                        currentConversationId = clickedLog.id;
                        conversationHistory = clickedLog.history;
                        contextText = clickedLog.context;
                        modelSelect.value = clickedLog.model;
                        modelSelect.disabled = true;
                        refreshActiveHistoryHighlight();

                        // 2. Clear and re-render context area
                        resultText.innerHTML = '';
                        let loadedUrl, loadedSelection;
                        const urlPrefix = "URL: ";
                        if (contextText.startsWith(urlPrefix)) {
                            const parts = contextText.split('\n\n');
                            loadedUrl = parts[0].substring(urlPrefix.length);
                            loadedSelection = parts.slice(1).join('\n\n');
                        } else {
                            // Fallback for old format or URL-only context
                            loadedUrl = contextText;
                            loadedSelection = undefined;
                        }
                        renderContextArea(loadedUrl, loadedSelection);

                        // 3. Re-render chat history bubbles (THE PREVIOUSLY MISSING PART)
                        conversationHistory.forEach((message, index) => {
                            if (message.role === 'user') {
                                const userMessageDiv = document.createElement('div');
                                userMessageDiv.classList.add('message-item', 'user-message-item');
                                // The first user message contains the context, so we strip it for a cleaner display.
                                const userContent = (index === 0 && loadedSelection) ? message.parts[0].text.replace(contextText + "\n", "") : message.parts[0].text;
                                userMessageDiv.innerHTML = `<p><b class="chat-label">You:</b></p><p>${userContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
                                resultText.appendChild(userMessageDiv);
                            } else if (message.role === 'model' || message.role === 'assistant') {
                                const aiMessageDiv = document.createElement('div');
                                aiMessageDiv.classList.add('message-item');
                                const aiContent = message.parts[0].text;
                                if (window.marked) {
                                    aiMessageDiv.innerHTML = `<p><b class="chat-label">AI (${clickedLog.model}):</b></p>` + window.marked.parse(aiContent, { breaks: true });
                                } else {
                                    aiMessageDiv.innerHTML = `<p><b class="chat-label">AI (${clickedLog.model}):</b></p><p>${aiContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
                                }
                                resultText.appendChild(aiMessageDiv);
                            }
                            if (index < conversationHistory.length - 1) {
                                const separator = document.createElement('hr');
                                separator.style.marginTop = '15px';
                                separator.style.marginBottom = '15px';
                                separator.style.border = '0';
                                separator.style.borderTop = '1px solid #eee';
                                resultText.appendChild(separator);
                            }
                        });

                        // 4. Highlight code blocks
                        resultText.querySelectorAll('pre code').forEach((block) => {
                            hljs.highlightElement(block);
                        });

                        // 5. Update UI elements
                        textField.value = "";
                        textField.placeholder = "Ask a follow-up question...";
                        navButtonsContainer.style.display = "flex";
                        scrollableBody.scrollTop = scrollableBody.scrollHeight;
                    });
                });

                historyItem.addEventListener('mouseenter', () => {
                    if (historyItem.dataset.active !== 'true') {
                        historyItem.style.backgroundColor = '#e9e9e9';
                    }
                });
                historyItem.addEventListener('mouseleave', () => {
                    if (historyItem.dataset.active === 'true') {
                        historyItem.style.backgroundColor = ACTIVE_HISTORY_BG;
                    } else {
                        historyItem.style.backgroundColor = 'transparent';
                    }
                });

                setHistoryItemActiveState(historyItem, currentConversationId !== null && String(log.id) === String(currentConversationId));

                leftPanel.appendChild(historyItem);
            });
        });
    }

    renderHistoryList();
    // --- End of new display logic ---

    const rightPanel = document.createElement('div');
    rightPanel.style.flexGrow = '1';
    rightPanel.style.display = 'flex';
    rightPanel.style.flexDirection = 'column';
    rightPanel.style.overflow = 'hidden'; // The right panel itself shouldn't scroll
    rightPanel.style.minHeight = '0'; // Prevent flex overflow from hiding the input bar

    // --- Sidebar Toggle Logic ---
    const rightPanelHeader = document.createElement('div');
    rightPanelHeader.style.display = 'flex';
    rightPanelHeader.style.alignItems = 'center';
    rightPanelHeader.style.justifyContent = 'space-between';
    rightPanelHeader.style.padding = '4px 8px';
    rightPanelHeader.style.borderBottom = '1px solid #ccc';
    rightPanelHeader.style.backgroundColor = '#f1f1f1';
    rightPanelHeader.style.cursor = 'move';

    const headerControls = document.createElement('div');
    headerControls.style.display = 'flex';
    headerControls.style.alignItems = 'center';
    headerControls.style.gap = '8px';

    const toggleButton = document.createElement('button');
    toggleButton.style.padding = '2px 6px';
    toggleButton.style.cursor = 'pointer';
    
    let isSidebarVisible = true; // Default state

    const updateSidebarVisibility = (visible, isInitialLoad = false) => {
        isSidebarVisible = visible;
        if (visible) {
            leftPanel.style.display = 'block';
            resizer.style.display = 'block';
            toggleButton.textContent = '«';
        } else {
            leftPanel.style.display = 'none';
            resizer.style.display = 'none';
            toggleButton.textContent = '»';
        }
        if (!isInitialLoad) {
            chrome.storage.local.set({ sidebarVisible: visible });
        }
    };

    toggleButton.addEventListener('click', () => {
        updateSidebarVisibility(!isSidebarVisible);
    });

    // Load initial state
    chrome.storage.local.get(['sidebarVisible'], (result) => {
        // Default to true if not set
        const savedState = result.sidebarVisible === undefined ? true : result.sidebarVisible;
        updateSidebarVisibility(savedState, true);
    });

    headerControls.appendChild(toggleButton);
    rightPanelHeader.appendChild(headerControls);
    rightPanel.appendChild(rightPanelHeader);

    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.fontSize = '16px';
    closeButton.style.lineHeight = '1';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    rightPanelHeader.appendChild(closeButton);
    popup.tabIndex = -1;

    popup.addEventListener('mousedown', () => {
        popup.focus();
    });

    closeButton.onclick = function() {
        if (window.activeAskAIPopup === popup) {
            window.activeAskAIPopup = null;
        }
        popup.remove();
    };
    // --- End of Sidebar Toggle Logic ---

    // Append existing elements to the right panel
    rightPanel.appendChild(scrollableBody);
    rightPanel.appendChild(inputContainer);

    // Append the new panels to the main popup
    popup.appendChild(leftPanel);

    // --- Resizer Logic ---
    const resizer = document.createElement('div');
    resizer.style.width = '5px';
    resizer.style.cursor = 'col-resize';
    resizer.style.backgroundColor = 'transparent'; // It's an invisible handle
    resizer.style.flexShrink = '0';
    popup.appendChild(resizer);

    popup.appendChild(rightPanel);

    // Load saved width and apply it
    chrome.storage.local.get(['sidebarWidth'], (result) => {
        if (result.sidebarWidth) {
            leftPanel.style.width = result.sidebarWidth;
        }
    });

    const dragMouseDown = (e) => {
        e.preventDefault();
        document.addEventListener('mouseup', closeDragElement, { once: true }); // Use 'once' for automatic cleanup
        document.addEventListener('mousemove', elementDrag);
    };

    const elementDrag = (e) => {
        e.preventDefault();
        const newWidth = e.clientX - popup.getBoundingClientRect().left;
        // Add some constraints to prevent panels from becoming too small
        if (newWidth > 150 && newWidth < popup.clientWidth - 200) { 
            leftPanel.style.width = newWidth + 'px';
        }
    };

    const closeDragElement = () => {
        document.removeEventListener('mousemove', elementDrag);
        // Save the new width to local storage
        chrome.storage.local.set({ sidebarWidth: leftPanel.style.width });
    };

    resizer.addEventListener('mousedown', dragMouseDown);
    // --- End of Resizer Logic ---

    button.onclick = function() {
      button.textContent = "Loading...";
      var selectedModel = modelSelect.value;
      let questionText = textField.value;
      if (!questionText) {
        questionText = defaultQuestion;
      }

      // Save the question to history
      if (questionText) {
        chrome.storage.local.get(['inputHistory'], (result) => {
            let history = result.inputHistory || [];
            // Remove if already exists to move it to the top
            history = history.filter(item => item !== questionText);
            // Add to the front
            history.unshift(questionText);
            // Keep the last 50 entries
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            chrome.storage.local.set({ inputHistory: history });
        });
      }

      // The query sent to the API should only be the new question,
      // unless it's the first message, in which case it includes the initial context (if it exists).
      const queryToSend = (conversationHistory.length === 0 && contextText) ? (contextText + "\n" + questionText) : questionText;

      // Add a separator for follow-up questions
      if (conversationHistory.length > 0) {
        const separator = document.createElement('hr');
        separator.style.marginTop = '15px';
        separator.style.marginBottom = '15px';
        separator.style.border = '0';
        separator.style.borderTop = '1px solid #eee';
        resultText.appendChild(separator);
      }

      // 1. Display user's question
      const userMessageDiv = document.createElement('div');
      userMessageDiv.classList.add('message-item', 'user-message-item');
      userMessageDiv.innerHTML = `<p><b class="chat-label">You:</b></p><p>${questionText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
      resultText.appendChild(userMessageDiv);

      // 2. Display loading state for AI
      const aiMessageDiv = document.createElement('div');
      aiMessageDiv.classList.add('message-item');
      aiMessageDiv.innerHTML = `<p><b class="chat-label">AI (${selectedModel}):</b></p><p><i>Thinking...</i></p>`;
      resultText.appendChild(aiMessageDiv);
      
      // Scroll to the bottom
      resultText.scrollTop = resultText.scrollHeight;

      // Clear the input field
      textField.value = "";
      textField.placeholder = "Ask a follow-up question...";

      // Disable model selection after the first message
      if (conversationHistory.length === 0) {
        modelSelect.disabled = true;
      }

      chrome.runtime.sendMessage({ type: "getResponse", selection: queryToSend, model: selectedModel, conversationHistory: conversationHistory })
        .then((response) => {
          conversationHistory = response.conversationHistory;
          button.textContent = "Send";
          
          // --- Start of new save logic ---
          chrome.storage.local.get(['conversationLogs'], (result) => {
              let logs = result.conversationLogs || [];
              
              if (currentConversationId === null) {
                  // This is a new conversation
                  const newId = Date.now();
                  currentConversationId = newId;
                  const titleText = contextText || questionText;
                  const title = titleText.length > 50 ? titleText.substring(0, 50) + '...' : titleText;
                  
                  const newLog = {
                      id: newId,
                      title: title,
                      context: contextText,
                      model: selectedModel,
                      timestamp: new Date().toISOString(),
                      history: conversationHistory
                  };
                  logs.unshift(newLog); // Add to the beginning
                  console.log('[Content] New conversation saved. ID:', newId);
              } else {
                  // This is an existing conversation
                  const logIndex = logs.findIndex(log => log.id === currentConversationId);
                  if (logIndex !== -1) {
                      logs[logIndex].history = conversationHistory;
                      logs[logIndex].timestamp = new Date().toISOString();
                      // Move the updated log to the top
                      const updatedLog = logs.splice(logIndex, 1)[0];
                      logs.unshift(updatedLog);
                      console.log('[Content] Conversation updated. ID:', currentConversationId);
                  } else {
                      console.error('[Content] Could not find conversation to update with ID:', currentConversationId);
                      return; 
                  }
              }

              // Keep the last 50 conversations
              if (logs.length > 50) {
                  logs = logs.slice(0, 50);
              }

              chrome.storage.local.set({ conversationLogs: logs }, () => {
                  renderHistoryList(); // Refresh the list in the sidebar
              });
          });
          // --- End of new save logic ---

          // 3. Update AI's message with the actual response
          if (window.marked) {
            aiMessageDiv.innerHTML = `<p><b class="chat-label">AI (${selectedModel}):</b></p>` + window.marked.parse(response.result, { breaks: true });
            aiMessageDiv.querySelectorAll('pre code').forEach((block) => {
              hljs.highlightElement(block);
            });
          } else {
            aiMessageDiv.innerHTML = `<p><b class="chat-label">AI (${selectedModel}):</b></p><p>${response.result.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
          }
          // Show navigation buttons after the first response
          if (conversationHistory.length >= 2) { // Check if it's the first message (after user's question and AI's response)
            navButtonsContainer.style.display = "flex";
          }
          // Scroll to the bottom again
          resultText.scrollTop = resultText.scrollHeight;
        })
        .catch(error => {
            button.textContent = "Send";
            resultText.textContent = "Error: " + error.message;
            console.error("[Content] Error fetching response: ", error);
        });
    }

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // Allow dragging with Ctrl + click anywhere on the popup
    popup.addEventListener('mousedown', (e) => {
        if (e.ctrlKey) {
            isDragging = true;
            offsetX = e.clientX - popup.offsetLeft;
            offsetY = e.clientY - popup.offsetTop;
            e.preventDefault(); // Prevent default behavior like text selection
        }
    });

    rightPanelHeader.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target === toggleButton || toggleButton.contains(target) || target === closeButton) {
            return; // keep clicks on controls functional
        }
        isDragging = true;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            popup.style.left = (e.clientX - offsetX) + 'px';
            popup.style.top = (e.clientY - offsetY) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    let resizeSaveTimer = null;
    let hasObservedInitialSize = false;
    const savePopupSize = () => {
        const rect = popup.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (width < minPopupWidth || height < minPopupHeight) {
            return;
        }
        chrome.storage.local.set({
            popupWidth: width,
            popupHeight: height
        });
    };
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            if (!hasObservedInitialSize) {
                hasObservedInitialSize = true;
                return;
            }
            if (resizeSaveTimer) {
                clearTimeout(resizeSaveTimer);
            }
            resizeSaveTimer = setTimeout(savePopupSize, 150);
        });
        resizeObserver.observe(popup);
    }

    // Create navigation buttons container
    var navButtonsContainer = document.createElement("div");
    navButtonsContainer.style.position = "absolute";
    navButtonsContainer.style.bottom = "60px"; // Adjusted position
    navButtonsContainer.style.right = "25px";
    navButtonsContainer.style.zIndex = "10001"; // 確保在最上層
    navButtonsContainer.style.display = "none"; // Initially hidden
    navButtonsContainer.style.flexDirection = "column";
    navButtonsContainer.style.gap = "5px";
    navButtonsContainer.style.opacity = "0.7"; // Added opacity

    // Create scroll to top button
    var scrollTopButton = document.createElement("button");
    var scrollTopImg = document.createElement("img");
    scrollTopImg.src = chrome.runtime.getURL("images/top.svg");
    scrollTopImg.style.width = "20px"; // Adjust size as needed
    scrollTopImg.style.height = "20px"; // Adjust size as needed
    scrollTopButton.appendChild(scrollTopImg);
    scrollTopButton.style.padding = "5px 8px";
    scrollTopButton.style.cursor = "pointer";
    navButtonsContainer.appendChild(scrollTopButton);

    // Create previous message button
    var prevButton = document.createElement("button");
    var prevImg = document.createElement("img");
    prevImg.src = chrome.runtime.getURL("images/prev.svg");
    prevImg.style.width = "20px"; // Adjust size as needed
    prevImg.style.height = "20px"; // Adjust size as needed
    prevButton.appendChild(prevImg);
    prevButton.style.padding = "5px 8px";
    prevButton.style.cursor = "pointer";
    navButtonsContainer.appendChild(prevButton);

    // Create next message button
    var nextButton = document.createElement("button");
    var nextImg = document.createElement("img");
    nextImg.src = chrome.runtime.getURL("images/next.svg");
    nextImg.style.width = "20px"; // Adjust size as needed
    nextImg.style.height = "20px"; // Adjust size as needed
    nextButton.appendChild(nextImg);
    nextButton.style.padding = "5px 8px";
    nextButton.style.cursor = "pointer";
    navButtonsContainer.appendChild(nextButton);

    // Create scroll to bottom button
    var scrollBottomButton = document.createElement("button");
    var bottomImg = document.createElement("img");
    bottomImg.src = chrome.runtime.getURL("images/bottom.svg");
    bottomImg.style.width = "20px"; // Adjust size as needed
    bottomImg.style.height = "20px"; // Adjust size as needed
    scrollBottomButton.appendChild(bottomImg);
    scrollBottomButton.style.padding = "5px 8px";
    scrollBottomButton.style.cursor = "pointer";
    navButtonsContainer.appendChild(scrollBottomButton);

    popup.appendChild(navButtonsContainer);

    // Navigation button logic
    scrollTopButton.onclick = () => {
        scrollableBody.scrollTop = 0;
    };

    scrollBottomButton.onclick = () => {
        scrollableBody.scrollTop = scrollableBody.scrollHeight;
    };

    prevButton.onclick = () => {
        const userMessageItems = scrollableBody.querySelectorAll('.user-message-item');
        let currentScrollTop = scrollableBody.scrollTop;
        let targetScrollTop = 0;

        // Find the first user message item that is above the current scroll position
        for (let i = userMessageItems.length - 1; i >= 0; i--) {
            const item = userMessageItems[i];
            if (item.offsetTop < currentScrollTop) {
                targetScrollTop = item.offsetTop;
                break;
            }
        }
        scrollableBody.scrollTop = targetScrollTop;
    };

    nextButton.onclick = () => {
        const userMessageItems = scrollableBody.querySelectorAll('.user-message-item');
        let currentScrollTop = scrollableBody.scrollTop;
        let targetScrollTop = scrollableBody.scrollHeight; // Default to bottom if no next found

        // Find the first user message item that is below the current view
        for (let i = 0; i < userMessageItems.length; i++) {
            const item = userMessageItems[i];
            if (item.offsetTop > currentScrollTop + scrollableBody.clientHeight - 1) { // -1 to account for partial visibility
                targetScrollTop = item.offsetTop;
                break;
            }
        }
        scrollableBody.scrollTop = targetScrollTop;
    };

    return popup;
}

if (!window.escListenerAdded) {
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape") {
            const activeElement = document.activeElement;
            let currentPopup = activeElement;
            while (currentPopup) {
                if (currentPopup.classList && currentPopup.classList.contains('askai-popup')) {
                    currentPopup.remove();
                    break;
                }
                currentPopup = currentPopup.parentElement;
            }
        }
    });
    window.escListenerAdded = true;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "showPopup") {
    const position = { top: lastRightClickPosition.y, left: lastRightClickPosition.x };
    const pageUrl = request.pageUrl;
    // Use the passed selectionText, but trim it. Fallback to undefined.
    const selectionText = request.selectionText ? request.selectionText.trim() : undefined;

    // Proceed if we have at least a URL
    if (pageUrl) {
      const popup = createPopup(pageUrl, selectionText, position);
      document.body.appendChild(popup);
      setTimeout(() => {
        const textField = popup.querySelector('#myTextField');
        if (popup) {
          popup.focus();
        }
        if (textField) {
          textField.focus();
        }
      }, 100); // Give browser a moment to render
    }
  }
});

}
