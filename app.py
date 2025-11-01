import os
import json
import re # <-- NEW: Import Regular Expressions
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
agent_5_model = genai.GenerativeModel('gemini-2.5-flash') # The Judge
agent_6_model = genai.GenerativeModel('gemini-2.5-flash') # Technique Coach
agent_7_model = genai.GenerativeModel('gemini-2.5-flash') # Chatbot


# --- ================================== --- */
# --- NEW: HELPER FUNCTIONS (MODIFIED) --- */
# --- ================================== --- */

def clean_file_content(file_content):
    """
    Removes tags and extra newlines from raw text.
    """
    # Remove tags
    cleaned_text = re.sub(r'\\s*', '', file_content)
    # Remove lines that are just '|' or empty
    cleaned_lines = [line for line in cleaned_text.splitlines() if line.strip() and line.strip() != '|']
    return "\n".join(cleaned_lines)

def read_markdown_table_as_json(filename):
    """
    Custom parser to read the user's pipe-delimited Markdown tables
    (even with [source] tags) and return a list of dictionaries (JSON).
    """
    if not os.path.exists(filename):
        return []
        
    try:
        raw_content = ""
        with open(filename, mode='r', encoding='utf-8') as f:
            raw_content = f.read()
        
        # Clean the content first
        cleaned_content = clean_file_content(raw_content)
        lines = cleaned_content.splitlines()
        
        if len(lines) < 2: # Need at least header and one data line (separator is optional for parser)
             return []

        header_line = ""
        separator_line_index = -1
        
        # Find the header line and the separator line
        for i, line in enumerate(lines):
            if '|' in line and '---' in line:
                separator_line_index = i
                header_line = lines[i-1] # Header is the line *before* the separator
                break
        
        # If no separator was found, assume line 0 is header
        if separator_line_index == -1:
            header_line = lines[0]
            separator_line_index = 0 # Read data from next line

        # Clean and split the header line
        header_line = header_line.strip()
        if header_line.startswith('|'): header_line = header_line[1:]
        if header_line.endswith('|'): header_line = header_line[:-1]
        headers = [h.strip() for h in header_line.split('|')]
        
        data_rows = []
        # Loop from the line *after* the separator
        for line in lines[separator_line_index + 1:]:
            line = line.strip()
            if not line or '---' in line: # Skip empty lines or extra separators
                continue
            
            # Clean and split the data line
            if line.startswith('|'): line = line[1:]
            if line.endswith('|'): line = line[:-1]
            values = [v.strip() for v in line.split('|')]
            
            # Handle rows that might be broken by newlines
            if len(values) < len(headers):
                # This is a partial row. Assume it belongs to the previous row.
                # This is a simple merge, might need refinement
                if data_rows:
                    last_row_values = list(data_rows[-1].values())
                    # Find where the data broke and append
                    # This is complex, for now, we'll just skip broken lines
                    print(f"Skipping broken line: {line}")
                continue
            
            if len(values) == len(headers):
                data_rows.append(dict(zip(headers, values)))
                
        return data_rows

    except Exception as e:
        print(f"Error reading file {filename}: {e}")
        return []

def read_file_as_raw_text(filename):
    """
    Reads the entire content of a file as a single string,
    but cleans it first so the AI doesn't see [source] tags.
    """
    if not os.path.exists(filename):
        return ""
    try:
        raw_content = ""
        with open(filename, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        return clean_file_content(raw_content)
    except Exception as e:
        return f"[Error reading file: {e}]"


# --- ================================== --- */
# --- FLASK ROUTES START HERE          --- */
# --- ================================== --- */

# --- Frontend Route (Unchanged) ---
@app.route('/')
def index():
    return render_template('index.html')


# --- API Route to load all CSV data (MODIFIED) ---
@app.route('/api/get-all-data', methods=['GET'])
def get_all_data():
    try:
        # Use our new Markdown table parser
        ingredients_data = read_markdown_table_as_json('ingredients.csv')
        calendar_data = read_markdown_table_as_json('calendar.csv')
        ruleset_data = read_markdown_table_as_json('ruleset.csv')
        
        return jsonify({
            "ingredients": ingredients_data,
            "calendar": calendar_data,
            "ruleset": ruleset_data
        })
    except Exception as e:
        print(f"Error in get_all_data: {e}")
        return jsonify({"error": str(e)}), 500


# --- API Route 1: /api/call-gemini (MODIFIED) ---
@app.route('/api/call-gemini', methods=['POST'])
def call_gemini():
    try:
        agent_logs = []
        
        data = request.get_json()
        meal_type = data.get('mealType')
        user_input = data.get('userInput', '') 
        if not meal_type:
            return jsonify({"error": "mealType is required"}), 400

        # --- Read Data Files (MODIFIED) ---
        # We send the RAW, CLEANED text to the AI
        ingredients_data = read_file_as_raw_text('ingredients.csv')
        calendar_data = read_file_as_raw_text('calendar.csv')
        ruleset_data = read_file_as_raw_text('ruleset.csv')

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
                "output": json.dumps(recipes_json, indent=2) 
            })
            
            return jsonify({
                "user_profile": user_profile_briefing,
                "recipe_options": recipes_json,
                "agent_logs": agent_logs 
            })

        except json.JSONDecodeError:
            print(f"Agent 2 failed to return valid JSON. Raw response: {response_2.text}")
            return jsonify({"error": "The AI Chef returned an invalid response. Please try again."}), 500

    except Exception as e:
        print(f"An error occurred: {e}") 
        return jsonify({"error": str(e)}), 500


