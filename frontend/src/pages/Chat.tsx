import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";

const API_BASE_URL = "http://localhost:8000";

// Helper to generate a simple UUID on the frontend
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    // @ts-ignore
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

// Interfaces
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatHistoryItem {
  session_id: string;
  title: string;
  timestamp: string;
}

interface ChatPageProps {
  userEmail: string;
  onLogout: () => void;
}

const initialMessage: Message = {
  id: 'initial-message',
  content: "Hello! I'm your Budget Travel Agent. I can help you find amazing travel deals, plan itineraries, and suggest budget-friendly destinations. Where would you like to go?",
  sender: 'assistant',
  timestamp: new Date()
};


export const ChatPage = ({ userEmail, onLogout }: ChatPageProps) => {
  // --- State Management ---
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const pollingIntervalRef = useRef<number | null>(null);

  // --- Functions ---
  const saveMessage = async (message: Message, sid: string) => {
    try {
      await fetch(`${API_BASE_URL}/chats/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          user_email: userEmail,
          content: message.content,
          sender: message.sender,
        }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };
  
  const pollStatus = async (sid: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/status/${sid}`);
      if (!response.ok) throw new Error("Status check failed");
      
      const data = await response.json();

      if (data.status === "completed" || data.status === "error") {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        
        const finalContent = data.data?.result || data.data?.error || "Processing finished.";
        const assistantMessage: Message = {
          id: uuidv4(),
          content: finalContent,
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage(assistantMessage, sid);
        
        setIsLoading(false);
        setSessionId(null); // Reset for the next conversation
        fetchHistory(); // Refresh history
      } else if (data.status === 'awaiting_input') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        
        const assistantMessage: Message = {
          id: uuidv4(),
          content: data.input_question,
          sender: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage(assistantMessage, sid);
        setIsLoading(false);
      }
    } catch (error) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, couldn't get the status. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const startPolling = (sid: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = window.setInterval(() => pollStatus(sid), 3000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = newMessage;
    setNewMessage("");
    setIsLoading(true);

    try {
      const isNewChat = !sessionId;
      const currentSessionId = sessionId || uuidv4();
      
      if (isNewChat) {
        setSessionId(currentSessionId);
      }

      await saveMessage(userMessage, currentSessionId);

      const endpoint = isNewChat ? `${API_BASE_URL}/chatbot/start` : `${API_BASE_URL}/chatbot/input`;
      const body = isNewChat 
        ? JSON.stringify({ prompt: messageToSend, session_id: currentSessionId })
        : JSON.stringify({ session_id: currentSessionId, response: messageToSend });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      
      if (data.status === 'in_progress' || data.status === 'setup_complete') {
        startPolling(currentSessionId);
      } else if (data.status === 'awaiting_input') {
         const assistantMessage: Message = {
            id: uuidv4(),
            content: data.input_question,
            sender: 'assistant',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          await saveMessage(assistantMessage, currentSessionId);
          setIsLoading(false);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, something went wrong. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!userEmail) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chats/history/${userEmail}`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      const data = await response.json();
      setChatHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [userEmail]);

  const handleSelectChat = async (sid: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setIsLoading(true);
    setMessages([]);
    setSessionId(sid);
    try {
      const response = await fetch(`${API_BASE_URL}/chats/session/${sid}`);
      if (!response.ok) throw new Error("Failed to fetch session");
      const sessionMessages = await response.json();
      
      const formattedMessages: Message[] = sessionMessages.map((msg: any) => ({
          ...msg,
          id: msg._id,
          timestamp: new Date(msg.timestamp)
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading chat session:", error);
      setMessages([initialMessage, { id: 'error-load', content: "Sorry, I couldn't load that conversation.", sender: 'assistant', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewChat = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setSessionId(null);
    setMessages([initialMessage]);
    setIsLoading(false);
    setNewMessage("");
  };

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        onNewChat={handleNewChat}
        onLogout={onLogout}
        userEmail={userEmail}
        chatHistory={chatHistory}
        isLoadingHistory={isLoadingHistory}
        onSelectChat={handleSelectChat}
      />
      <div className="flex-1">
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};