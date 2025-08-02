import { useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { ChatPage } from "@/pages/Chat";
import { useToast } from "@/hooks/use-toast";

interface User {
  email: string;
  name: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    // Simulate login - replace with your MongoDB integration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful login
    setUser({ email, name: email.split('@')[0] });
    toast({
      title: "Welcome back!",
      description: "Successfully signed in to Budget Travel Agent",
    });
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    // Simulate signup - replace with your MongoDB integration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful signup
    setUser({ email, name });
    toast({
      title: "Account created!",
      description: "Welcome to Budget Travel Agent",
    });
  };

  const handleLogout = () => {
    setUser(null);
    toast({
      title: "Logged out",
      description: "See you on your next adventure!",
    });
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return <ChatPage userEmail={user.email} onLogout={handleLogout} />;
};

export default Index;
