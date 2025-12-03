import { format } from "date-fns";
import { HolidayService } from "./holidayService";

export interface AutoDateState {
  currentDate: string;
  isHoliday: boolean;
  holidayInfo?: {
    name: string;
    type: 'academic' | 'weekly';
    affectedCourses: string[];
  };
  lastChecked: string;
}

class AutoDateServiceClass {
  private dateCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(state: AutoDateState) => void> = [];
  private currentState: AutoDateState | null = null;

  /**
   * Initialize auto-date checking with periodic updates
   */
  initialize() {
    this.updateCurrentDate();
    
    // Check date every 60 seconds
    this.dateCheckInterval = setInterval(() => {
      this.updateCurrentDate();
    }, 60000);
    
    console.log('📅 Auto-date service initialized - checking every 60 seconds');
  }

  /**
   * Clean up interval when component unmounts
   */
  cleanup() {
    if (this.dateCheckInterval) {
      clearInterval(this.dateCheckInterval);
      this.dateCheckInterval = null;
    }
    this.listeners = [];
    console.log('🧹 Auto-date service cleaned up');
  }

  /**
   * Subscribe to date/holiday changes
   */
  subscribe(callback: (state: AutoDateState) => void) {
    this.listeners.push(callback);
    
    // Immediately call with current state if available
    if (this.currentState) {
      callback(this.currentState);
    }
    
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current system date and check for holidays
   */
  async updateCurrentDate() {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const lastChecked = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    
    // Check if date has changed from previous check
    const dateChanged = !this.currentState || this.currentState.currentDate !== currentDate;
    
    if (dateChanged) {
      console.log(`📅 Date change detected: ${this.currentState?.currentDate || 'initial'} → ${currentDate}`);
    }
    
    try {
      // Check holiday status for current date
      const holidayInfo = await HolidayService.checkIfHoliday(currentDate);
      const isHoliday = holidayInfo !== null;
      
      const newState: AutoDateState = {
        currentDate,
        isHoliday,
        holidayInfo: isHoliday ? {
          name: holidayInfo?.name || 'Holiday',
          type: holidayInfo?.type === 'emergency' ? 'academic' : 'weekly',
          affectedCourses: holidayInfo?.affectedCourses || []
        } : undefined,
        lastChecked
      };
      
      // Only notify listeners if state has changed
      const stateChanged = !this.currentState || 
        this.currentState.currentDate !== newState.currentDate ||
        this.currentState.isHoliday !== newState.isHoliday;
      
      this.currentState = newState;
      
      if (stateChanged) {
        console.log(`📅 Auto-date state updated:`, {
          date: currentDate,
          isHoliday,
          holidayName: holidayInfo?.name,
          listenersCount: this.listeners.length
        });
        
        // Notify all listeners
        this.listeners.forEach(callback => {
          try {
            callback(newState);
          } catch (error) {
            console.error('Error in auto-date listener:', error);
          }
        });
      }
      
    } catch (error) {
      console.error('Error updating auto-date state:', error);
      
      // Fallback state without holiday info
      const fallbackState: AutoDateState = {
        currentDate,
        isHoliday: false,
        lastChecked
      };
      
      this.currentState = fallbackState;
      this.listeners.forEach(callback => callback(fallbackState));
    }
  }

  /**
   * Get current state synchronously
   */
  getCurrentState(): AutoDateState | null {
    return this.currentState;
  }

  /**
   * Force refresh of date and holiday status
   */
  async forceRefresh() {
    console.log('🔄 Force refreshing auto-date state...');
    await this.updateCurrentDate();
  }

  /**
   * Check if attendance should be disabled for current date
   */
  shouldDisableAttendance(): boolean {
    if (!this.currentState) return false;
    
    // Disable if it's a holiday
    if (this.currentState.isHoliday) {
      console.log(`🚫 Attendance disabled - Holiday: ${this.currentState.holidayInfo?.name}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get formatted holiday message for UI
   */
  getHolidayMessage(): string {
    if (!this.currentState?.isHoliday || !this.currentState.holidayInfo) {
      return '';
    }
    
    const { name, type } = this.currentState.holidayInfo;
    
    if (type === 'weekly') {
      return `📅 Weekly Holiday - ${name}`;
    } else {
      return `🎉 Academic Holiday - ${name}`;
    }
  }
}

// Export singleton instance
export const AutoDateService = new AutoDateServiceClass();