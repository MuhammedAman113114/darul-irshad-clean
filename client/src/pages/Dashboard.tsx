import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardTile from "@/components/dashboard/DashboardTile";
import AttendanceScreen from "@/components/attendance/AttendanceScreen";
import ComprehensiveNamazScreen from "@/components/namaz/ComprehensiveNamazScreen";
import LeaveScreen from "@/components/leave/LeaveScreen";
import StudentsScreen from "@/components/students/StudentsScreen";
import RemarksScreen from "@/components/remarks/RemarksScreen";
import ResultsScreen from "@/components/results/ResultsScreen";
import CalendarScreen from "@/components/calendar/CalendarScreen";
import PeriodScreen from "@/components/periods/PeriodScreen";
import ClassesScreen from "@/components/classes/ClassesScreen";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Church,
  Calendar,
  MessageSquare,
  BarChart3,
  CalendarDays,
  Clock,
  Users,
  BookOpen,
  GraduationCap
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  const goBackToDashboard = () => {
    setActiveModule(null);
  };
  
  if (!user) {
    return null;
  }
  
  const role = user.role || 'teacher';
  
  // Show the active module screen if one is selected
  if (activeModule) {
    switch (activeModule) {
      case "attendance":
        return <AttendanceScreen onBack={goBackToDashboard} role={role} />;
      case "namaz":
        return <ComprehensiveNamazScreen onBack={goBackToDashboard} role={role} />;
      case "leave":
        return <LeaveScreen onBack={goBackToDashboard} role={role} />;
      case "students":
        return <StudentsScreen onBack={goBackToDashboard} role={role} />;
      case "remarks":
        return <RemarksScreen onBack={goBackToDashboard} role={role} />;
      case "results":
        return <ResultsScreen onBack={goBackToDashboard} role={role} />;
      case "calendar":
        return <CalendarScreen onBack={goBackToDashboard} />;
      case "periods":
        return <PeriodScreen onBack={goBackToDashboard} role={role} />;
      case "classes":
        return <ClassesScreen onBack={goBackToDashboard} role={role} />;
      default:
        return null;
    }
  }

  return (
    <main className="p-5 pb-20">
      <div className="mb-7">
        <div className={`inline-block rounded-lg px-3 py-1 mb-3 ${user.role === 'principal' ? 'bg-principal-light text-principal-primary' : 'bg-teacher-light text-teacher-primary'}`}>
          <p className="text-sm font-medium">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800">
          Welcome, <span className={user.role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}>{user.name}</span>
        </h2>
        <p className="text-gray-500 text-sm mt-1">Manage your Madrasa tasks from the modules below</p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-2 gap-5">
        <DashboardTile
          title="Attendance"
          description="Mark & track"
          icon={<ClipboardCheck className="h-5 w-5" />}
          onClick={() => setActiveModule("attendance")}
          badge={{ count: 1, type: "info" }}
          role={role}
        />
        
        <DashboardTile
          title="Namaz"
          description="Prayer tracking"
          icon={<Church className="h-5 w-5" />}
          onClick={() => setActiveModule("namaz")}
          role={role}
        />
        
        <DashboardTile
          title="Leave"
          description="Manage absences"
          icon={<Calendar className="h-5 w-5" />}
          onClick={() => setActiveModule("leave")}
          badge={{ count: 3, type: "warning" }}
          role={role}
        />
        
        <DashboardTile
          title="Remarks"
          description="Student notes"
          icon={<MessageSquare className="h-5 w-5" />}
          onClick={() => setActiveModule("remarks")}
          badge={{ count: 2, type: "error" }}
          role={role}
        />
        
        <DashboardTile
          title="Results"
          description="Manage scores"
          icon={<BarChart3 className="h-5 w-5" />}
          onClick={() => setActiveModule("results")}
          role={role}
        />
        
        <DashboardTile
          title="Calendar"
          description="Academic events"
          icon={<CalendarDays className="h-5 w-5" />}
          onClick={() => setActiveModule("calendar")}
          isPrincipalOnly={true}
          role={role}
        />
        
        <DashboardTile
          title="Class Management"
          description="Periods & sections"
          icon={<Clock className="h-5 w-5" />}
          onClick={() => setActiveModule("periods")}
          isPrincipalOnly={true}
          role={role}
        />
        
        <DashboardTile
          title="Classes"
          description="Manage classes"
          icon={<BookOpen className="h-5 w-5" />}
          onClick={() => setActiveModule("classes")}
          role={role}
        />
        
        <DashboardTile
          title="Students"
          description="All students"
          icon={<Users className="h-5 w-5" />}
          onClick={() => setActiveModule("students")}
          role={role}
        />
      </div>
    </main>
  );
}
