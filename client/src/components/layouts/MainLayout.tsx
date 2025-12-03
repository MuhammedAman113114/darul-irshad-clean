import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Notification from "@/components/ui/notification";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { format } from "date-fns";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-lg overflow-hidden">
      <header className="w-full bg-teacher-primary text-white shadow-md transition-colors duration-300">
        <div 
          className="absolute inset-0 opacity-10" 
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
            backgroundSize: '120px',
          }}
        ></div>
        
        <div className="container flex justify-between items-center p-4 relative z-10">
          <div className="flex items-center">
            <button className="mr-3 p-1.5 rounded-full hover:bg-white hover:bg-opacity-20 focus:outline-none transition-colors duration-200" aria-label="Menu">
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h1 className="text-lg font-semibold tracking-wide">Madrasa Manager</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <SyncStatusIndicator />
            <span className={`bg-white ${user.role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'} text-xs font-medium px-2.5 py-1 rounded-full shadow-sm`}>
              {user.role === 'principal' ? 'Principal' : 'Teacher'}
            </span>
            <div className="relative">
              <button 
                onClick={() => logout()} 
                className="flex items-center text-sm rounded-full focus:outline-none hover:opacity-80 transition-opacity duration-200"
              >
                <span className="sr-only">Open user menu</span>
                <Avatar className="h-9 w-9 border-2 border-white/70 bg-white text-teacher-primary flex items-center justify-center font-semibold shadow-md">
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {children}
      
      <Notification />
    </div>
  );
}
