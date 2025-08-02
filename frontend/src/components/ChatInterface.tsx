import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plane } from "lucide-react";

// Helper to generate a simple UUID on the frontend
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    // @ts-ignore
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatInterfaceProps {
  userEmail: string;
}

const API_BASE_URL = "http://localhost:8000";

export const ChatInterface = ({ userEmail }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your Budget Travel Agent. I can help you find amazing travel deals, plan itineraries, and suggest budget-friendly destinations. Where would you like to go?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // Helper function to save any message to the backend
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
          id: Date.now().toString(),
          content: finalContent,
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage(assistantMessage, sid);
        
        setIsLoading(false);
        setSessionId(null); // Reset for the next conversation
      } else if (data.status === 'awaiting_input') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
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
        id: (Date.now() + 1).toString(),
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
  
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
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
            id: (Date.now() + 1).toString(),
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
        id: (Date.now() + 1).toString(),
        content: "Sorry, something went wrong. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      // @ts-ignore
      const scrollableView = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableView) {
        scrollableView.scrollTo({ top: scrollableView.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b bg-card p-4 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Plane className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Budget Travel Agent</h2>
          <p className="text-sm text-muted-foreground">Your AI travel companion</p>
        </div>
      </div>

      {/* @ts-ignore */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 text-left ${
                  message.sender === 'user'
                    ? 'bg-chat-user text-white'
                    : 'bg-chat-assistant text-foreground border'
                }`}
              >
                {message.sender === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
                <span className={`text-xs mt-1 block text-right w-full ${
                  message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-chat-assistant border rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-card p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about travel destinations, budgets, tips..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            variant="travel"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};