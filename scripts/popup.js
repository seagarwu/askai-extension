/**
 * Popup script that gets inserted into the popup
 */
console.log("[Popup] this is popup script");

async function injectScript() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  let tabs = await chrome.tabs.query(queryOptions);
  chrome.scripting.executeScript({
    target: {tabId: tabs[0].id, allFrames: true},
    files: ["scripts/content.js"],
  }).then(injectionResults => {
    console.log("[Popup] done");
  });
}
injectScript();

const form = document.forms["apiKeyForm"];
chrome.storage.local.get(["key"], (result) => {
  const localApiKey = result.key ? result.key["apiKey"] : null;
  const localGeminiApiKey = result.key ? result.key["geminiApiKey"] : null;
  console.log("[Popup] ApiKey value: " + localApiKey);
  console.log("[Popup] Gemini ApiKey value: " + localGeminiApiKey);
  if (localApiKey) {
    form.apiKey.value = localApiKey;
  }
  if (localGeminiApiKey) {
    form.geminiApiKey.value = localGeminiApiKey;
  }
})

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const apiKey = form.apiKey.value;
  const geminiApiKey = form.geminiApiKey.value;
  const store = { apiKey: apiKey, geminiApiKey: geminiApiKey };
  chrome.storage.local.set({key: store}, () => {
    console.log("[Popup] Updated store");
  }) 
})

document.addEventListener('DOMContentLoaded', function() {
  console.log('[Popup] DOMContentLoaded fired');
  setTimeout(function() {
    const apiKeyInput = document.getElementById('apikey');
    console.log('[Popup] Attempting to focus on:', apiKeyInput);
    if (apiKeyInput) {
      apiKeyInput.focus();
      console.log('[Popup] Focus method called.');
    } else {
      console.log('[Popup] API Key input not found.');
    }
  }, 100); 
});