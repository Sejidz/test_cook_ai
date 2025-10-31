import os
import json
import google.generativeai as genai
import markdown2  # We still need this for Agent 3's output
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# --- Gemini API Setup ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in the .env file.")

genai.configure(api_key=api_key)
agent_1_model = genai.GenerativeModel('gemini-2.0-flash-exp') # Strategist
agent_2_model = genai.GenerativeModel('gemini-2.0-flash-exp') # Chef (Options)
agent_3_model = genai.GenerativeModel('gemini-2.0-flash-exp') # Chef (Full Recipe)
# agent_4_model = ... # We will add the Image model (e.g., Imagen) here later

# --- AGENT 1: STRATEGIST PROMPT (Unchanged from before) ---
AGENT_1_PROMPT_TEMPLATE = """<SYSTEM>
You are a Senior AI Test Data Strategist...
</SYSTEM>
<TASK>
...
</TASK>
<CONTEXT>
...
</CONTEXT>
<FORMAT>
...
---
**User Profile Briefing: [Persona Name & Archetype]**
...
---
</FORMAT>
<PROCESS>
...
</PROCESS>
<USER DATA FILES>
Here is all the data you must use:
[Available Ingredients]
{{INGREDIENTS_CSV}}
[Calendar & Events]
{{CALENDAR_CSV}}
[Dietary Ruleset]
{{RULESET_CSV}}
[User's Direct Request]
- Meal Type: {{MEAL_TYPE}}
- Custom Details: "{{USER_INPUT}}"
</USER DATA FILES>
"""

# --- AGENT 2: CHEF (OPTIONS) PROMPT (Unchanged from before) ---
AGENT_2_PROMPT_TEMPLATE = """You are "Chef AI," an expert culinary assistant.
Your goal is to generate 4 distinct recipe options...
...
Return **only the JSON array**. No extra commentary, markdown, or "```json" wrappers.
---
[User Profile Briefing]
{{USER_PROFILE_BRIEFING}}
---
[Available Ingredients]
{{INGREDIENTS_CSV}}
---
"""

# --- NEW: AGENT 3: CHEF (FULL RECIPE) PROMPT ---
# This is the new prompt you provided.
AGENT_3_PROMPT_TEMPLATE = """You are "Chef AI," an expert culinary assistant and creative chef.
You will be given a [User Profile Briefing], a list of [Available Ingredients], and a [Selected Dish Name].
Your task is to create the full, detailed recipe for that selected dish.
Use all possible references you might need that is available on the internet to arrive at a polished output.

The meal must adhere to the following criteria:
1.  **Ease of Preparation:** The recipe must be genuinely easy to prepare, suitable for a student kitchen with basic equipment.
2.  **Delicious & Appealing:** The meal should be delicious and appealing.
3.  **Core Ingredient Utilization:** The recipe must use the [Available Ingredients] as primary components. Ingredients listed as "Optional Extras" in the initial idea can be included, but should be marked as optional.

--- TASK ---
Present your recipe in the following specific format.
Return **only this text and the tables**. No extra commentary before or after.

Dish name: {{SELECTED_DISH_NAME}}
Description: [A 1-2 sentence description of the final dish]

Quantified Ingredients (per serving)
| Ingredient | Quantity | Notes (e.g., "chopped", "optional") |
|------------|----------|-------------------------------------|
| [Ingredient 1] | [e.g., 100g] | [e.g., "diced"] |
| [Ingredient 2] | [e.g., 1 tbsp] | [e.g., "optional"] |
| ... | ... | ... |

Instructions
| step no | instructions |
|---------|--------------|
| 1 | [First step] |
| 2 | [Second step] |
| ... | ... |

Nutrition count (numeric data, per servin)
| Nutrient | Amount |
|----------|--------|
| Calories | [e.g., 450 kcal] |
| Protein | [e.g., 30g] |
| Fat | [e.g., 15g] |
| Carbs | [e.g., 50g] |

---
[User Profile Briefing]
{{USER_PROFILE_BRIEFING}}
---
[Available Ingredients]
{{INGREDIENTS_CSV}}
---
"""


