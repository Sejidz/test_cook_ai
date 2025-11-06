# AI Recipe Assistant

This is a multi-agent AI recipe assistant built with a Flask backend and a vanilla JavaScript frontend. It takes user context (from mock CSV files) and a meal request, generates four unique recipe options, and then provides a full "Let's Cook!" mode with a step-by-step AI coach and a conversational chatbot.

## 🚀 Getting Started

Follow these steps to get the application running locally.

### 1. Project Setup

1.  **Clone or Download:** Get all the project files (`app.py`, `index.html`, etc.) into a single directory.

2.  **Create a Virtual Environment** (Recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install Dependencies:**
    This project relies on several Python libraries. Create a file named `requirements.txt` in your project's root directory and paste the following into it:

    ```txt
    flask
    flask_cors
    google-generativeai
    markdown2
    python-dotenv
    ```

    Now, install them all by running:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Create Your Environment File:**
    The application needs a Google Gemini API key to function. Create a file named `.env` in the same directory and add your key:

    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

5.  **Data Files:**
    Make sure you have your three data files in the same directory:
    * `ingredients.csv`
    * `calendar.csv`
    * `ruleset.csv`

### 2. Running the Application

1.  **Start the Flask Server:**
    Run the `app.py` file from your terminal:
    ```bash
    python app.py
    ```
    You should see output indicating the server is running on `http://127.0.0.1:5000/`.

2.  **Open the Website:**
    Open your web browser and navigate to:
    [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

    The application should load, and you can start by selecting a meal type.

---

## 🤖 Agent Workflow and Structure

This project uses a **sequential agent chain**, where the output of one agent becomes the input for the next. The entire orchestration is handled by `app.py`.

Here is the flow:

1.  **User Input:** The user selects a meal type (e.g., "Dinner") on the frontend.

2.  **Agent 1 (Strategist):**
    * **Input:** The user's meal type *plus* the raw text from `ingredients.csv`, `calendar.csv`, and `ruleset.csv`.
    * **Output:** A plain text "User Profile Briefing" that synthesizes all constraints (e.g., "User is busy, has chicken and broccoli, prefers high-protein").

3.  **Agent 2 (Chef Options):**
    * **Input:** The "User Profile Briefing" from Agent 1.
    * **Output:** A text string formatted as a JSON array containing four distinct recipe options, each with a title, summary, and tags. This JSON is parsed by Flask and sent to the frontend to build the recipe cards.

4.  **User Selection:** The user clicks on one of the four recipe cards.

5.  **Agent 3 (Full Recipe):**
    * **Input:** The "User Profile Briefing" (from Agent 1) and the `selected_dish_name` (from the user's click).
    * **Output:** A full recipe formatted in Markdown, complete with tables for ingredients, instructions, and nutrition.

6.  **Agent 5 (The Judge):**
    * **Input:** The full Markdown recipe from Agent 3.
    * **Output:** A *corrected* version of the recipe. This agent critiques the cooking method, fixes any logical errors, and passes the finalized Markdown to the server.

7.  **Frontend Display:** The server converts the final Markdown to HTML and sends it to the frontend, which displays the ingredients, instructions, and nutrition in their respective tabs.

### Cooking Mode (A Separate Flow)

When the user clicks "Let's Cook!":

8.  **Agent 6 (Technique Coach):**
    * **Trigger:** User clicks the "More Details" button on a specific step.
    * **Input:** The text of the instruction (e.g., "Sauté the onions") and the full recipe context.
    * **Output:** A simple, beginner-friendly explanation of *how* to perform that single step.

9.  **Agent 7 (Chatbot):**
    * **Trigger:** User asks a question in the chatbot modal.
    * **Input:** The full recipe context, the current step number, and the entire chat history.
    * **Output:** A conversational answer to the user's question (e.g., "Yes, you can substitute olive oil for vegetable oil.").