document.addEventListener("DOMContentLoaded", () => {
    // --- Get DOM Elements ---
    const promptForm = document.getElementById("prompt-form");
    const userInput = document.getElementById("user-input");
    const aiResponse = document.getElementById("ai-response");
    const errorLog = document.getElementById("error-log");
    const submitButton = document.getElementById("submit-button");
    const mealButtonsContainer = document.getElementById("meal-buttons");
    const mealButtons = document.querySelectorAll(".meal-btn");
    
    // NEW: Get the label for the text input
    const userInputLabel = document.getElementById("user-input-label");

    // --- State Variables ---
    let selectedMealType = ""; 

    // --- Prompt Template ---
    const promptTemplate = `You are an expert chef creating a recipe.

Meal Type Requested: {{MEAL_TYPE}}
User's Ingredients/Query: "{{USER_INPUT}}"

Please provide a creative and simple recipe based on this request.
`;

    // --- Event Listener for Meal Buttons ---
    mealButtonsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("meal-btn")) {
            const clickedButton = e.target;
            
            // 1. Remove .active from all buttons
            mealButtons.forEach(btn => btn.classList.remove("active"));
            // 2. Add .active to the clicked button
            clickedButton.classList.add("active");

            // NEW LOGIC: Show/hide custom text box
            if (clickedButton.id === "btn-custom") {
                // User clicked "Custom"
                selectedMealType = "Custom";
                // Show the text box and its label
                userInputLabel.style.display = 'block';
                userInput.style.display = 'block';
                // Optional: Update placeholder text for clarity
                userInputLabel.textContent = "Describe your custom situation:";
                userInput.placeholder = "e.g., 'I have leftover chicken and rice...'";
                logToSystem('Custom meal selected. Please provide details.');
            } else {
                // User clicked "Breakfast", "Lunch", or "Dinner"
                selectedMealType = clickedButton.textContent;
                // Hide the text box and its label
                userInputLabel.style.display = 'none';
                userInput.style.display = 'none';
                userInput.value = ""; // Clear any previous custom text
                logToSystem(`Meal type set to: ${selectedMealType}`);
            }
        }
    });


    // --- Form Submit Event Listener ---
    promptForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        
        errorLog.innerHTML = "";
        aiResponse.textContent = "";
        logToSystem("New request initiated...");

        // Get text from the (now optional) text box
        const userText = userInput.value;

        // --- NEW Validation ---
        if (!selectedMealType) {
            logToSystem("Please select a meal type (Breakfast, Lunch, etc.).", 'ERROR');
            return;
        }
        // Only require userText if "Custom" is the selected meal
        if (selectedMealType === "Custom" && !userText) {
            logToSystem("Please describe your custom situation in the text box.", 'ERROR');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Thinking...";
        aiResponse.textContent = "Loading...";
        logToSystem("Input validated. Submitting to backend...");

        // --- Prompt Building (This logic remains the same) ---
        // If "Breakfast" is chosen, userText will be ""
        // If "Custom" is chosen, userText will have their input
        const fullPrompt = promptTemplate
            .replace("{{MEAL_TYPE}}", selectedMealType)
            .replace("{{USER_INPUT}}", userText);
            
        logToSystem("Final prompt constructed with meal type and user input.");

        try {
            logToSystem("Sending POST request to /api/call-gemini...");
            const response = await fetch("/api/call-gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: fullPrompt }),
            });

            logToSystem(`Received response with status: ${response.status}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            logToSystem("Response JSON parsed successfully.");
            aiResponse.textContent = data.response;
            logToSystem("AI response displayed.", 'SUCCESS');

        } catch (error) {
            logToSystem(error.message, 'ERROR');
            aiResponse.textContent = "Failed to get response.";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Send to AI";
            logToSystem("Process complete. Ready for new input.");
        }
    });

    // --- Utility Functions (unchanged) ---
    function logToSystem(message, type = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry');
        let prefix = 'INFO';
        let color = '#0056b3'; 

        if (type === 'ERROR') {
            prefix = 'ERROR';
            color = '#d9534f';
            console.error(message);
        } else if (type === 'SUCCESS') {
            prefix = 'SUCCESS';
            color = '#28a745';
            console.log(message);
        } else {
            console.log(message);
        }

        logEntry.style.color = color;
        logEntry.textContent = `[${timestamp}] ${prefix}: ${message}`;
        errorLog.prepend(logEntry);
    }

    logToSystem("Page loaded and script initialized.");
});