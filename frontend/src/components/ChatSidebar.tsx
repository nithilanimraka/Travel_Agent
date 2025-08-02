import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Settings, 
  LogOut, 
  Plane,
  Clock
} from "lucide-react";

interface ChatSidebarProps {
  onNewChat: () => void;
  onLogout: () => void;
  userEmail?: string;
}

export const ChatSidebar = ({ 
  onNewChat, 
  onLogout,
  userEmail 
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

      {/* Chat History Section (Now empty) */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Chats
          </h3>
          <div className="space-y-2 text-center text-sm text-muted-foreground mt-4">
            <p>Your chat history will appear here in the future.</p>
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