# --- Helper function (Unchanged) ---
def read_file_content(filename):
    """Safely reads the content of a file."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""
    except Exception as e:
        return f"[Error reading file: {e}]"


# --- Frontend Route (Unchanged) ---
@app.route('/')
def index():
    return render_template('index.html')


# --- API Route 1: /api/call-gemini (MODIFIED) ---
@app.route('/api/call-gemini', methods=['POST'])
def call_gemini():
    # This endpoint now runs Agent 1 and Agent 2
    try:
        data = request.get_json()
        meal_type = data.get('mealType')
        user_input = data.get('userInput', '') 
        if not meal_type:
            return jsonify({"error": "mealType is required"}), 400

        # --- Read Data Files ---
        ingredients_data = read_file_content('ingredients.csv')
        calendar_data = read_file_content('calendar.csv')
        ruleset_data = read_file_content('ruleset.csv')

        # --- AGENT 1 (STRATEGIST) EXECUTION ---
        print("--- Calling Agent 1 (Strategist) ---")
        agent_1_prompt = AGENT_1_PROMPT_TEMPLATE.replace("{{INGREDIENTS_CSV}}", ingredients_data)
        agent_1_prompt = agent_1_prompt.replace("{{CALENDAR_CSV}}", calendar_data)
        agent_1_prompt = agent_1_prompt.replace("{{RULESET_CSV}}", ruleset_data)
        agent_1_prompt = agent_1_prompt.replace("{{MEAL_TYPE}}", meal_type)
        agent_1_prompt = agent_1_prompt.replace("{{USER_INPUT}}", user_input)
        
        response_1 = agent_1_model.generate_content(agent_1_prompt)
        user_profile_briefing = response_1.text
        print("--- Agent 1 Success: Profile Generated ---")

        # --- AGENT 2 (CHEF AI) EXECUTION ---
        print("--- Calling Agent 2 (Chef AI) ---")
        agent_2_prompt = AGENT_2_PROMPT_TEMPLATE.replace("{{USER_PROFILE_BRIEFING}}", user_profile_briefing)
        agent_2_prompt = agent_2_prompt.replace("{{INGREDIENTS_CSV}}", ingredients_data)

        response_2 = agent_2_model.generate_content(agent_2_prompt)
        
        # 3. Clean and parse the JSON response from Agent 2
        try:
            cleaned_text = response_2.text.strip().lstrip("```json").rstrip("```")
            recipes_json = json.loads(cleaned_text)
            
            # --- NEW: Return BOTH profile and recipes ---
            return jsonify({
                "user_profile": user_profile_briefing,
                "recipe_options": recipes_json
            })

        except json.JSONDecodeError:
            print(f"Agent 2 failed to return valid JSON. Raw response: {response_2.text}")
            return jsonify({"error": "The AI Chef returned an invalid response. Please try again."}), 500

    except Exception as e:
        print(f"An error occurred: {e}") 
        return jsonify({"error": str(e)}), 500


# --- NEW API Route 2: /api/get-recipe-details ---
@app.route('/api/get-recipe-details', methods=['POST'])
def get_recipe_details():
    # This endpoint runs Agent 3 and (in the future) Agent 4
    try:
        data = request.get_json()
        user_profile = data.get('user_profile')
        selected_dish_name = data.get('selected_dish_name')

        if not user_profile or not selected_dish_name:
            return jsonify({"error": "Missing user_profile or selected_dish_name"}), 400
        
        print(f"--- Calling Agent 3 for dish: {selected_dish_name} ---")
        
        # Read ingredients data again (it's fast and stateless)
        ingredients_data = read_file_content('ingredients.csv')
        
        # --- AGENT 3 (FULL RECIPE) EXECUTION ---
        agent_3_prompt = AGENT_3_PROMPT_TEMPLATE.replace("{{USER_PROFILE_BRIEFING}}", user_profile)
        agent_3_prompt = agent_3_prompt.replace("{{INGREDIENTS_CSV}}", ingredients_data)
        agent_3_prompt = agent_3_prompt.replace("{{SELECTED_DISH_NAME}}", selected_dish_name)

        response_3 = agent_3_model.generate_content(agent_3_prompt)
        recipe_details_markdown = response_3.text
        print("--- Agent 3 Success: Full Recipe Generated ---")
        
        # --- AGENT 4 (IMAGE GEN) - PLACEHOLDER ---
        # In the future, we will add the Agent 4 call here.
        # agent_4_prompt = f"Create a photorealistic hero image for: {recipe_details_markdown}"
        # hero_image_url = agent_4_model.generate_image(agent_4_prompt)
        # For now, we just send a placeholder URL.
        hero_image_url = "[https.via.placeholder.com/800x400.png?text=Hero+Image+from+Agent+4](https://https.via.placeholder.com/800x400.png?text=Hero+Image+from+Agent+4)"

        # --- Format Output ---
        # Convert Agent 3's Markdown output to HTML
        recipe_details_html = markdown2.markdown(recipe_details_markdown, extras=["tables"])
        
        return jsonify({
            "hero_image_url": hero_image_url,
            "recipe_html": recipe_details_html
        })

    except Exception as e:
        print(f"An error occurred in Agent 3: {e}")
        return jsonify({"error": str(e)}), 500

# --- Run the App (Unchanged) ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)