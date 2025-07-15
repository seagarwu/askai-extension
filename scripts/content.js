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
    `;
    document.head.appendChild(style);

    var popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = position.top + "px";
    popup.style.left = position.left + "px";
    popup.style.backgroundColor = "#fff";
    popup.style.border = "1px solid #000";
    popup.style.padding = "10px";
    popup.style.color = "#000";
    popup.style.maxHeight = "600px";
    popup.style.maxWidth = "800px";
    popup.style.overflow = "auto";
    popup.style.zIndex = "9999";
    popup.style.resize = "both";
    
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
    popup.appendChild(contextDisplay);
    
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
    option3.value = "gemini-2.0-flash";
    option3.textContent = "Gemini 2.0 Flash";
    modelSelect.appendChild(option3);
    modelSelect.value = "gemini-2.0-flash";
    popup.appendChild(modelSelect);

    const defaultQuestion = "請翻譯成繁體中文。";

    // Create a container for the input and button
    var inputContainer = document.createElement("div");
    inputContainer.style.display = "flex";
    inputContainer.style.width = "100%";
    inputContainer.style.gap = "5px";

    // Create a text input
    var textField = document.createElement("input");
    textField.type = "text";
    textField.id = "myTextField";
    textField.placeholder = defaultQuestion;
    textField.style.flexGrow = "1";
    inputContainer.appendChild(textField);

    // Create a button to search
    var button = document.createElement("button");
    button.textContent = "Send";
    inputContainer.appendChild(button);
    popup.appendChild(inputContainer);

    textField.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            button.click();
        }
    });

    var resultText = document.createElement("div");
    popup.appendChild(resultText);

    button.onclick = function() {
      button.textContent = "Loading...";
      var selectedModel = modelSelect.value;
      let questionText = textField.value;
      if (!questionText) {
        questionText = defaultQuestion;
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
      userMessageDiv.innerHTML = `<p><b class="chat-label">You:</b></p><p>${questionText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
      resultText.appendChild(userMessageDiv);

      // 2. Display loading state for AI
      const aiMessageDiv = document.createElement('div');
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