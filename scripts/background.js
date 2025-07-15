console.log("[Background] Script started.");

function getGPTResponse(apiKey, message, model, sendResponse) {
    let data = {
      "model": model,
      "messages": [{"role": "user", "content": message}],
      "max_tokens": 1000
    }
    let requestBody = JSON.stringify(data);
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: requestBody
    }).then(res => res.json()).then((res) => {
      var result = "No response";
      if (res.choices) {
        result = res.choices[0].message.content;
      }
      sendResponse({ result: result });
    }).catch(err => {
      console.log("error: " + err);
    })
}

function getGeminiResponse(apiKey, message, model, sendResponse) {
  let data = {
    "contents": [{"parts": [{"text": message}]}]
  }
  let requestBody = JSON.stringify(data);
  fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: requestBody
  }).then(res => res.json()).then((res) => {
    var result = "No response";
    if (res.candidates && res.candidates[0] && res.candidates[0].content && res.candidates[0].content.parts && res.candidates[0].content.parts[0]) {
      result = res.candidates[0].content.parts[0].text;
    }
    sendResponse({ result: result });
  }).catch(err => {
    console.log("error: " + err);
  })
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "getResponse") {
    chrome.storage.local.get(["key"]).then((storageRes) => {
      const localApiKey = storageRes.key["apiKey"];
      const localGeminiApiKey = storageRes.key["geminiApiKey"];
      const selection = request.selection;
      const model = request.model;

      if (model.startsWith("gpt")) {
        getGPTResponse(localApiKey, selection, model, sendResponse);
      } else if (model.startsWith("gemini")) {
        getGeminiResponse(localGeminiApiKey, selection, model, sendResponse);
      }
    });
  } else if (request.type === "createPopup") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {type: "showPopup", selectionText: request.selectionText, position: request.position});
    });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Background] onInstalled event fired.");
  chrome.contextMenus.create({
    id: "askAI",
    title: "Ask AI",
    contexts: ["selection", "page"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("[Background] Error creating context menu: ", chrome.runtime.lastError.message);
    } else {
      console.log("[Background] Context menu 'Ask AI' created successfully.");
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askAI") {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ['scripts/marked.min.js', 'scripts/content.js']
    }, () => {
      if (info.selectionText) {
        chrome.tabs.sendMessage(tab.id, {type: "showPopup", selectionText: info.selectionText});
      } else if (info.pageUrl) {
        chrome.tabs.sendMessage(tab.id, {type: "showPopup", pageUrl: info.pageUrl});
      }
    });
  }
});

console.log("[Background] Loaded script");
