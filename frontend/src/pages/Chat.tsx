import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";

interface ChatPageProps {
  userEmail: string;
  onLogout: () => void;
}

export const ChatPage = ({ userEmail, onLogout }: ChatPageProps) => {
  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        onNewChat={() => window.location.reload()} // Simple way to start a new chat
        onLogout={onLogout}
        userEmail={userEmail}
      />
      <div className="flex-1">
        <ChatInterface userEmail={userEmail} />
      </div>
    </div>
  );
};