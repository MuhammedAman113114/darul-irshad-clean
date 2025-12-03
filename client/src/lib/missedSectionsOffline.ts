import { AttendanceLockService } from "./attendanceLock";

interface MissedSection {
  id: string;
  courseType: string;
  year: string;
  stream: string;
  section: string;
  dayOfWeek: string;
  periodNumber: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  scheduledDate: string;
  scheduledEndTime: string;
  status: string;
  className: string;
  missedHours: number;
}

interface MissedSectionsData {
  missedSections: MissedSection[];
  totalCount: number;
  dateRange: { start: string; end: string } | null;
  lastFetch: string;
  filters: {
    days: string;
    courseType?: string;
    year?: string;
    courseDivision?: string;
    section?: string;
  };
}

export class MissedSectionsOfflineService {
  private static readonly STORAGE_KEY = 'missed_sections_cache';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  static isOnline(): boolean {
    return navigator.onLine;
  }

  static getCacheKey(filters: any): string {
    const { days, courseType, year, courseDivision, section } = filters;
    return `${this.STORAGE_KEY}_${days}_${courseType || 'all'}_${year || 'all'}_${courseDivision || 'all'}_${section || 'all'}`;
  }

  static async getMissedSections(filters: {
    days: string;
    courseType?: string;
    year?: string;
    courseDivision?: string;
    section?: string;
  }): Promise<MissedSectionsData> {
    const cacheKey = this.getCacheKey(filters);
    
    // Try to get from cache first
    const cachedData = this.getCachedData(cacheKey);
    const now = Date.now();
    
    // Return cached data if valid and recent
    if (cachedData && (now - new Date(cachedData.lastFetch).getTime()) < this.CACHE_DURATION) {
      console.log('📋 Using cached missed sections data');
      return cachedData;
    }

    // Try to fetch fresh data if online
    if (this.isOnline()) {
      try {
        const freshData = await this.fetchFromAPI(filters);
        this.saveCachedData(cacheKey, freshData);
        console.log('📋 Fetched fresh missed sections data');
        return freshData;
      } catch (error) {
        console.warn('Failed to fetch fresh data, using cache:', error);
        // Fall back to cached data even if stale
        if (cachedData) {
          return cachedData;
        }
      }
    }

    // Return cached data or empty result
    return cachedData || {
      missedSections: [],
      totalCount: 0,
      dateRange: null,
      lastFetch: new Date().toISOString(),
      filters
    };
  }

  private static async fetchFromAPI(filters: any): Promise<MissedSectionsData> {
    const queryParams = new URLSearchParams({
      days: filters.days,
      ...(filters.courseType && { courseType: filters.courseType }),
      ...(filters.year && { year: filters.year }),
      ...(filters.courseDivision && { courseDivision: filters.courseDivision }),
      ...(filters.section && { section: filters.section })
    });

    const response = await fetch(`/api/missed-sections?${queryParams}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      missedSections: data.missedSections || [],
      totalCount: data.totalCount || 0,
      dateRange: data.dateRange || null,
      lastFetch: new Date().toISOString(),
      filters
    };
  }

  private static getCachedData(cacheKey: string): MissedSectionsData | null {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading cached missed sections:', error);
      localStorage.removeItem(cacheKey);
    }
    return null;
  }

  private static saveCachedData(cacheKey: string, data: MissedSectionsData): void {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(`💾 Cached missed sections data: ${cacheKey}`);
    } catch (error) {
      console.error('Error caching missed sections:', error);
    }
  }

  static clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ Cleared all missed sections cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  static async refreshCache(): Promise<void> {
    console.log('🔄 Refreshing missed sections cache...');
    this.clearCache();
    // Cache will be rebuilt on next request
  }
}