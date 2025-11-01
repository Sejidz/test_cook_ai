import os
import json
import google.generativeai as genai
import markdown2
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import prompts  # Import your prompts file

# --- Configuration ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# --- Gemini API Setup ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in the .env file.")

genai.configure(api_key=api_key)

# --- MODEL UPDATES ---
agent_1_model = genai.GenerativeModel('gemini-2.5-flash') # Strategist
agent_2_model = genai.GenerativeModel('gemini-2.5-flash') # Chef (Options)
agent_3_model = genai.GenerativeModel('gemini-2.5-flash') # Chef (Full Recipe)
agent_5_model = genai.GenerativeModel('gemini-2.5-flash') # NEW: The Judge


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


# --- API Route 1: /api/call-gemini (Unchanged) ---
@app.route('/api/call-gemini', methods=['POST'])
def call_gemini():
    try:
        agent_logs = []
        
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
        agent_1_prompt = prompts.AGENT_1_PROMPT_TEMPLATE.replace("{{INGREDIENTS_CSV}}", ingredients_data)
        agent_1_prompt = agent_1_prompt.replace("{{CALENDAR_CSV}}", calendar_data)
        agent_1_prompt = agent_1_prompt.replace("{{RULESET_CSV}}", ruleset_data)
        agent_1_prompt = agent_1_prompt.replace("{{MEAL_TYPE}}", meal_type)
        agent_1_prompt = agent_1_prompt.replace("{{USER_INPUT}}", user_input)
        
        response_1 = agent_1_model.generate_content(agent_1_prompt)
        user_profile_briefing = response_1.text
        
        agent_logs.append({
            "agent": "Agent 1 (Strategist)",
            "input": agent_1_prompt,
            "output": user_profile_briefing
        })
        print("--- Agent 1 Success: Profile Generated ---")

        # --- AGENT 2 (CHEF AI) EXECUTION ---
        print("--- Calling Agent 2 (Chef AI) ---")
        agent_2_prompt = prompts.AGENT_2_PROMPT_TEMPLATE.replace("{{USER_PROFILE_BRIEFING}}", user_profile_briefing)
        agent_2_prompt = agent_2_prompt.replace("{{INGREDIENTS_CSV}}", ingredients_data)

        response_2 = agent_2_model.generate_content(agent_2_prompt)
        
        try:
            cleaned_text = response_2.text.strip().lstrip("```json").rstrip("```")
            recipes_json = json.loads(cleaned_text)
            
            agent_logs.append({
                "agent": "Agent 2 (Chef Options)",
                "input": agent_2_prompt,
                "output": json.dumps(recipes_json, indent=2) # Pretty-print the JSON
            })
            
            return jsonify({
                "user_profile": user_profile_briefing,
                "recipe_options": recipes_json,
                "agent_logs": agent_logs # Send the logs
            })

        except json.JSONDecodeError:
            print(f"Agent 2 failed to return valid JSON. Raw response: {response_2.text}")
            return jsonify({"error": "The AI Chef returned an invalid response. Please try again."}), 500

    except Exception as e:
        print(f"An error occurred: {e}") 
        return jsonify({"error": str(e)}), 500


# --- API Route 2: /api/get-recipe-details (MODIFIED for Agent 5) ---
@app.route('/api/get-recipe-details', methods=['POST'])
def get_recipe_details():
    # This endpoint now runs Agent 3, then Agent 5.
    try:
        agent_logs = []
        
        data = request.get_json()
        user_profile = data.get('user_profile')
        selected_dish_name = data.get('selected_dish_name')

        if not user_profile or not selected_dish_name:
            return jsonify({"error": "Missing user_profile or selected_dish_name"}), 400
        
        print(f"--- Calling Agent 3 for dish: {selected_dish_name} ---")
        
        ingredients_data = read_file_content('ingredients.csv')
        
        # --- AGENT 3 (FULL RECIPE) EXECUTION ---
        agent_3_prompt = prompts.AGENT_3_PROMPT_TEMPLATE.replace("{{USER_PROFILE_BRIEFING}}", user_profile)
        agent_3_prompt = agent_3_prompt.replace("{{INGREDIENTS_CSV}}", ingredients_data)
        agent_3_prompt = agent_3_prompt.replace("{{SELECTED_DISH_NAME}}", selected_dish_name) 

        response_3 = agent_3_model.generate_content(agent_3_prompt)
        recipe_details_markdown = response_3.text # This is the "raw" recipe
        
        agent_logs.append({
            "agent": "Agent 3 (Full Recipe)",
            "input": agent_3_prompt,
            "output": recipe_details_markdown
        })
        print("--- Agent 3 Success: Full Recipe Generated ---")
        
        
        # --- NEW: AGENT 5 (JUDGE) EXECUTION ---
        print("--- Calling Agent 5 (Judge) to critique recipe ---")
        agent_5_prompt = prompts.AGENT_5_PROMPT_TEMPLATE.replace("{{RECIPE_MARKDOWN}}", recipe_details_markdown)
        
        response_5 = agent_5_model.generate_content(agent_5_prompt)
        judged_recipe_markdown = response_5.text # This is the "corrected" recipe
        
        agent_logs.append({
            "agent": "Agent 5 (Culinary Judge)",
            "input": agent_5_prompt,
            "output": judged_recipe_markdown
        })
        print("--- Agent 5 Success: Recipe Judged ---")

        
        # --- Static Image Selection ---
        hero_image_url = "/static/default_food.png"
        print(f"--- Using static image: {hero_image_url} ---")
        
        agent_logs.append({
            "agent": "Agent 4 (Image Placeholder)",
            "input": f"Request for: {selected_dish_name}",
            "output": f"Serving static image: {hero_image_url}"
        })

        # --- Format Output ---
        # We convert the FINAL "judged" recipe to HTML
        recipe_details_html = markdown2.markdown(judged_recipe_markdown, extras=["tables"])
        
        return jsonify({
            "hero_image_url": hero_image_url,
            "recipe_html": recipe_details_html,
            "agent_logs": agent_logs # Send all logs
        })

    except Exception as e:
        print(f"An error occurred in Agent 3 or 5: {e}")
        return jsonify({"error": str(e)}), 500


# --- Run the App (Unchanged) ---
if __name__ == '__main__':
    # This command makes Debug Mode ON
    app.run(debug=True, port=5000)