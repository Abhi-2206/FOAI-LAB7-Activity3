// --- Configuration & Constants ---
// Place your API keys here
const OPENROUTER_API_KEY = "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";
const HF_TOKEN = "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";

// API Endpoints
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/auto";
const HF_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

// --- State ---
// Maintain the full conversation history for the chat model
const conversationHistory = [];

// --- DOM Elements ---
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const imageModeCheckbox = document.getElementById("image-mode-checkbox");

// --- Event Listeners ---
chatForm.addEventListener("submit", handleSubmission);

/**
 * Handles the form submission when the user clicks 'Send' or presses Enter.
 */
async function handleSubmission(event) {
    event.preventDefault(); // Prevent standard form submission (page reload)

    const text = userInput.value.trim();
    if (!text) return; // Do nothing if input is empty

    const isImageMode = imageModeCheckbox.checked;

    // 1. Clear input & append user message
    userInput.value = "";
    appendMessage(text, "user");

    // 2. Disable input and show loading state
    setInputState(false);
    const loadingId = appendLoadingIndicator();

    try {
        if (isImageMode) {
            // Flow A: Generate Image via Hugging Face
            await generateImage(text, loadingId);
        } else {
            // Flow B: Text Chat via OpenRouter
            await handleChatTurn(text, loadingId);
        }
    } catch (error) {
        // Handle any errors that bubbled up
        removeElement(loadingId);
        appendErrorMessage(error.message);
    } finally {
        // 3. Re-enable input area
        setInputState(true);
        scrollToBottom();
    }
}

/**
 * Handles interacting with the OpenRouter API for text generation.
 * @param {string} userText - The text input from the user
 * @param {string} loadingId - The DOM ID of the loading indicator to remove
 */
async function handleChatTurn(userText, loadingId) {
    // Add user message to conversation history
    conversationHistory.push({ role: "user", content: userText });

    // Build the request body
    const requestBody = {
        model: "openai/gpt-3.5-turbo", // Switch to a different model if desired
        messages: conversationHistory
    };

    // Make the API call
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const botReply = data.choices[0].message.content;

    // Add bot reply to full conversation history
    conversationHistory.push({ role: "assistant", content: botReply });

    // Remove loading indicator and show the bot's response
    removeElement(loadingId);
    appendMessage(botReply, "bot");
}

/**
 * Handles interacting with the Hugging Face API for image generation.
 * @param {string} prompt - The image prompt from the user
 * @param {string} loadingId - The DOM ID of the loading indicator to remove
 */
async function generateImage(prompt, loadingId) {
    // Make the API call
    const response = await fetch(HF_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
    }

    // The API returns the image as a binary blob
    const blob = await response.blob();

    // Create a local object URL for the blob
    const imageUrl = URL.createObjectURL(blob);

    // Remove loading indicator and show the generated image
    removeElement(loadingId);
    appendImageMessage(imageUrl, prompt, "bot");
}

// --- UI Helper Functions ---

/**
 * Appends a text message bubble to the chat window.
 * @param {string} text - The text to display
 * @param {string} sender - "user" or "bot"
 */
function appendMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", `${sender}-message`);
    msgDiv.textContent = text;
    chatWindow.appendChild(msgDiv);
    scrollToBottom();
}

/**
 * Appends an image message bubble to the chat window.
 * @param {string} url - The Object URL of the generated image
 * @param {string} altText - Alt text for the image
 * @param {string} sender - "user" or "bot"
 */
function appendImageMessage(url, altText, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", `${sender}-message`);

    // Label for the generated image
    const textNode = document.createElement("div");
    textNode.textContent = `Generated image for: "${altText}"`;
    textNode.style.marginBottom = "8px";
    textNode.style.fontSize = "0.875rem";
    textNode.style.color = "#8b949e";

    // Image element
    const img = document.createElement("img");
    img.src = url;
    img.alt = altText;
    img.classList.add("generated-image");

    // Clean up memory after loading
    img.onload = () => {
        URL.revokeObjectURL(url);
    };

    msgDiv.appendChild(textNode);
    msgDiv.appendChild(img);
    chatWindow.appendChild(msgDiv);
    scrollToBottom();
}

/**
 * Appends an error message bubble to the chat window.
 * @param {string} errorMessage - The error detail
 */
function appendErrorMessage(errorMessage) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "error-message");
    msgDiv.textContent = `Error: ${errorMessage}`;
    chatWindow.appendChild(msgDiv);
    scrollToBottom();
}

/**
 * Shows a bouncing dot loading indicator.
 * @returns {string} The unique ID of the loading element so it can be removed later
 */
function appendLoadingIndicator() {
    const id = `loading-${Date.now()}`;
    const loadingDiv = document.createElement("div");
    loadingDiv.id = id;
    loadingDiv.classList.add("message", "bot-message");

    loadingDiv.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;

    chatWindow.appendChild(loadingDiv);
    scrollToBottom();
    return id;
}

/**
 * Removes an element from the DOM by its ID.
 */
function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

/**
 * Scrolls the chat window to the very bottom to show the latest messages.
 */
function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Enables or disables the input field and send button during API calls.
 */
function setInputState(isEnabled) {
    userInput.disabled = !isEnabled;
    sendButton.disabled = !isEnabled;
    if (isEnabled) {
        userInput.focus();
    }
}
