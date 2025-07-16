This project is forked from [QuicklyGPT](https://github.com/zealotjin/quicklygpt-extension?tab=readme-ov-file).

This project was developed using an **AI-assisted, prompt-driven development approach** to rapidly iterate on features and address complex challenges. This methodology allowed for a strong focus on product vision and user experience, demonstrating an agile and innovative development process.

The following enhancements and modifications have been implemented:

- **Core Conversation Management:**
    - **Independent Conversation History:** Each Ask AI popup window now maintains its own distinct conversation history, preventing context mixing between windows.
    - **Continuous Conversation:** Within a single popup, the AI remembers previous turns, enabling natural, multi-turn dialogues.
    - **Model Selection Lock:** Once a conversation begins in a window, the AI model selection is disabled to ensure consistent conversation history formatting and prevent "No response" errors.

- **Enhanced User Interface & Experience:**
    - **Dynamic UI and Formatting Improvements:** Addressed issues related to dynamic display box sizing (width/height), input field length adjustments, Markdown rendering, and line break handling.
    - **Real-time Conversation Display:** User questions are displayed instantly, followed by AI model and "Thinking..." status.
    - **Improved Readability:** Added visual separators between conversation turns and enhanced "You:" and "AI(...):" labels with larger font and a distinct color (#CC5500) for better visibility.
    - **Input Field Optimization:** Input field clears automatically after sending, with a "Ask a follow-up question..." placeholder.
    - **Auto-Scrolling:** Conversation area automatically scrolls to show the latest messages.

- **Enhanced User Interaction and Model Selection:**
    - Integrated Ask AI functionality into the right-click context menu for improved user experience (eliminating automatic pop-ups on text selection).
    - Introduced the ability to query without text selection (specifically for URLs).
    - Implemented a dropdown menu for selecting various AI models (e.g., ChatGPT Turbo, ChatGPT Turbo-16k, Gemini 2.0 Flash). Set a default input text of "請翻譯成繁體中文。".

- **Multi-Window and Window Management:**
    - Enabled support for multiple concurrent query windows.
    - Added a dedicated button for closing individual windows.
    - **Improved Escape Key Behavior:** The Escape key now closes the currently focused Ask AI popup window.

- **Improved Usability:**
    - Automatically focuses the input field upon opening the Ask AI window via right-click, allowing for immediate text input without additional mouse clicks.
    - **Sticky Header for Easy Dragging:** The popup's header now remains visible and draggable, even when scrolling through long content.
    - **Flexible Window Positioning:** Drag the popup from anywhere by holding `Ctrl` and clicking, or use the dedicated header.
    - **Persistent Input Area:** The input field and send button are now fixed at the bottom, ensuring they are always accessible for continuous conversation, with the chat history scrolling independently above.