# Ask AI – A Context-Aware Multi-Model Assistant for Chrome 

> **Forked from [QuicklyGPT](https://github.com/zealotjin/quicklygpt-extension)**  
> Ask AI adds right-click, context-aware access to multiple LLMs (ChatGPT Turbo, Turbo-16k, Gemini 2.0 Flash…) so you can query AI without leaving the current tab.


---

## ✨ Key Enhancements

### 1. User Interaction & Context Management
- **Context-aware activation** – opens only from the right-click menu, keeping your browsing flow uninterrupted until you call it.  
- **Flexible querying**  
  - Selected text → Ask AI (the highlight and its source URL are bundled into the prompt)  
  - No selection → Ask AI with the current page URL  
  - Select text *inside* an Ask AI window to start a related thread.
- **Multi-model switcher** – ChatGPT Turbo / Turbo-16k / Gemini 2.5 Flash Lite … choose per query.

### 2. Conversation & Window Management
- **Independent windows** – each popup keeps its own continuous chat across tabs.  
- **Multi-window control** – open many windows; close with ❌ or <kbd>Esc</kbd>.  
- **Conversation history sidebar** – double-click a title to rename it, use the inline delete icon to prune old threads, and reopen any chat directly inside the Ask AI window.  
- **Drag-and-move** – drag the title bar, or press <kbd>Ctrl</kbd> + <kbd>Left Click</kbd> anywhere.

### 3. UI & Navigation
- **Persistent input bar** fixed at the bottom; history scrolls above.  
- **Smart navigation** – transparent <kbd>Top</kbd> · <kbd>Prev</kbd> · <kbd>Next</kbd> · <kbd>Bottom</kbd> buttons appear after the first AI reply and jump to the next user prompt.  
- **Input history dropdown** – click the input field to reuse previous queries.  
- **Auto-focus** on open for immediate typing.

---

## 🚀 Installation

### Chrome Web Store  
 🔗 [Install from Chrome Web Store](https://chromewebstore.google.com/detail/ask-ai/ojednlpijidkbneinclpholkihfdalbm) 

### Developer mode
```text
git clone https://github.com/seagarwu/askai-extension.git
chrome://extensions → Enable Developer mode → Load unpacked → select folder
```

## 💡 Usage Tips
| Action | Shortcut |
| --- | --- |
| Launch Ask AI window on the active tab | Win/Linux: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Y</kbd><br>macOS: <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Y</kbd> |
| Close the floating window | <kbd>Esc</kbd> or click the top-right ❌ |
| Move window anywhere | Drag the title bar, or press <kbd>Ctrl</kbd> + <kbd>Left Click</kbd> anywhere |

## 🆕 Recent Updates
- Added a global `Ctrl/Cmd + Shift + Y` shortcut so you can summon the floating window without touching the mouse.
- Selected text queries now include the source page URL so prompts always carry reliable context.
- Expanded the chat history sidebar with double-click-to-rename titles plus inline delete controls for more complete conversation management.
- Default model switched to `gemini-2.5-flash-lite` to keep responses fast without sacrificing quality.
- Refined the floating window chrome: header dragging is fully supported and the close button now lives on the right-hand side for easier muscle memory.

## 📚 Acknowledgements
Based on QuicklyGPT by [JG Lee](https://github.com/zealotjin/quicklygpt-extension) – reused under the MIT License with permission.