# --- API Route 2: /api/get-recipe-details (MODIFIED) ---
@app.route('/api/get-recipe-details', methods=['POST'])
def get_recipe_details():
    try:
        agent_logs = []
        
        data = request.get_json()
        user_profile = data.get('user_profile')
        selected_dish_name = data.get('selected_dish_name')

        if not user_profile or not selected_dish_name:
            return jsonify({"error": "Missing user_profile or selected_dish_name"}), 400
        
        print(f"--- Calling Agent 3 for dish: {selected_dish_name} ---")
        
        # Read raw ingredient text for the AI
        ingredients_data = read_file_as_raw_text('ingredients.csv')
        
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
        
        
        # --- AGENT 5 (JUDGE) EXECUTION ---
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
        recipe_details_html = markdown2.markdown(judged_recipe_markdown, extras=["tables"])
        
        return jsonify({
            "hero_image_url": hero_image_url,
            "recipe_html": recipe_details_html,
            "agent_logs": agent_logs 
        })

    except Exception as e:
        print(f"An error occurred in Agent 3 or 5: {e}")
        return jsonify({"error": str(e)}), 500


# --- API ROUTE 3: /api/explain-step (Unchanged) ---
@app.route('/api/explain-step', methods=['POST'])
def explain_step():
    try:
        data = request.get_json()
        instruction = data.get('instruction_text')
        recipe_context = data.get('recipe_context')

        if not instruction or not recipe_context:
            return jsonify({"error": "Missing instruction or recipe context"}), 400

        print(f"--- Calling Agent 6 (Coach) for step: {instruction} ---")

        # --- AGENT 6 (TECHNIQUE COACH) EXECUTION ---
        agent_6_prompt = prompts.AGENT_6_PROMPT_TEMPLATE.replace("{{FULL_RECIPE_CONTEXT}}", recipe_context)
        agent_6_prompt = agent_6_prompt.replace("{{INSTRUCTION_TEXT}}", instruction)

        response_6 = agent_6_model.generate_content(agent_6_prompt)
        explanation_text = response_6.text

        print("--- Agent 6 Success: Explanation Generated ---")

        return jsonify({
            "explanation": explanation_text
        })

    except Exception as e:
        print(f"An error occurred in Agent 6: {e}")
        return jsonify({"error": str(e)}), 500


# --- API ROUTE 4: /api/ask-chatbot (Unchanged) ---
@app.route('/api/ask-chatbot', methods=['POST'])
def ask_chatbot():
    try:
        data = request.get_json()
        recipe_context = data.get('recipe_context')
        current_step = data.get('current_step')
        chat_history = data.get('chat_history') 

        if not recipe_context or not current_step or not chat_history:
            return jsonify({"error": "Missing recipe, step, or chat history"}), 400

        print(f"--- Calling Agent 7 (Chatbot) for step: {current_step} ---")

        # --- Format the chat history for the AI ---
        formatted_history = ""
        for message in chat_history:
            if message['role'] == 'user':
                formatted_history += f"User: {message['content']}\n"
            else:
                formatted_history += f"Bot: {message['content']}\n"

        # --- AGENT 7 (CHATBOT) EXECUTION ---
        agent_7_prompt = prompts.AGENT_7_PROMPT_TEMPLATE.replace("{{FULL_RECIPE_CONTEXT}}", recipe_context)
        agent_7_prompt = agent_7_prompt.replace("{{CURRENT_STEP}}", str(current_step))
        agent_7_prompt = agent_7_prompt.replace("{{CHAT_HISTORY}}", formatted_history)

        response_7 = agent_7_model.generate_content(agent_7_prompt)
        bot_response = response_7.text

        print("--- Agent 7 Success: Chat Response Generated ---")

        return jsonify({
            "answer": bot_response
        })

    except Exception as e:
        print(f"An error occurred in Agent 7: {e}")
        return jsonify({"error": str(e)}), 500


# --- Run the App (Unchanged) ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)