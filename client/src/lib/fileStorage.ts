// File-based storage system to improve data persistence across sections
// Using the local Student interface to match the exact structure in our app
import { Student as SchemaStudent } from '@shared/schema';

// Our app-specific Student interface that matches our UI needs
interface Student {
  id: number;
  name: string;
  rollNo: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  batch?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  address?: string;
  attendance?: string;
  grade?: string;
  onLeave?: boolean;
  photoUrl?: string;
}
import { STORAGE_KEYS } from './localStorage';

// Helper type for data collections
type DataCollection = {
  [key: string]: any[];
};

// Store data by category (PU Commerce, PU Science, Post-PUC)
type CategoryData = {
  [category: string]: {
    [section: string]: any[];
  };
};

// Main storage object for all application data
const dataStore: {
  students: CategoryData;
  attendance: CategoryData;
  results: CategoryData;
} = {
  students: {},
  attendance: {},
  results: {}
};

// Initialize the store with localStorage data if available
const initializeStore = () => {
  try {
    // Try to load existing data from localStorage
    const studentsData = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    
    if (studentsData) {
      const students = JSON.parse(studentsData) as Student[];
      
      // Organize students by category and section
      students.forEach(student => {
        const category = getStudentCategory(student);
        const section = student.batch || 'default';
        
        // Initialize category if it doesn't exist
        if (!dataStore.students[category]) {
          dataStore.students[category] = {};
        }
        
        // Initialize section if it doesn't exist
        if (!dataStore.students[category][section]) {
          dataStore.students[category][section] = [];
        }
        
        // Add student to the appropriate section
        dataStore.students[category][section].push(student);
      });
    }
    
    console.log('Data store initialized:', dataStore);
  } catch (error) {
    console.error('Error initializing data store:', error);
  }
};

// Get the category key for a student based on course properties
const getStudentCategory = (student: Student): string => {
  if (student.courseType === 'pu') {
    return `pu_${student.courseDivision}_${student.year}`;
  } else {
    return `post_pu_${student.year}`;
  }
};

// Get all students from the store
export const getAllStudents = (): Student[] => {
  const allStudents: Student[] = [];
  
  // Gather students from all categories and sections
  Object.values(dataStore.students).forEach(category => {
    Object.values(category).forEach(section => {
      allStudents.push(...section);
    });
  });
  
  return allStudents;
};

// Save a student to the store
export const saveStudent = (student: Student): boolean => {
  try {
    const category = getStudentCategory(student);
    const section = student.batch || 'default';
    
    // Initialize category if it doesn't exist
    if (!dataStore.students[category]) {
      dataStore.students[category] = {};
    }
    
    // Initialize section if it doesn't exist
    if (!dataStore.students[category][section]) {
      dataStore.students[category][section] = [];
    }
    
    // Check if student already exists (for updates)
    const existingIndex = dataStore.students[category][section]
      .findIndex(s => s.id === student.id);
    
    if (existingIndex >= 0) {
      // Update existing student
      dataStore.students[category][section][existingIndex] = student;
    } else {
      // Add new student
      dataStore.students[category][section].push(student);
    }
    
    // Save all students back to localStorage for backup
    const allStudents = getAllStudents();
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(allStudents));
    
    console.log(`Student saved to ${category}/${section}:`, student);
    console.log('Updated data store:', dataStore);
    
    return true;
  } catch (error) {
    console.error('Error saving student:', error);
    return false;
  }
};

// Get students filtered by category and section
export const getStudentsBySection = (
  courseType: string,
  year: string,
  courseDivision?: string | undefined,
  section?: string | undefined
): Student[] => {
  try {
    // Create the category key
    const category = courseType === 'pu'
      ? `pu_${courseDivision}_${year}`
      : `post_pu_${year}`;
    
    // If the category doesn't exist, return empty array
    if (!dataStore.students[category]) {
      return [];
    }
    
    // If no section specified, return all students in the category
    if (!section) {
      const categoryStudents: Student[] = [];
      Object.values(dataStore.students[category]).forEach(sectionStudents => {
        categoryStudents.push(...sectionStudents);
      });
      return categoryStudents;
    }
    
    // Return students from the specified section
    return dataStore.students[category][section] || [];
  } catch (error) {
    console.error('Error getting students by section:', error);
    return [];
  }
};

// Delete a student from the store
export const deleteStudent = (studentId: number): boolean => {
  try {
    let deleted = false;
    
    // Check all categories and sections for the student
    Object.keys(dataStore.students).forEach(category => {
      Object.keys(dataStore.students[category]).forEach(section => {
        const index = dataStore.students[category][section]
          .findIndex(s => s.id === studentId);
        
        if (index >= 0) {
          // Remove the student
          dataStore.students[category][section].splice(index, 1);
          deleted = true;
        }
      });
    });
    
    if (deleted) {
      // Save the updated data back to localStorage
      const allStudents = getAllStudents();
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(allStudents));
    }
    
    return deleted;
  } catch (error) {
    console.error('Error deleting student:', error);
    return false;
  }
};

// Clear all data from the store and localStorage
export const clearAllData = (): boolean => {
  try {
    // Reset the store
    dataStore.students = {};
    dataStore.attendance = {};
    dataStore.results = {};
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

// Initialize the store when the module is imported
initializeStore();

// Export the file storage API
export const FileStorage = {
  getAllStudents,
  saveStudent,
  getStudentsBySection,
  deleteStudent,
  clearAllData
};