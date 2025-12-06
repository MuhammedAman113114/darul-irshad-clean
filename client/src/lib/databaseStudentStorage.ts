/**
 * Database-First Student Storage System
 * 
 * This system saves students directly to the PostgreSQL database
 * and provides local caching for performance.
 */

import type { Student, InsertStudent } from "@shared/schema";

interface SectionFilter {
  courseType: string;
  year: string;
  courseDivision?: string;
  batch?: string;
}

class DatabaseStudentStorage {
  private cache: Map<string, Student[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Save a student directly to the database
   */
  async saveStudent(studentData: InsertStudent): Promise<Student | null> {
    try {
      console.log("💾 Saving student to database:", studentData);

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const savedStudent = await response.json();
      console.log("✅ Student saved to database:", savedStudent);

      // Clear cache to force refresh
      this.clearCache();

      return savedStudent;
    } catch (error) {
      console.error("❌ Error saving student to database:", error);
      return null;
    }
  }

  /**
   * Get students from database with optional filtering
   */
  async getStudents(filter?: SectionFilter): Promise<Student[]> {
    try {
      const cacheKey = this.getCacheKey(filter);
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log("📦 Retrieved students from cache:", cached.length);
          return cached;
        }
      }

      console.log("🔄 Fetching students from database...");
      
      const response = await fetch('/api/students');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allStudents: Student[] = await response.json();
      console.log("📊 Loaded students from database:", allStudents.length);

      // Filter students if needed
      let filteredStudents = allStudents;
      if (filter) {
        filteredStudents = this.filterStudents(allStudents, filter);
        console.log(`🔍 Filtered to ${filteredStudents.length} students for section`);
      }

      // Cache the results
      this.cache.set(cacheKey, filteredStudents);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return filteredStudents;
    } catch (error) {
      console.error("❌ Error fetching students from database:", error);
      return [];
    }
  }

  /**
   * Get students for a specific section
   */
  async getStudentsBySection(
    courseType: string,
    year: string,
    courseDivision?: string,
    batch?: string
  ): Promise<Student[]> {
    return this.getStudents({
      courseType,
      year,
      courseDivision,
      batch
    });
  }

  /**
   * Delete a student from the database
   */
  async deleteStudent(studentId: number): Promise<boolean> {
    try {
      console.log("🗑️ Deleting student from database:", studentId);

      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("✅ Student deleted from database");

      // Clear cache to force refresh
      this.clearCache();

      return true;
    } catch (error) {
      console.error("❌ Error deleting student from database:", error);
      return false;
    }
  }

  /**
   * Update a student in the database
   */
  async updateStudent(studentId: number, updates: Partial<InsertStudent>): Promise<Student | null> {
    try {
      console.log("📝 Updating student in database:", studentId, updates);

      const response = await fetch('/api/students', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: studentId,
          ...updates
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedStudent = await response.json();
      console.log("✅ Student updated in database:", updatedStudent);

      // Clear cache to force refresh
      this.clearCache();

      return updatedStudent;
    } catch (error) {
      console.error("❌ Error updating student in database:", error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log("🧹 Student cache cleared");
  }

  /**
   * Generate cache key for filtering
   */
  private getCacheKey(filter?: SectionFilter): string {
    if (!filter) return 'all_students';
    
    return `${filter.courseType}_${filter.year}_${filter.courseDivision || 'none'}_${filter.batch || 'none'}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.CACHE_DURATION;
  }

  /**
   * Filter students based on section criteria
   */
  private filterStudents(students: Student[], filter: SectionFilter): Student[] {
    return students.filter(student => {
      if (student.courseType !== filter.courseType) return false;
      if (student.year !== filter.year) return false;
      if (filter.courseDivision && student.courseDivision !== filter.courseDivision) return false;
      if (filter.batch && student.batch !== filter.batch) return false;
      return true;
    });
  }

  /**
   * Clear old localStorage data and migrate to database (one-time operation)
   */
  async migrateFromLocalStorage(): Promise<number> {
    const oldKeys = [
      'pu_1_commerce_A', 'pu_1_commerce_B',
      'pu_2_commerce_A', 'pu_2_commerce_B', 
      'pu_1_science_A', 'pu_2_science_A',
      'post-pu_3_A', 'post-pu_4_A', 'post-pu_5_A', 'post-pu_6_A', 'post-pu_7_A'
    ];

    let migratedCount = 0;

    for (const key of oldKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const students = JSON.parse(stored);
          console.log(`🔄 Migrating ${students.length} students from ${key}`);

          for (const student of students) {
            // Convert localStorage student to database format
            const dbStudent: InsertStudent = {
              name: student.name || '',
              rollNo: student.rollNo || '',
              courseType: student.courseType || 'pu',
              courseDivision: student.courseDivision || null,
              year: student.year || '1',
              batch: student.batch || null,
              dob: student.dob || '2000-01-01',
              bloodGroup: student.bloodGroup || null,
              fatherName: student.fatherName || null,
              motherName: student.motherName || null,
              contact1: null,
              contact2: null,
              address: student.address || null,
              photoUrl: student.photoUrl || null,
            };

            const saved = await this.saveStudent(dbStudent);
            if (saved) {
              migratedCount++;
            }
          }

          // Remove the old localStorage key after successful migration
          localStorage.removeItem(key);
          console.log(`✅ Migrated and cleared ${key}`);
        } catch (error) {
          console.error(`❌ Error migrating students from ${key}:`, error);
        }
      }
    }

    if (migratedCount > 0) {
      console.log(`🎉 Successfully migrated ${migratedCount} students to database`);
    }

    return migratedCount;
  }
}

// Create and export singleton instance
export const databaseStudentStorage = new DatabaseStudentStorage();

// Export the class for type checking
export { DatabaseStudentStorage };