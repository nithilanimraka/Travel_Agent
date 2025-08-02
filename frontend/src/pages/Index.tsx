import { useState, useEffect } from "react";
import { AuthForm } from "@/components/AuthForm";
import { ChatPage } from "@/pages/Chat";
import { useToast } from "@/hooks/use-toast";

interface User {
  email: string;
  name: string;
}

const Index = () => {
  // Initialize user state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('travelUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  });

  const { toast } = useToast();

  // Update localStorage whenever the user state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('travelUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('travelUser');
    }
  }, [user]);

  // This function is called by AuthForm on successful login
  const handleLogin = (email: string, name: string) => {
    setUser({ email, name });
    toast({
      title: "Welcome back!",
      description: `Successfully signed in as ${name}`,
    });
  };
  
  // This function is called by AuthForm on successful signup, logging the user in
  const handleSignup = (name: string, email: string) => {
    setUser({ email, name });
    toast({
      title: "Account created!",
      description: `Welcome to Budget Travel Agent, ${name}`,
    });
  };

  const handleLogout = () => {
    setUser(null); // This will trigger the useEffect to clear localStorage
    toast({
      title: "Logged out",
      description: "See you on your next adventure!",
    });
  };

  if (!user) {
    // Pass the correct handler to onSignup. AuthForm calls it with (name, email) on success.
    return <AuthForm onLogin={handleLogin} onSignup={(name, email) => handleSignup(name, email)} />;
  }

  return <ChatPage userEmail={user.email} onLogout={handleLogout} />;
};

export default Index;