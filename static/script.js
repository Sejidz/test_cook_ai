document.addEventListener("DOMContentLoaded", () => {
    // --- Get DOM Elements ---
    const promptForm = document.getElementById("prompt-form");
    const userInput = document.getElementById("user-input");
    const aiResponse = document.getElementById("ai-response");
    const errorLog = document.getElementById("error-log");
    const submitButton = document.getElementById("submit-button");
    const mealButtonsContainer = document.getElementById("meal-buttons");
    const mealButtons = document.querySelectorAll(".meal-btn");
    const userInputLabel = document.getElementById("user-input-label");

    // Get View "Pages" and their content
    const requestView = document.getElementById("request-view");
    const recipeView = document.getElementById("recipe-view");
    const backButton = document.getElementById("back-button");
    const recipeTitle = document.getElementById("recipe-title");
    const recipeContent = document.getElementById("recipe-content");
    const heroImage = document.getElementById("hero-image");
    const cookButton = document.getElementById("cook-button");

    // --- Get Debug Panel Element & Toggle Button ---
    const debugPanelBody = document.getElementById("debug-panel-body");
    const debugSidebar = document.getElementById("debug-sidebar");
    const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");

    // --- Event Listener for Toggle Button ---
    toggleSidebarBtn.addEventListener("click", () => {
        debugSidebar.classList.toggle("sidebar-collapsed");
        // Change button text
        if (debugSidebar.classList.contains("sidebar-collapsed")) {
            toggleSidebarBtn.innerHTML = "&#x2192;"; // Right Arrow
            toggleSidebarBtn.title = "Open Panel";
        } else {
            toggleSidebarBtn.innerHTML = "&#x2190;"; // Left Arrow
            toggleSidebarBtn.title = "Close Panel";
        }
    });

    // --- State Variables ---
    let selectedMealType = "";
    let currentUserProfile = ""; // Stores the profile from Agent 1
    let currentRecipeOptions = []; // Stores the 4 options from Agent 2

    // --- UPDATED: Function to render a single agent log ---
    function addAgentLog(log) {
        // Create the <details> element
        const details = document.createElement('details');
        details.className = 'agent-log';
        
        // Create the <summary> element (the clickable title)
        const summary = document.createElement('summary');
        summary.className = 'agent-summary';
        summary.textContent = log.agent;
        details.appendChild(summary);

        // Create a div to hold the content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'agent-log-content';

        if (log.input) {
            const inputLabel = document.createElement('h5');
            inputLabel.textContent = 'Input (Exact Prompt)';
            contentDiv.appendChild(inputLabel);

            const inputPre = document.createElement('pre');
            inputPre.textContent = log.input;
            contentDiv.appendChild(inputPre);
        }

        if (log.output) {
            const outputLabel = document.createElement('h5');
            outputLabel.textContent = 'Output (Raw Response)';
            contentDiv.appendChild(outputLabel);

            const outputPre = document.createElement('pre');
            outputPre.textContent = log.output;
            contentDiv.appendChild(outputPre);
        }

        // Add the content to the <details> element
        details.appendChild(contentDiv);
        
        // Add the new log to the panel
        debugPanelBody.appendChild(details);

        // --- Auto-open the first log (User) and the most recent log ---
        // Close all others
        const allLogs = debugPanelBody.querySelectorAll('details.agent-log');
        allLogs.forEach((log, index) => {
            if (index === 0 || index === allLogs.length - 1) {
                log.open = true;
            } else {
                log.open = false;
            }
        });

        // Scroll to the bottom of the panel
        debugPanelBody.scrollTop = debugPanelBody.scrollHeight;
    }

    // --- Event Listener for Meal Buttons (Unchanged) ---
    mealButtonsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("meal-btn")) {
            const clickedButton = e.target;
            mealButtons.forEach(btn => btn.classList.remove("active"));
            clickedButton.classList.add("active");
            if (clickedButton.id === "btn-custom") {
                selectedMealType = "Custom";
                userInputLabel.style.display = 'block';
                userInput.style.display = 'block';
                userInputLabel.textContent = "Describe your custom situation:";
                userInput.placeholder = "e.g., 'I have leftover chicken and rice...'";
                logToSystem('Custom meal selected. Please provide details.');
            } else {
                selectedMealType = clickedButton.textContent;
                userInputLabel.style.display = 'none';
                userInput.style.display = 'none';
                userInput.value = ""; 
                logToSystem(`Meal type set to: ${selectedMealType}`);
            }
        }
    });

    // --- Form Submit Event Listener (Agent 1 & 2) ---
    promptForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        errorLog.innerHTML = "";
        aiResponse.innerHTML = ""; 
        
        // --- Clear debug panel on new request ---
        debugPanelBody.innerHTML = "";
        addAgentLog({ agent: "User", input: `Meal: ${selectedMealType}, Details: "${userInput.value}"`, output: "Requesting recipes..." });

        logToSystem("New request initiated...");

        const userText = userInput.value;
        if (!selectedMealType) {
            logToSystem("Please select a meal type.", 'ERROR'); return;
        }
        if (selectedMealType === "Custom" && !userText) {
            logToSystem("Please describe your custom situation.", 'ERROR'); return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Thinking...";
        aiResponse.innerHTML = "Loading... Agent 1 (Strategist) is generating your profile...";
        logToSystem("Calling Agent 1 (Strategist)...");

        try {
            const response = await fetch("/api/call-gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mealType: selectedMealType, userInput: userText }),
            });

            logToSystem(`Received response with status: ${response.status}`);
            const data = await response.json(); 

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            // --- Render agent logs ---
            if (data.agent_logs) {
                data.agent_logs.forEach(addAgentLog);
            }

            logToSystem("Agent 1 & 2 success. Storing profile and building recipe cards...");
            currentUserProfile = data.user_profile; 
            currentRecipeOptions = data.recipe_options;

            aiResponse.innerHTML = ""; // Clear "Loading..."
            
            data.recipe_options.forEach((recipe, index) => {
                const card = document.createElement("div");
                card.className = "recipe-card";
                card.dataset.recipeIndex = index; 

                const title = `<h3>${recipe.title}</h3>`;
                const summary = `<p>${recipe.summary}</p>`;
                const why = `<p><strong>Why it's perfect:</strong> ${recipe.why_perfect}</p>`;
                
                let ingredientsHTML = '';
                if (recipe.main_ingredients && Array.isArray(recipe.main_ingredients)) {
                    ingredientsHTML = `
                        <strong>Main Ingredients:</strong>
                        <ul>
                            ${recipe.main_ingredients.map(ing => `<li>${ing}</li>`).join('')}
                        </ul>
                    `;
                } else {
                    logToSystem(`Recipe "${recipe.title}" has no main_ingredients.`, 'INFO');
                    ingredientsHTML = '<p><strong>Main Ingredients:</strong> Not specified.</p>';
                }
                
                card.innerHTML = title + summary + why + ingredientsHTML;

                card.addEventListener("click", () => {
                    selectRecipe(recipe); 
                });
                
                aiResponse.appendChild(card);
            });
            logToSystem(`Successfully created ${data.recipe_options.length} selectable recipe cards.`, 'SUCCESS');

        } catch (error) {
            logToSystem(error.message, 'ERROR');
            addAgentLog({ agent: "System Error", output: error.message });
            aiResponse.textContent = "Failed to get response.";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Get Recipes";
            logToSystem("Process complete. Ready for new input.");
        }
    });

    // --- Function to handle recipe selection (Agent 3 Call) ---
    async function selectRecipe(recipe) {
        logToSystem(`User selected recipe: ${recipe.title}. Calling Agent 3...`);
        
        // --- Log user action to debug panel ---
        addAgentLog({ agent: "User Action", input: "Recipe Clicked", output: recipe.title });

        recipeTitle.textContent = recipe.title;
        heroImage.src = ""; 
        heroImage.style.display = "none"; 
        recipeContent.innerHTML = "Loading full recipe from Agent 3 (Chef)...";
        cookButton.style.display = "none";

        requestView.style.display = "none";
        recipeView.style.display = "block";
        window.scrollTo(0, 0); 

        try {
            const response = await fetch("/api/get-recipe-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_profile: currentUserProfile,
                    selected_dish_name: recipe.title
                })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            // --- Render agent logs ---
            if (data.agent_logs) {
                data.agent_logs.forEach(addAgentLog);
            }

            logToSystem("Agent 3 success. Rendering full recipe and hero image.");
            
            heroImage.src = data.hero_image_url;
            heroImage.style.display = "block";
            
            recipeContent.innerHTML = data.recipe_html;
            cookButton.style.display = "block";

        } catch (error) {
            logToSystem(error.message, 'ERROR');
            addAgentLog({ agent: "System Error", output: error.message });
            recipeContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    // --- Back Button Event Listener ---
    backButton.addEventListener("click", () => {
        logToSystem("User returned to recipe options.");
        // --- Log user action ---
        addAgentLog({ agent: "User Action", output: "Clicked 'Back to Options'" });
        recipeView.style.display = "none";
        requestView.style.display = "block";
    });

    // --- 'Let's Cook' Button ---
    cookButton.addEventListener("click", () => {
        logToSystem("User clicked 'Let's Cook!'");
        // --- Log user action ---
        addAgentLog({ agent: "User Action", output: "Clicked 'Let's Cook!'" });
        alert("Next step: Build the step-by-step cooking mode!");
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