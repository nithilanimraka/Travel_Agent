import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { 
  Plus, 
  Settings, 
  LogOut, 
  Plane,
  Clock,
  MessageSquare
} from "lucide-react";

// Define the shape of a chat history item
interface ChatHistoryItem {
  session_id: string;
  title: string;
  timestamp: string;
}

interface ChatSidebarProps {
  onNewChat: () => void;
  onLogout: () => void;
  userEmail?: string;
  chatHistory: ChatHistoryItem[];
  isLoadingHistory: boolean;
  onSelectChat: (sessionId: string) => void;
}

export const ChatSidebar = ({ 
  onNewChat, 
  onLogout,
  userEmail,
  chatHistory,
  isLoadingHistory,
  onSelectChat
}: ChatSidebarProps) => {
  return (
    <div className="w-80 bg-sidebar-bg border-r h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Budget Travel Agent</h1>
            <p className="text-sm text-muted-foreground">AI Travel Assistant</p>
          </div>
        </div>
        
        <Button 
          onClick={onNewChat} 
          className="w-full" 
          variant="travel"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat History Section (Updated) */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Chats
          </h3>
          <div className="space-y-1">
            {isLoadingHistory ? (
              // Loading Skeletons
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : chatHistory.length > 0 ? (
              // Chat History List
              chatHistory.map((chat) => (
                <Button
                  key={chat.session_id}
                  variant="ghost"
                  className="w-full h-auto p-2 flex items-start justify-start gap-2"
                  onClick={() => onSelectChat(chat.session_id)}
                >
                  <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm font-normal text-left truncate leading-snug">
                    {chat.title}
                  </p>
                </Button>
              ))
            ) : (
              // Empty State
              <div className="text-center text-sm text-muted-foreground mt-4 px-2">
                <p>Your previous chats will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t bg-card">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {userEmail?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {userEmail || 'User'}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-destructive hover:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};