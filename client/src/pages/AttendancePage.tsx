import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import AttendanceScreen from "../components/attendance/AttendanceScreen";

export default function AttendancePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleBack = () => {
    setLocation("/home");
  };

  return (
    <AttendanceScreen 
      onBack={handleBack}
      role={user.role}
    />
  );
}