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
    const heroImage = document.getElementById("hero-image");
    const cookButton = document.getElementById("cook-button");
    const recipeTabs = document.querySelector(".recipe-tabs");
    const ingredientsPanel = document.getElementById("ingredients-panel");
    const instructionsPanel = document.getElementById("instructions-panel");
    const nutritionPanel = document.getElementById("nutrition-panel");

    // --- Get Debug Panel Element & Toggle Button ---
    const debugPanelBody = document.getElementById("debug-panel-body");
    const debugSidebar = document.getElementById("debug-sidebar");
    const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");

    // --- Get Cooking Mode & Modal Elements ---
    const cookingModeView = document.getElementById("cooking-mode-view");
    const exitCookModeBtn = document.getElementById("exit-cook-mode-btn");
    const cookModeTitle = document.getElementById("cook-mode-title");
    const stepDisplayArea = document.getElementById("step-display-area");
    const stepDisplayNumber = document.getElementById("step-display-number");
    const stepDisplayInstruction = document.getElementById("step-display-instruction");
    const coachExplainStepBtn = document.getElementById("coach-explain-step-btn");
    const coachAskChatbotBtn = document.getElementById("coach-ask-chatbot-btn");
    const prevStepBtn = document.getElementById("prev-step-btn");
    const nextStepBtn = document.getElementById("next-step-btn");
    const chatbotModalBackdrop = document.getElementById("chatbot-modal-backdrop");
    const chatbotModalCloseBtn = document.getElementById("chatbot-modal-close-btn");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById('chat-input');
    const chatHistoryEl = document.getElementById('chat-history');
    const modalBackdrop = document.getElementById("modal-backdrop");
    const modalCloseBtn = document.getElementById("modal-close-btn");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    
    // --- NEW: Get Profile Data Tab Elements ---
    const profileTabs = document.querySelector(".profile-tabs");
    const profileIngredientsPanel = document.getElementById("profile-ingredients-panel");
    const profileCalendarPanel = document.getElementById("profile-calendar-panel");
    const profileRulesPanel = document.getElementById("profile-rules-panel");

    // --- State Variables ---
    let selectedMealType = "";
    let currentUserProfile = ""; 
    let currentRecipeOptions = []; 
    let currentRecipeHTML = ""; 
    let currentRecipeTitle = ""; 
    let currentRecipeForChatbot = ""; 
    let chatHistory = []; 
    let allStepsArray = []; 
    let currentStepIndex = 0; 
    
    // --- NEW: State for profile data ---
    let profileData = { ingredients: [], calendar: [], ruleset: [] };

    
    // --- ================================== --- */
    // --- PAGE INITIALIZATION & DATA LOADING --- */
    // --- ================================== --- */

    // --- NEW: Function to load all CSV data on page start ---
    async function loadProfileData() {
        try {
            const response = await fetch("/api/get-all-data");
            if (!response.ok) {
                throw new Error("Could not load profile data.");
            }
            profileData = await response.json();
            
            // Populate the new tabs
            renderIngredientsTable(profileData.ingredients);
            renderCalendarTable(profileData.calendar);
            renderRulesetTable(profileData.ruleset);
            
            logToSystem("Profile data loaded successfully.", "SUCCESS");

        } catch (error) {
            logToSystem(error.message, "ERROR");
            profileIngredientsPanel.innerHTML = `<p style="color: red;">${error.message}</p>`;
            profileCalendarPanel.innerHTML = `<p style="color: red;">${error.message}</p>`;
            profileRulesPanel.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }
    
    // --- NEW: Helper function to render Ingredients table ---
    function renderIngredientsTable(ingredients) {
        if (!ingredients || ingredients.length === 0) {
            profileIngredientsPanel.innerHTML = "<p>No ingredient data found.</p>";
            return;
        }
        
        let tableHTML = `<table class="data-table"><thead><tr>
            <th>Ingredient</th>
            <th>Availability</th>
            <th>Preference Score</th>
            <th>Edit Score</th>
            </tr></thead><tbody>`;
            
        ingredients.forEach(item => {
            tableHTML += `<tr>
                <td>${item.ingredient_name}</td>
                <td>${item.availability}</td>
                <td><span id="pref-score-${item.ingredient_id}">${parseFloat(item.preference_score).toFixed(2)}</span></td>
                <td class="preference-controls">
                    <button data-id="${item.ingredient_id}" class="pref-btn-decr">-</button>
                    <button data-id="${item.ingredient_id}" class="pref-btn-incr">+</button>
                </td>
            </tr>`;
        });
        
        tableHTML += `</tbody></table>`;
        profileIngredientsPanel.innerHTML = tableHTML;
    }
    
    // --- NEW: Helper function to render Calendar table ---
    function renderCalendarTable(calendar) {
        if (!calendar || calendar.length === 0) {
            profileCalendarPanel.innerHTML = "<p>No calendar data found.</p>";
            return;
        }
        // Just show the first 2 columns for brevity
        let tableHTML = `<table class="data-table"><thead><tr>
            <th>Date</th>
            <th>Day</th>
            <th>Time Available (min)</th>
            <th>Activity</th>
            </tr></thead><tbody>`;
            
        calendar.forEach(item => {
            tableHTML += `<tr>
                <td>${item.date}</td>
                <td>${item.day}</td>
                <td>${item.time_available_min}</td>
                <td>${item.special_events}</td>
            </tr>`;
        });
        tableHTML += `</tbody></table>`;
        profileCalendarPanel.innerHTML = tableHTML;
    }
    
    // --- NEW: Helper function to render Ruleset table ---
    function renderRulesetTable(ruleset) {
        if (!ruleset || ruleset.length === 0) {
            profileRulesPanel.innerHTML = "<p>No ruleset data found.</p>";
            return;
        }
        let tableHTML = `<table class="data-table"><thead><tr>
            <th>Category</th>
            <th>Description</th>
            <th>Enforcement</th>
            </tr></thead><tbody>`;
            
        ruleset.forEach(item => {
            tableHTML += `<tr>
                <td>${item.category}</td>
                <td>${item.description}</td>
                <td>${item.enforcement}</td>
            </tr>`;
        });
        tableHTML += `</tbody></table>`;
        profileRulesPanel.innerHTML = tableHTML;
    }
    
    // --- NEW: Event Listener for Profile Tabs ---
    profileTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('profile-tab-btn')) return;

        const targetTab = e.target.dataset.tab;

        // Update button active state
        document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update panel active state
        document.querySelectorAll('.profile-tab-panel').forEach(panel => {
            if (panel.id === `${targetTab}-panel`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    });

    // --- NEW: Event Listener for Preference Buttons ---
    profileIngredientsPanel.addEventListener('click', (e) => {
        if (!e.target.classList.contains('pref-btn-incr') && !e.target.classList.contains('pref-btn-decr')) {
            return;
        }
        
        const id = e.target.dataset.id;
        const scoreSpan = document.getElementById(`pref-score-${id}`);
        let currentScore = parseFloat(scoreSpan.textContent);
        
        if (e.target.classList.contains('pref-btn-incr')) {
            currentScore = Math.min(1.0, currentScore + 0.1); // Max 1.0
        } else {
            currentScore = Math.max(0.0, currentScore - 0.1); // Min 0.0
        }
        
        scoreSpan.textContent = currentScore.toFixed(2);
        
        // --- TODO: We would now send this updated score to the server to save it
        // For now, it just updates visually
        logToSystem(`Updated preference for ${id} to ${currentScore.toFixed(2)} (visual only).`);
    });

    
    // --- ================================== --- */
    // --- AGENT & APP LOGIC (Unchanged)    --- */
    // --- ================================== --- */

    // --- Event Listener for Toggle Button (Unchanged) ---
    toggleSidebarBtn.addEventListener("click", () => {
        debugSidebar.classList.toggle("sidebar-collapsed");
        if (debugSidebar.classList.contains("sidebar-collapsed")) {
            toggleSidebarBtn.innerHTML = "&#x2192;"; // Right Arrow
            toggleSidebarBtn.title = "Open Panel";
        } else {
            toggleSidebarBtn.innerHTML = "&#x2190;"; // Left Arrow
            toggleSidebarBtn.title = "Close Panel";
        }
    });

    // --- Function to render a single agent log (Unchanged) ---
    function addAgentLog(log) {
        // ... (function is unchanged) ...
        const details = document.createElement('details');
        details.className = 'agent-log';
        const summary = document.createElement('summary');
        summary.className = 'agent-summary';
        summary.textContent = log.agent;
        details.appendChild(summary);
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
        details.appendChild(contentDiv);
        debugPanelBody.appendChild(details);
        const allLogs = debugPanelBody.querySelectorAll('details.agent-log');
        allLogs.forEach((log, index) => {
            if (index === 0 || index === allLogs.length - 1) {
                log.open = true;
            } else {
                log.open = false;
            }
        });
        debugPanelBody.scrollTop = debugPanelBody.scrollHeight;
    }

    // --- Event Listener for Meal Buttons (Unchanged) ---
    mealButtonsContainer.addEventListener("click", (e) => {
        // ... (function is unchanged) ...
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

    // --- Form Submit Event Listener (Agent 1 & 2) (Unchanged) ---
    promptForm.addEventListener("submit", async (e) => {
        // ... (function is unchanged) ...
        e.preventDefault(); 
        errorLog.innerHTML = "";
        aiResponse.innerHTML = ""; 
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
                const img = document.createElement('div');
                img.className = 'recipe-card-image';
                const hash = recipe.title.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
                img.style.backgroundColor = "#" + "000000".substring(0, 6 - color.length) + color;
                img.style.backgroundImage = `url(/static/default_food.png)`;
                img.style.backgroundBlendMode = 'multiply';
                const content = document.createElement('div');
                content.className = 'recipe-card-content';
                let tagsHTML = '';
                if (recipe.tags && Array.isArray(recipe.tags)) {
                    tagsHTML = `
                        <div class="recipe-card-tags">
                            ${recipe.tags.map(tag => `<span class="recipe-card-tag">${tag}</span>`).join('')}
                        </div>
                    `;
                }
                const footer = `
                    <div class="recipe-card-footer">
                        Est. Cook Time: ${recipe.estimated_cook_time || 'N/A'}
                    </div>
                `;
                const title = `<h3>${recipe.title}</h3>`;
                const summary = `<p>${recipe.summary}</p>`;
                content.innerHTML = title + summary + tagsHTML + footer;
                card.appendChild(img);
                card.appendChild(content);
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

    // --- selectRecipe Function (Unchanged) ---
    async function selectRecipe(recipe) {
        // ... (function is unchanged) ...
        logToSystem(`User selected recipe: ${recipe.title}. Calling Agent 3...`);
        addAgentLog({ agent: "User Action", input: "Recipe Clicked", output: recipe.title });
        recipeTitle.textContent = recipe.title;
        heroImage.src = ""; 
        heroImage.style.display = "none";
        ingredientsPanel.innerHTML = "<p>Loading...</p>";
        instructionsPanel.innerHTML = "<p>Loading...</p>";
        nutritionPanel.innerHTML = "<p>Loading...</p>";
        cookButton.style.display = "none";
        requestView.style.display = "none";
        recipeView.style.display = "block";
        window.scrollTo(0, 0); 
        setupTabs();
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

            if (data.agent_logs) {
                data.agent_logs.forEach(addAgentLog);
            }

            logToSystem("Agent 3 success. Rendering full recipe and hero image.");
            
            heroImage.src = data.hero_image_url;
            heroImage.style.display = "block";
            
            currentRecipeHTML = data.recipe_html; 
            currentRecipeTitle = recipe.title;
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentRecipeHTML;

            const findTable = (text) => {
                let table = null;
                const paras = tempDiv.querySelectorAll('p');
                paras.forEach(p => {
                    if (p.textContent.toLowerCase().includes(text.toLowerCase())) {
                        if (p.nextElementSibling && p.nextElementSibling.tagName === 'TABLE') {
                            table = p.nextElementSibling;
                        }
                    }
                });
                return table;
            };

            const ingredientsTable = findTable("Quantified Ingredients");
            const instructionsTable = findTable("Instructions");
            const nutritionTable = findTable("Nutrition count");

            ingredientsPanel.innerHTML = ingredientsTable ? ingredientsTable.outerHTML : "<p>No ingredients found.</p>";
            instructionsPanel.innerHTML = instructionsTable ? instructionsTable.outerHTML : "<p>No instructions found.</p>";
            nutritionPanel.innerHTML = nutritionTable ? nutritionTable.outerHTML : "<p>No nutrition info found.</p>";

            cookButton.style.display = "block";

        } catch (error) {
            logToSystem(error.message, 'ERROR');
            addAgentLog({ agent: "System Error", output: error.message });
            ingredientsPanel.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }
    
    // --- setupTabs Function (Unchanged) ---
    function setupTabs() {
        // ... (function is unchanged) ...
        recipeTabs.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-btn')) return;
            const targetTab = e.target.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.tab-panel').forEach(panel => {
                if (panel.id === `${targetTab}-panel`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
        document.querySelector('.tab-btn[data-tab="ingredients"]').click();
    }

    // --- Back Button Event Listener (Unchanged) ---
    backButton.addEventListener("click", () => {
        // ... (function is unchanged) ...
        logToSystem("User returned to recipe options.");
        addAgentLog({ agent: "User Action", output: "Clicked 'Back to Options'" });
        recipeView.style.display = "none";
        requestView.style.display = "block";
    });

    
    // --- Cooking Mode Logic (All Unchanged) ---
    cookButton.addEventListener("click", () => {
        logToSystem("User clicked 'Let's Cook!'");
        addAgentLog({ agent: "User Action", output: "Clicked 'Let's Cook!'" });
        const instructionsTable = instructionsPanel.querySelector('table');
        if (!buildCookingSteps(instructionsTable)) {
            alert("Error: Could not parse cooking steps.");
            return;
        }
        recipeView.style.display = "none";
        cookingModeView.style.display = "block";
        cookModeTitle.textContent = `Cooking: ${currentRecipeTitle}`;
        chatHistory = [];
        chatHistoryEl.innerHTML = `
            <div class="chat-message bot">
                Hi! I'm your cooking assistant. I know the recipe and your current step. Ask me anything!
            </div>`;
        currentStepIndex = 0;
        displayCurrentStep();
    });

    function buildCookingSteps(instructionsTable) {
        allStepsArray = []; 
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentRecipeHTML;
        currentRecipeForChatbot = tempDiv.textContent || tempDiv.innerText;
        if (instructionsTable) {
            const rows = instructionsTable.querySelectorAll('tbody tr');
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const stepNumber = cells[0].textContent.trim();
                    const instructionText = cells[1].textContent.trim();
                    allStepsArray.push({
                        step: stepNumber,
                        instruction: instructionText
                    });
                }
            });
            return true; // Success
        } else {
            return false; // Failure
        }
    }
    
    function displayCurrentStep() {
        if (allStepsArray.length === 0) return;
        const stepData = allStepsArray[currentStepIndex];
        stepDisplayNumber.textContent = `Step ${stepData.step}`;
        stepDisplayInstruction.textContent = stepData.instruction;
        prevStepBtn.disabled = (currentStepIndex === 0);
        nextStepBtn.disabled = (currentStepIndex === allStepsArray.length - 1);
        currentActiveStep = stepData.step;
    }

    prevStepBtn.addEventListener('click', () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            displayCurrentStep();
            addAgentLog({ agent: "User Action", output: `Clicked 'Previous Step' (Now on Step ${currentActiveStep})` });
        }
    });

    nextStepBtn.addEventListener('click', () => {
        if (currentStepIndex < allStepsArray.length - 1) {
            currentStepIndex++;
            displayCurrentStep();
            addAgentLog({ agent: "User Action", output: `Clicked 'Next Step' (Now on Step ${currentActiveStep})` });
        }
    });

    exitCookModeBtn.addEventListener('click', () => {
        cookingModeView.style.display = "none";
        recipeView.style.display = "block";
        addAgentLog({ agent: "User Action", output: "Clicked 'Exit Cooking Mode'" });
    });

    coachExplainStepBtn.addEventListener('click', () => {
        const stepData = allStepsArray[currentStepIndex];
        showStepExplanation(stepData.step, stepData.instruction);
    });

    async function showStepExplanation(stepNumber, instructionText) {
        logToSystem(`User clicked Step ${stepNumber}: ${instructionText}`);
        addAgentLog({ agent: "User Action", input: `Clicked 'More Details' for Step ${stepNumber}`, output: instructionText });
        modalTitle.textContent = `Explanation for Step ${stepNumber}`;
        modalBody.innerHTML = "<p>Loading explanation from Agent 6 (Coach)...</p>";
        modalBackdrop.style.display = "flex";
        try {
            const response = await fetch("/api/explain-step", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instruction_text: instructionText,
                    recipe_context: currentRecipeForChatbot 
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Unknown error from Agent 6");
            }
            modalBody.innerHTML = data.explanation.replace(/\n/g, '<br>');
        } catch (error) {
            logToSystem(error.message, 'ERROR');
            modalBody.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }
    
    modalCloseBtn.addEventListener('click', () => {
        modalBackdrop.style.display = "none";
    });
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            modalBackdrop.style.display = "none";
        }
    });

    coachAskChatbotBtn.addEventListener('click', () => {
        chatbotModalBackdrop.style.display = "flex";
        chatHistory = [];
        chatHistoryEl.innerHTML = `
            <div class="chat-message bot">
                Hi! I'm here to help. I see you're on **Step ${currentActiveStep}**. What's your question?
            </div>`;
    });
    
    chatbotModalCloseBtn.addEventListener('click', () => {
        chatbotModalBackdrop.style.display = "none";
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = chatInput.value.trim();
        if (!question) return;
        addChatMessage(question, 'user');
        chatHistory.push({ "role": "user", "content": question });
        chatInput.value = "";
        try {
            const response = await fetch("/api/ask-chatbot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipe_context: currentRecipeForChatbot,
                    current_step: currentActiveStep,
                    chat_history: chatHistory
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Unknown error from Agent 7");
            }
            addChatMessage(data.answer, 'bot');
            chatHistory.push({ "role": "model", "content": data.answer });
        } catch (error) {
            logToSystem(error.message, 'ERROR');
            addChatMessage(`Sorry, I ran into an error: ${error.message}`, 'bot');
        }
    });
    
    function addChatMessage(message, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.textContent = message;
        chatHistoryEl.appendChild(msgDiv);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }


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

    // --- FINAL STEP: Load all data on start ---
    logToSystem("Page loaded and script initialized.");
    loadProfileData(); // This triggers the new data load
});