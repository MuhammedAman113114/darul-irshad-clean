import { apiRequest } from '@/lib/queryClient';

export interface Period {
  id: number;
  name: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  createdBy: number;
  createdAt: string;
}

export interface LegacyPeriod {
  id: string;
  name: string;
  timeSlot: string;
  subject?: string;
}

export class PeriodService {
  /**
   * Get periods for a specific class configuration
   */
  static async getPeriods(courseType: string, year: string, courseDivision?: string): Promise<Period[]> {
    try {
      let url = `/api/periods?courseType=${courseType}&year=${year}`;
      if (courseDivision) {
        url += `&courseDivision=${courseDivision}`;
      }
      
      const periods = await apiRequest(url);
      return Array.isArray(periods) ? periods : [];
    } catch (error) {
      console.error('Error fetching periods:', error);
      return [];
    }
  }

  /**
   * Create a new period
   */
  static async createPeriod(periodData: {
    name: string;
    courseType: string;
    courseDivision?: string;
    year: string;
    periodNumber: number;
    startTime: string;
    endTime: string;
  }): Promise<Period | null> {
    try {
      const result = await apiRequest('/api/periods', 'POST', periodData);
      return result.period || null;
    } catch (error) {
      console.error('Error creating period:', error);
      throw error;
    }
  }

  /**
   * Update an existing period
   */
  static async updatePeriod(id: number, updates: Partial<Period>): Promise<Period | null> {
    try {
      const result = await apiRequest(`/api/periods/${id}`, 'PUT', updates);
      return result.period || null;
    } catch (error) {
      console.error('Error updating period:', error);
      throw error;
    }
  }

  /**
   * Delete a period
   */
  static async deletePeriod(id: number): Promise<boolean> {
    try {
      await apiRequest(`/api/periods/${id}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('Error deleting period:', error);
      return false;
    }
  }

  /**
   * Bulk create periods (replaces existing periods for the class)
   */
  static async bulkCreatePeriods(
    courseType: string, 
    year: string, 
    courseDivision: string | undefined, 
    periods: { name: string; startTime: string; endTime: string }[]
  ): Promise<Period[]> {
    try {
      const result = await apiRequest('/api/periods/bulk', 'POST', {
        periods,
        courseType,
        year,
        courseDivision
      });
      return result.periods || [];
    } catch (error) {
      console.error('Error bulk creating periods:', error);
      throw error;
    }
  }

  /**
   * Convert database periods to legacy format for backward compatibility
   */
  static convertToLegacyFormat(periods: Period[]): LegacyPeriod[] {
    return periods.map(period => ({
      id: period.periodNumber.toString(),
      name: period.name,
      timeSlot: `${period.startTime} - ${period.endTime}`,
      subject: period.name
    }));
  }

  /**
   * Get class storage key for localStorage compatibility
   */
  static getClassStorageKey(courseType: string, year: string, courseDivision?: string, section?: string): string {
    let key = `period_settings_${courseType}_${year}`;
    
    // For PU College commerce years 1-2, include the section
    if (courseType === "pu" && (year === "1" || year === "2") && courseDivision === "commerce" && section) {
      key += `_${courseDivision}_${section}`;
    } 
    // For PU College science years 1-2, include the division but not section (only one section)
    else if (courseType === "pu" && (year === "1" || year === "2") && courseDivision === "science") {
      key += `_${courseDivision}`;
    }
    
    return key;
  }

  /**
   * Sync periods from database to localStorage for offline support
   */
  static async syncPeriodsToLocalStorage(courseType: string, year: string, courseDivision?: string, section?: string): Promise<void> {
    try {
      const periods = await this.getPeriods(courseType, year, courseDivision);
      const legacyPeriods = this.convertToLegacyFormat(periods);
      
      const storageKey = this.getClassStorageKey(courseType, year, courseDivision, section);
      const periodSettings = {
        courseType,
        year,
        courseDivision: courseDivision || "",
        section: section || "",
        timestamp: new Date().toISOString(),
        periods: legacyPeriods
      };
      
      localStorage.setItem(storageKey, JSON.stringify(periodSettings));
      console.log(`📊 Synced ${periods.length} periods to localStorage for ${courseType} ${year}`);
    } catch (error) {
      console.error('Error syncing periods to localStorage:', error);
    }
  }

  /**
   * Load periods with fallback to localStorage
   */
  static async loadPeriodsWithFallback(courseType: string, year: string, courseDivision?: string, section?: string): Promise<LegacyPeriod[]> {
    try {
      // Try to load from database first
      const dbPeriods = await this.getPeriods(courseType, year, courseDivision);
      
      if (dbPeriods.length > 0) {
        // Sync to localStorage for offline support
        await this.syncPeriodsToLocalStorage(courseType, year, courseDivision, section);
        return this.convertToLegacyFormat(dbPeriods);
      }
      
      // Fallback to localStorage
      const storageKey = this.getClassStorageKey(courseType, year, courseDivision, section);
      const storedPeriods = localStorage.getItem(storageKey);
      
      if (storedPeriods) {
        try {
          const parsed = JSON.parse(storedPeriods);
          if (parsed.periods && Array.isArray(parsed.periods)) {
            console.log(`📊 Loaded ${parsed.periods.length} periods from localStorage fallback`);
            return parsed.periods;
          }
        } catch (error) {
          console.error('Error parsing stored periods:', error);
        }
      }
      
      // Return empty array if no periods found
      return [];
    } catch (error) {
      console.error('Error loading periods:', error);
      return [];
    }
  }

  /**
   * Get default periods based on course configuration
   */
  static getDefaultPeriods(courseType: string, year: string): LegacyPeriod[] {
    const maxPeriods = this.getMaxPeriodsForClass(courseType, year);
    const periods: LegacyPeriod[] = [];
    
    for (let i = 1; i <= maxPeriods; i++) {
      const startHour = 9 + Math.floor((i - 1) * 0.75); // 45 min periods with breaks
      const startMinute = ((i - 1) * 45) % 60;
      const endMinute = (startMinute + 45) % 60;
      const endHour = startHour + Math.floor((startMinute + 45) / 60);
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      periods.push({
        id: i.toString(),
        name: `Period ${i}`,
        timeSlot: `${startTime} - ${endTime}`,
        subject: `Subject ${i}`
      });
    }
    
    return periods;
  }

  /**
   * Get maximum periods allowed for a class
   */
  static getMaxPeriodsForClass(courseType: string, year: string): number {
    if (courseType === "pu" || (courseType === "post-pu" && ["1", "2"].includes(year))) {
      return 6;
    } else if (courseType === "post-pu" && ["3", "4", "5"].includes(year)) {
      return 8;
    } else {
      return 10;
    }
  }
}