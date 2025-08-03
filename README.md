# Budget Travel Agent ✈️

Welcome to the Budget Travel Agent, a full-stack application powered by a multi-agent AI system designed to make travel planning simple, smart, and affordable. This tool leverages the CrewAI framework to create a team of specialized AI agents that collaborate to build personalized travel itineraries based on your budget and preferences.

Simply describe your ideal trip in a single prompt, and the AI crew will:

- **Understand Your Needs**: Extract key details like destination, dates, budget, and interests.
- **Gather Real-Time Data**: Check weather forecasts and live currency conversion rates.
- **Perform Smart Research**: Scour the web for the best deals on accommodations and activities.
- **Verify the Budget**: Ensure the entire plan aligns with your financial constraints.
- **Generate a Plan**: Deliver a complete, beautifully formatted itinerary.

This project showcases the power of collaborative AI agents in solving real-world problems, turning a complex task like travel planning into a seamless, conversational experience.

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.12** 
- **Node.js** (v18 or later is recommended)
- **npm** (usually comes with Node.js)

### Installation & Setup

Follow these steps to set up both the backend and frontend services.

#### 1. Clone the Repository

First, clone this repository to your local machine.

```bash
git clone https://github.com/your-username/travel-agent.git
cd travel-agent
```

#### 2. Backend Setup

The backend is powered by Python and FastAPI.

```bash
# Navigate to the backend directory
cd backend

# (Recommended) Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use venv\Scripts\activate

# Install the required Python packages
pip install -r requirements.txt

# Create a .env file for your API keys (see section below)
touch .env

# Run the backend server
python main.py
```

The backend server will start on `http://localhost:8000`.

#### 3. Frontend Setup

The frontend is a React application built with Vite.

```bash
# Navigate to the frontend directory from the root folder
cd frontend

# Install the necessary npm packages
npm i

# Start the frontend development server
npm run dev
```

The frontend application will be accessible at `http://localhost:8080`.

### Environment Variables (.env)

For the backend to function correctly, you need to provide API keys in a `.env` file inside the backend directory.

Create a file named `.env` and add the following keys:

```env
# Get your API key from https://serper.dev/
SERPER_API_KEY="your_serper_api_key"

# Get your API key from Google AI Studio
GEMINI_API_KEY="your_gemini_api_key"

# You can use the same Gemini key or a different one
GEMINIPRO_API_KEY="your_gemini_pro_api_key"

# Get your API key from https://openrouter.ai/
OPENROUTER_API_KEY2="your_openrouter_api_key"

# Get your MongoDB connection string from https://www.mongodb.com/
MONGO_URI="your_mongodb_connection_string"
```

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, CrewAI, MongoDB
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **AI & Tools**: Google Gemini, SerperDevTool for web searches

## 💡 How to Use

1. Ensure both the backend and frontend servers are running.
2. Open your browser and navigate to `http://localhost:8080`.
3. Create an account or sign in.
4. Start a new chat and enter a detailed prompt describing your travel plans.
5. Watch as the AI agents collaborate to build your personalized itinerary!