import os
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
app = Flask(__name__)
# Enable CORS (Cross-Origin Resource Sharing) to allow our frontend
# to talk to this backend, even if they run on different ports.
CORS(app) 

# Configure the Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in the .env file.")
    
genai.configure(api_key=api_key)
# Use this for a fast, modern model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Or, use this for the more powerful model
# model = genai.GenerativeModel('gemini-1.5-pro')

# --- Frontend Route ---
# This route will serve our index.html file
@app.route('/')
def index():
    # Renders the index.html file from the same directory
    return render_template('index.html')

# --- API Route ---
# This is the endpoint our JavaScript will call
@app.route('/api/call-gemini', methods=['POST'])
def call_gemini():
    try:
        # 1. Get the prompt from the frontend's request
        data = request.get_json()
        if not data or 'prompt' not in data:
            # Send a clear error back to the frontend
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt = data['prompt']

        # 2. Call the Gemini API
        response = model.generate_content(prompt)
        ai_response_text = response.text

        # 3. Send the AI's response back to the frontend
        return jsonify({"response": ai_response_text})

    except Exception as e:
        # 4. Handle any other errors (e.g., API errors)
        print(f"An error occurred: {e}") # Server-side log
        # Send a JSON error message to the frontend's error log
        return jsonify({"error": str(e)}), 500

# --- Run the App ---
if __name__ == '__main__':
    # Runs the server on http://127.0.0.1:5000
    app.run(debug=True, port=5000)