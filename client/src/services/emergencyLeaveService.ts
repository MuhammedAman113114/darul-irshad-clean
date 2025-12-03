import { apiRequest } from '@/lib/queryClient';

export interface EmergencyLeaveRequest {
  date: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  reason: string;
  appliedBy: number;
}

export interface EmergencyLeaveStatus {
  id: number;
  date: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  affectedPeriods: string[];
  appliedAt: string;
  appliedBy: number;
  reason: string;
  isActive: boolean;
  createdAt: string;
}

export class EmergencyLeaveService {
  // Check if emergency leave exists for a class on a specific date
  static async checkEmergencyLeave(date: string, courseType: string, year: string, courseDivision?: string, section: string = 'A'): Promise<EmergencyLeaveStatus | null> {
    try {
      // Temporarily disabled to fix runtime error - returning null for now
      return null;
      
      const params = new URLSearchParams({
        date,
        courseType,
        year,
        section,
        ...(courseDivision && { courseDivision })
      });
      
      const response = await fetch(`/api/emergency-leave/check?${params}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.emergencyLeave || null;
    } catch (error) {
      console.error('Error checking emergency leave:', error);
      return null;
    }
  }

  // Declare emergency leave for remaining periods
  static async declareEmergencyLeave(request: EmergencyLeaveRequest): Promise<EmergencyLeaveStatus> {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    const response = await fetch('/api/emergency-leave/declare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...request,
        appliedAt: currentTime
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.emergencyLeave;
  }

  // Get all emergency leaves for a specific class and date range
  static async getEmergencyLeaves(filters?: {
    date?: string;
    courseType?: string;
    year?: string;
    courseDivision?: string;
    section?: string;
  }): Promise<EmergencyLeaveStatus[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      const response = await fetch(`/api/emergency-leave?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.emergencyLeaves || [];
    } catch (error) {
      console.error('Error fetching emergency leaves:', error);
      return [];
    }
  }

  // Deactivate emergency leave (undo)
  static async deactivateEmergencyLeave(id: number): Promise<void> {
    const response = await fetch(`/api/emergency-leave/${id}/deactivate`, {
      method: 'PATCH',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  // Calculate remaining periods based on current time and class schedule
  static getRemainingPeriods(courseType: string, year: string): string[] {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Convert to minutes since midnight

    // Period schedules - you can adjust these based on your actual timetable
    const schedules = {
      'pu': {
        periods: ['1', '2', '3'],
        timings: [
          { period: '1', start: 9 * 60, end: 10 * 60 }, // 9:00-10:00
          { period: '2', start: 10 * 60 + 15, end: 11 * 60 + 15 }, // 10:15-11:15
          { period: '3', start: 11 * 60 + 30, end: 12 * 60 + 30 } // 11:30-12:30
        ]
      },
      'post-pu': {
        '3': { periods: ['1', '2', '3', '4', '5', '6'] },
        '4': { periods: ['1', '2', '3', '4', '5', '6', '7'] },
        '5': { periods: ['1', '2', '3', '4', '5', '6', '7'] },
        '6': { periods: ['1', '2', '3', '4', '5', '6', '7', '8'] },
        '7': { periods: ['1', '2', '3', '4', '5', '6', '7', '8'] }
      }
    };

    let allPeriods: string[] = [];
    
    if (courseType === 'pu') {
      const schedule = schedules.pu;
      // For PU courses, check timing-based periods
      const remainingPeriods = schedule.timings
        .filter(timing => currentTime < timing.start)
        .map(timing => timing.period);
      
      return remainingPeriods;
    } else if (courseType === 'post-pu') {
      const yearSchedule = schedules['post-pu'][year as keyof typeof schedules['post-pu']];
      if (yearSchedule) {
        allPeriods = yearSchedule.periods;
      }
      
      // For post-pu, assume a simpler calculation based on current hour
      // This is a simplified logic - you can enhance based on actual timetable
      const currentPeriod = Math.max(1, Math.min(allPeriods.length, Math.floor((currentHour - 8) / 1) + 1));
      return allPeriods.slice(currentPeriod);
    }

    return [];
  }
}