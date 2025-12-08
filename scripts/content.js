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

function createPopup(contextText, position) {
    let conversationHistory = [];
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
    popup.style.position = "fixed";
    popup.style.top = position.top + "px";
    popup.style.left = position.left + "px";
    popup.style.backgroundColor = "#fafafa";
    popup.style.border = "1px solid #000";
    popup.style.padding = "0"; // 移除 padding
    popup.style.color = "#000";
    popup.style.maxHeight = "600px";
    popup.style.maxWidth = "800px";
    popup.style.minWidth = "350px"; // Ensure a minimum width for usability
    popup.style.overflow = "hidden"; // 設置為 hidden
    popup.style.zIndex = "9999";
    popup.style.resize = "both";
    popup.style.display = "flex"; // 新增 flex 佈局
    popup.style.flexDirection = "column"; // 設置為垂直方向
    popup.style.boxSizing = "border-box"; // 確保 padding 和 border 不影響寬高
    
    // Create a scrollable body for context, model select, and chat history
    var scrollableBody = document.createElement("div");
    scrollableBody.style.flexGrow = "1";
    scrollableBody.style.overflowY = "auto";
    scrollableBody.style.padding = "10px"; // Apply padding here

    // Create a Popup div
    var contextDisplay = document.createElement("div");
    if (contextText.startsWith("http")) {
      contextDisplay.textContent = "URL: " + contextText;
    } else {
      
      if (window.marked) {
        contextDisplay.innerHTML = window.marked.parse(contextText, { breaks: true });
      } else {
        contextDisplay.textContent = contextText;
      }
    }
    scrollableBody.appendChild(contextDisplay); // Append to scrollableBody
    
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
    modelSelect.value = "gemini-2.5-flash";
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

    // Create a text input
    var textField = document.createElement("input");
    textField.type = "text";
    textField.id = "myTextField";
    textField.placeholder = defaultQuestion;
    textField.style.flexGrow = "1";
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
                historyDropdown.style.display = 'block';
                // Position the dropdown just below the text field
                historyDropdown.style.top = `${textField.offsetTop + textField.offsetHeight}px`;
                historyDropdown.style.left = `${textField.offsetLeft}px`;
                historyDropdown.style.width = `${textField.offsetWidth}px`;
            } else {
                historyDropdown.style.display = 'none';
                popup.style.overflow = 'hidden'; // Restore clipping
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
      // unless it's the first message, in which case it includes the initial context.
      const queryToSend = conversationHistory.length === 0 ? (contextText + "\n" + questionText) : questionText;

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
          
          // 3. Update AI's message with the actual response
          if (window.marked) {
            aiMessageDiv.innerHTML = `<p><b class="chat-label">AI (${selectedModel}):</b></p>` + window.marked.parse(response.result, { breaks: true });
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

    var header = document.createElement("div");
    header.style.padding = "5px";
    header.style.cursor = "move";
    header.style.backgroundColor = "#f1f1f1";
    header.style.borderBottom = "1px solid #ccc";
    header.style.position = "sticky";
    header.style.top = "0";
    header.style.zIndex = "10000"; // 確保它在其他內容之上
    header.textContent = "Ask AI";
    popup.insertBefore(header, popup.firstChild);

    var closeButton = document.createElement("span");
    closeButton.textContent = "x";
    closeButton.style.float = "right";
    closeButton.style.cursor = "pointer";
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
    header.appendChild(closeButton);

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

    header.addEventListener('mousedown', (e) => {
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
    let contextText;
    const position = { top: lastRightClickPosition.y, left: lastRightClickPosition.x };

    if (request.selectionText) {
      contextText = window.getSelection().toString().trim();
    } else if (request.pageUrl) {
      contextText = request.pageUrl;
    }

    if (contextText) {
      const popup = createPopup(contextText, position);
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