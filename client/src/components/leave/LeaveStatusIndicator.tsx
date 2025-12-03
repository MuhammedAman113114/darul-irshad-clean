import { useState, useEffect } from "react";
import { leaveSyncService } from "@/lib/leaveSyncService";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";

interface LeaveStatusIndicatorProps {
  studentId: number;
  studentName: string;
  date: string;
  compact?: boolean;
  showDetails?: boolean;
}

export function LeaveStatusIndicator({ 
  studentId, 
  studentName, 
  date, 
  compact = false,
  showDetails = true 
}: LeaveStatusIndicatorProps) {
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveInfo, setLeaveInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLeaveStatus = async () => {
      try {
        const onLeave = await leaveSyncService.isStudentOnLeave(studentId, date);
        const info = onLeave ? await leaveSyncService.getStudentLeaveInfo(studentId, date) : null;
        
        setIsOnLeave(onLeave);
        setLeaveInfo(info);
      } catch (error) {
        console.error('Error checking leave status:', error);
        setIsOnLeave(false);
        setLeaveInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkLeaveStatus();
  }, [studentId, date]);

  if (loading) {
    return compact ? (
      <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
    ) : (
      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
    );
  }

  if (!isOnLeave) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
        <span className="text-xs text-yellow-700">L</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
        <Calendar className="w-3 h-3 mr-1" />
        On Leave
      </Badge>
      
      {showDetails && leaveInfo && (
        <div className="text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>
              {new Date(leaveInfo.fromDate).toLocaleDateString()} - {new Date(leaveInfo.toDate).toLocaleDateString()}
            </span>
          </div>
          <div className="text-gray-500 truncate max-w-32">
            {leaveInfo.reason}
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveStatusIndicator;