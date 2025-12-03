interface Subject {
  id: number;
  subject: string;
  subjectCode: string;
  courseType: string;
  year: string;
  stream?: string;
  section?: string;
}

interface TimetableEntry {
  id: number;
  courseType: string;
  year: string;
  stream?: string;
  section?: string;
  dayOfWeek: string;
  periodNumber: number;
  subjectId: number;
  startTime: string;
  endTime: string;
  createdBy: number;
  subjectName?: string;
  subjectCode?: string;
}

interface OfflineQueue {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: string;
}

export class SubjectTimetableOfflineService {
  private static readonly SUBJECTS_KEY = 'subjects_cache';
  private static readonly TIMETABLE_KEY = 'timetable_cache';
  private static readonly QUEUE_KEY = 'subject_timetable_sync_queue';
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

  static isOnline(): boolean {
    return navigator.onLine;
  }

  // ==== SUBJECTS MANAGEMENT ====
  
  static async getSubjects(filters: {
    courseType?: string;
    year?: string;
    stream?: string;
    section?: string;
  }): Promise<Subject[]> {
    const cacheKey = `${this.SUBJECTS_KEY}_${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = this.getCachedData(cacheKey);
    if (cached && this.isCacheValid(cached.lastFetch)) {
      console.log('📚 Using cached subjects data');
      return cached.data;
    }

    // Try to fetch fresh data if online
    if (this.isOnline()) {
      try {
        const freshData = await this.fetchSubjectsFromAPI(filters);
        this.saveCachedData(cacheKey, freshData);
        console.log('📚 Fetched fresh subjects data');
        return freshData;
      } catch (error) {
        console.warn('Failed to fetch fresh subjects, using cache:', error);
        return cached?.data || [];
      }
    }

    return cached?.data || [];
  }

  static async createSubject(subjectData: Omit<Subject, 'id'>): Promise<Subject | null> {
    if (this.isOnline()) {
      try {
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subjectData)
        });
        
        if (response.ok) {
          const result = await response.json();
          this.clearSubjectsCache();
          console.log('✅ Subject created online');
          return result;
        }
      } catch (error) {
        console.warn('Online create failed, queuing:', error);
      }
    }

    // Queue for offline sync
    this.addToQueue('create', '/api/subjects', subjectData);
    
    // Create temporary local subject
    const tempSubject: Subject = {
      id: Date.now(), // Temporary ID
      ...subjectData
    };
    
    console.log('📴 Subject queued for creation');
    return tempSubject;
  }

  static async updateSubject(id: number, subjectData: Partial<Subject>): Promise<boolean> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/subjects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subjectData)
        });
        
        if (response.ok) {
          this.clearSubjectsCache();
          console.log('✅ Subject updated online');
          return true;
        }
      } catch (error) {
        console.warn('Online update failed, queuing:', error);
      }
    }

    // Queue for offline sync
    this.addToQueue('update', `/api/subjects/${id}`, subjectData);
    console.log('📴 Subject update queued');
    return true;
  }

  static async deleteSubject(id: number): Promise<boolean> {
    if (this.isOnline()) {
      try {
        const response = await fetch(`/api/subjects/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          this.clearSubjectsCache();
          console.log('✅ Subject deleted online');
          return true;
        }
      } catch (error) {
        console.warn('Online delete failed, queuing:', error);
      }
    }

    // Queue for offline sync
    this.addToQueue('delete', `/api/subjects/${id}`, { id });
    console.log('📴 Subject deletion queued');
    return true;
  }

  // ==== TIMETABLE MANAGEMENT ====
  
  static async getTimetable(filters: {
    courseType: string;
    year: string;
    stream?: string;
    section?: string;
    dayOfWeek?: string;
  }): Promise<TimetableEntry[]> {
    const cacheKey = `${this.TIMETABLE_KEY}_${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = this.getCachedData(cacheKey);
    if (cached && this.isCacheValid(cached.lastFetch)) {
      console.log('📅 Using cached timetable data');
      return cached.data;
    }

    // Try to fetch fresh data if online
    if (this.isOnline()) {
      try {
        const freshData = await this.fetchTimetableFromAPI(filters);
        this.saveCachedData(cacheKey, freshData);
        console.log('📅 Fetched fresh timetable data');
        return freshData;
      } catch (error) {
        console.warn('Failed to fetch fresh timetable, using cache:', error);
        return cached?.data || [];
      }
    }

    return cached?.data || [];
  }

  static async saveTimetable(timetableData: Omit<TimetableEntry, 'id'>[]): Promise<boolean> {
    if (this.isOnline()) {
      try {
        const response = await fetch('/api/timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: timetableData })
        });
        
        if (response.ok) {
          this.clearTimetableCache();
          console.log('✅ Timetable saved online');
          return true;
        }
      } catch (error) {
        console.warn('Online timetable save failed, queuing:', error);
      }
    }

    // Queue for offline sync
    this.addToQueue('create', '/api/timetable', { entries: timetableData });
    console.log('📴 Timetable changes queued');
    return true;
  }

  // ==== SYNC MANAGEMENT ====
  
  static async syncOfflineData(): Promise<void> {
    if (!this.isOnline()) {
      console.log('📴 Offline - skipping sync');
      return;
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      console.log('✅ No offline data to sync');
      return;
    }

    console.log(`🔄 Syncing ${queue.length} offline operations...`);
    const failedItems: OfflineQueue[] = [];

    for (const item of queue) {
      try {
        const method = item.type === 'create' ? 'POST' : 
                      item.type === 'update' ? 'PUT' : 'DELETE';
        
        const response = await fetch(item.endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined
        });

        if (!response.ok) {
          throw new Error(`Sync failed for ${item.endpoint}: ${response.status}`);
        }
        
        console.log(`✅ Synced: ${item.type} ${item.endpoint}`);
      } catch (error) {
        console.error(`❌ Sync failed for ${item.endpoint}:`, error);
        failedItems.push(item);
      }
    }

    // Update queue with failed items only
    this.saveQueue(failedItems);
    
    // Clear all caches to force fresh data
    this.clearAllCache();
    
    console.log(`🔄 Sync completed. ${queue.length - failedItems.length} succeeded, ${failedItems.length} failed`);
  }

  // ==== UTILITY METHODS ====
  
  private static async fetchSubjectsFromAPI(filters: any): Promise<Subject[]> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    const response = await fetch(`/api/subjects?${queryParams}`);
    if (!response.ok) throw new Error(`Subjects API failed: ${response.status}`);
    
    const data = await response.json();
    return data.subjects || data || [];
  }

  private static async fetchTimetableFromAPI(filters: any): Promise<TimetableEntry[]> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    const response = await fetch(`/api/timetable?${queryParams}`);
    if (!response.ok) throw new Error(`Timetable API failed: ${response.status}`);
    
    const data = await response.json();
    return data.timetable || data || [];
  }

  private static getCachedData(key: string): { data: any; lastFetch: string } | null {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading cache:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  private static saveCachedData(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        lastFetch: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  private static isCacheValid(lastFetch: string): boolean {
    return (Date.now() - new Date(lastFetch).getTime()) < this.CACHE_DURATION;
  }

  private static addToQueue(type: 'create' | 'update' | 'delete', endpoint: string, data: any): void {
    const queue = this.getQueue();
    queue.push({
      id: Date.now().toString(),
      type,
      endpoint,
      data,
      timestamp: new Date().toISOString()
    });
    this.saveQueue(queue);
  }

  private static getQueue(): OfflineQueue[] {
    try {
      const queue = localStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error reading sync queue:', error);
      return [];
    }
  }

  private static saveQueue(queue: OfflineQueue[]): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  static clearSubjectsCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.SUBJECTS_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }

  static clearTimetableCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.TIMETABLE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }

  static clearAllCache(): void {
    this.clearSubjectsCache();
    this.clearTimetableCache();
    console.log('🗑️ Cleared all subject & timetable cache');
  }

  static getQueueSize(): number {
    return this.getQueue().length;
  }
}