/**
 * Utility to migrate students from localStorage to database
 */

import type { InsertStudent } from "@shared/schema";

export async function migrateLocalStorageStudentsToDatabase(): Promise<number> {
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
            rollNo: student.rollNo || String(Math.floor(Math.random() * 1000)),
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

          try {
            const response = await fetch('/api/students', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(dbStudent),
            });

            if (response.ok) {
              migratedCount++;
              console.log(`✅ Migrated student: ${student.name}`);
            } else {
              console.error(`❌ Failed to migrate student: ${student.name}`);
            }
          } catch (error) {
            console.error(`❌ Error migrating student ${student.name}:`, error);
          }
        }

        // Remove the old localStorage key after successful migration
        localStorage.removeItem(key);
        console.log(`🧹 Cleared localStorage key: ${key}`);
      } catch (error) {
        console.error(`❌ Error processing localStorage key ${key}:`, error);
      }
    }
  }

  if (migratedCount > 0) {
    console.log(`🎉 Successfully migrated ${migratedCount} students to database`);
  } else {
    console.log("📭 No students found to migrate");
  }

  return migratedCount;
}

// Auto-migrate on import (run once)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    migrateLocalStorageStudentsToDatabase();
  }, 2000); // Delay to ensure app is loaded
}