import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePageNew";
import SectionPage from "@/pages/SectionPageNew";
import AttendancePage from "@/pages/AttendancePage";
import SubjectTimetablePage from "@/pages/SubjectTimetablePage";
import LoginScreen from "@/components/auth/LoginScreen";
import "@/utils/clearAllData"; // Load clearing utility globally
import "@/utils/migrateStudents"; // Auto-migrate localStorage students to database

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/home" component={HomePage} />
      <Route path="/class/:classId/section/:sectionId">
        <SectionPage />
      </Route>
      <Route path="/attendance">
        <AttendancePage />
      </Route>
      <Route path="/subjects">
        <SubjectTimetablePage />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <TooltipProvider>
        <LoginScreen onLogin={() => {}} />
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Router />
      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
