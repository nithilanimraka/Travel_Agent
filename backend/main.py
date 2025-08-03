import os
from dotenv import load_dotenv
from functools import lru_cache
from crewai import LLM, Agent, Task, Crew, Process
from datetime import datetime
import requests
import json
from crewai.tools import tool
from crewai_tools import SerperDevTool
import re
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
import time
from passlib.context import CryptContext

# Import your database collections and travel_chatbot functions
from database import users_collection, chats_collection
from travel_chatbot import (
    create_setup_crew,
    invoke_agent,
    extract_json_from_response,
    human_input_tool,
)

# Load environment variables
load_dotenv()
os.environ["SERPER_API_KEY"] = os.getenv("SERPER_API_KEY")

app = FastAPI(title="Travel Chatbot API")

# CORS Middleware
origins = ["http://localhost:8080", "http://127.0.0.1:8080"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Pydantic Models ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ChatMessage(BaseModel):
    session_id: str
    user_email: str
    content: str
    sender: str

class ChatbotRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None

class ChatbotResponse(BaseModel):
    session_id: str
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
    requires_input: bool = False
    input_question: Optional[str] = None

class HumanInputRequest(BaseModel):
    session_id: str
    response: str

# Add these new Pydantic models for the history response
class ChatHistoryItem(BaseModel):
    session_id: str
    title: str
    timestamp: datetime

# In-memory session storage for active chats
sessions: Dict[str, Dict[str, Any]] = {}

# --- Authentication Endpoints ---
@app.post("/auth/signup")
async def signup(user: UserCreate):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = pwd_context.hash(user.password)
    user_data = user.model_dump()
    user_data["hashed_password"] = hashed_password
    del user_data["password"]
    users_collection.insert_one(user_data)
    return {"message": "User created successfully"}

@app.post("/auth/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"message": "Login successful", "user": {"name": db_user["name"], "email": db_user["email"]}}

@app.get("/chats/history/{user_email}", response_model=List[ChatHistoryItem])
async def get_chat_history(user_email: str):
    """
    Retrieves the chat history for a user, grouped by session.
    Each session is represented by its first message.
    """
    pipeline = [
        # Find all messages for the given user
        {"$match": {"user_email": user_email, "sender": "user"}},
        # Sort messages by timestamp to find the first one in each session
        {"$sort": {"timestamp": 1}},
        # Group by session_id and get the first message content as the title
        {
            "$group": {
                "_id": "$session_id",
                "title": {"$first": "$content"},
                "timestamp": {"$first": "$timestamp"}
            }
        },
        # Sort the sessions themselves by the most recent
        {"$sort": {"timestamp": -1}},
        # Format the output
        {
            "$project": {
                "session_id": "$_id",
                "title": {"$substr": ["$title", 0, 50]}, # Truncate title for preview
                "timestamp": 1,
                "_id": 0
            }
        }
    ]
    history = list(chats_collection.aggregate(pipeline))
    return history

# --- NEW: Endpoint to get messages for one session ---
@app.get("/chats/session/{session_id}")
async def get_session_messages(session_id: str):
    """Retrieves all messages for a specific session, sorted by time."""
    messages_cursor = chats_collection.find(
        {"session_id": session_id}
    ).sort("timestamp", 1)
    
    messages = []
    for msg in messages_cursor:
        # Convert ObjectId to string for JSON serialization
        msg["_id"] = str(msg["_id"])
        messages.append(msg)

    if not messages:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return messages

# --- Chat Message Saving Endpoint ---
@app.post("/chats/messages")
async def save_chat_message(message: ChatMessage):
    message_data = message.model_dump()
    message_data["timestamp"] = datetime.utcnow()
    chats_collection.insert_one(message_data)
    return {"message": "Message saved successfully"}

# --- Background Crew Task ---
def run_crew_task(session_id: str, initial_prompt: str):
    try:
        # Create a more robust human input function for this session
        def get_human_input_for_session(question: str) -> str:
            # Store the question and set status to awaiting input
            sessions[session_id]["pending_input"] = question
            sessions[session_id]["status"] = "awaiting_input"
            
            # Wait for the frontend to provide a response
            timeout = 300  # 5 minutes timeout
            start_time = time.time()
            
            while sessions[session_id].get("human_response") is None:
                time.sleep(1)
                # Check for timeout
                if time.time() - start_time > timeout:
                    sessions[session_id]["status"] = "error"
                    sessions[session_id]["error"] = "Input timeout"
                    return "Timeout - no response received"
            
            # Get the response and clean up
            response = sessions[session_id].pop("human_response")
            sessions[session_id]["pending_input"] = None
            sessions[session_id]["status"] = "in_progress"
            
            # Store the question and response in session history
            if "conversation_history" not in sessions[session_id]:
                sessions[session_id]["conversation_history"] = []
            
            sessions[session_id]["conversation_history"].append({
                "question": question,
                "response": response,
                "timestamp": datetime.utcnow()
            })
            
            return response
        
        # Replace the human_input_tool function with our session-specific one
        human_input_tool.func = get_human_input_for_session
        
        # Initialize session state if needed
        if "conversation_history" not in sessions[session_id]:
            sessions[session_id]["conversation_history"] = []
        
        # Check if we are in the middle of a conversation
        if sessions[session_id].get("trip_details"):
            trip_details = sessions[session_id]["trip_details"]
            
            # Construct a comprehensive chat history
            history_items = []
            for item in sessions[session_id].get("conversation_history", []):
                history_items.append(f"Question: {item['question']}")
                history_items.append(f"Answer: {item['response']}")
            
            history_text = "\n".join(history_items)
            
            chat_history = f"""
            Previous conversation:
            {history_text}
            
            Previous trip details:
            Location: {trip_details.get('location', 'Not specified')}
            Interests: {trip_details.get('interests', 'Not specified')}
            Budget: {trip_details.get('budget', 'Not specified')}
            Number of people: {trip_details.get('num_people', 'Not specified')}
            Travel dates: {trip_details.get('travel_dates', 'Not specified')}
            Preferred currency: {trip_details.get('preferred_currency', 'Not specified')}
            
            Previous agent response: {sessions[session_id].get('result', 'No previous response.')}
            
            Current user request: {initial_prompt}
            """
            
            # Update the interests with the new prompt to reflect the latest request
            trip_details["interests"] = initial_prompt
            
            # Invoke the agent with history
            result_object = invoke_agent(chat_history=chat_history, **trip_details)
        else:
            # This is the first message in the session, so run the setup crew
            # Pass the conversation history to the setup crew
            conversation_history = sessions[session_id].get("conversation_history", [])
            setup_crew = create_setup_crew(initial_prompt, conversation_history)
            sessions[session_id]["status"] = "in_progress"
            
            # Store the full initial prompt for future reference
            sessions[session_id]["full_initial_prompt"] = initial_prompt 
            
            trip_details_output = setup_crew.kickoff()
            trip_details = extract_json_from_response(trip_details_output.raw)
            sessions[session_id]["trip_details"] = trip_details
            sessions[session_id]["status"] = "setup_complete"
            
            # Invoke the agent without history for the first time
            result_object = invoke_agent(**trip_details)
        
        raw_result = result_object.raw if hasattr(result_object, 'raw') else str(result_object)
        
        # Clean the raw markdown output to remove code fences
        cleaned_result = re.sub(r'^```markdown\n', '', raw_result)
        cleaned_result = re.sub(r'```$', '', cleaned_result)
        cleaned_result = cleaned_result.strip()
        
        sessions[session_id]["result"] = cleaned_result
        sessions[session_id]["status"] = "completed"
        
    except Exception as e:
        print(f"Error in background task for session {session_id}: {e}")
        import traceback
        traceback.print_exc()
        sessions[session_id]["status"] = "error"
        sessions[session_id]["error"] = str(e)

# --- Chatbot Core Endpoints ---
@app.post("/chatbot/start", response_model=ChatbotResponse)
async def start_chatbot(request: ChatbotRequest, background_tasks: BackgroundTasks):
    # Check if we have a session_id in the request
    session_id = request.session_id
    
    # If no session_id is provided, try to find an existing session for this user
    if not session_id:
        # Try to find a recent session with similar initial prompt
        # This is a fallback mechanism in case the frontend doesn't send the session_id
        user_prompt = request.prompt.lower()
        for sid, session in sessions.items():
            if session.get("status") in ["completed", "setup_complete"]:
                initial_prompt = session.get("initial_prompt", "").lower()
                # If the initial prompt contains similar keywords, consider it the same conversation
                if any(keyword in initial_prompt for keyword in user_prompt.split() if len(keyword) > 3):
                    session_id = sid
                    break
        
        # If no matching session found, create a new one
        if not session_id:
            session_id = str(uuid.uuid4())
    
    # Initialize the session if it doesn't exist
    if session_id not in sessions:
        sessions[session_id] = {
            "status": "initializing",
            "initial_prompt": request.prompt,
            "conversation_history": [],
            "trip_details": None,
            "pending_input": None,
            "human_response": None,
            "result": None,
            "error": None,
            "last_activity": datetime.utcnow()
        }
    else:
        # Update the last activity timestamp
        sessions[session_id]["last_activity"] = datetime.utcnow()
    
    background_tasks.add_task(run_crew_task, session_id, request.prompt)
    return ChatbotResponse(session_id=session_id, status="in_progress", message="Chatbot processing started.")

@app.post("/chatbot/input", response_model=ChatbotResponse)
async def provide_human_input(request: HumanInputRequest):
    session_id = request.session_id
    if session_id not in sessions or sessions[session_id].get("status") != "awaiting_input":
        raise HTTPException(status_code=400, detail="Not awaiting input.")
    sessions[session_id]["human_response"] = request.response
    return ChatbotResponse(session_id=session_id, status="in_progress", message="Input received.")

@app.get("/chatbot/status/{session_id}", response_model=ChatbotResponse)
async def get_session_status(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    status = session.get("status", "error")
    response_data = {"session_id": session_id, "status": status, "message": f"Session status: {status}"}
    if status == "awaiting_input":
        response_data.update({"requires_input": True, "input_question": session.get("pending_input")})
    elif status == "completed":
        response_data["data"] = {"result": session.get("result")}
    elif status == "error":
        response_data["data"] = {"error": session.get("error")}
    return ChatbotResponse(**response_data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
