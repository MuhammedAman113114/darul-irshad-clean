// Section-based storage system for managing student data by class/section

// Our Student interface to match the app structure
export interface Student {
  id: number;
  name: string;
  rollNo: string;
  courseType: string; // "pu" or "post-pu"
  courseDivision?: string; // "commerce" or "science" for PU
  year: string; // "1" to "7" (1-2 for PU, 3-7 for Post-PUC)
  batch?: string; // Section identifier (A, B, etc)
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

// Storage keys for each class/section combination
const getSectionKey = (
  courseType: string,
  year: string,
  courseDivision?: string,
  section?: string
): string => {
  // Create unique key format: courseType_year_division_section
  if (courseType === 'pu') {
    return `${courseType}_${year}_${courseDivision || 'common'}_${section || 'all'}`;
  } else {
    return `${courseType}_${year}_${section || 'all'}`;
  }
};

// Save student with appropriate section key
export const saveStudent = (student: Student): boolean => {
  try {
    // First, remove the student from any previous section (if updating)
    if (student.id) {
      removeStudentFromAllSections(student.id);
    }
    
    // Get the student's section key
    const sectionKey = getSectionKey(
      student.courseType, 
      student.year, 
      student.courseDivision, 
      student.batch
    );
    
    // Get existing students for this section
    const existingStudents = getStudentsBySection(
      student.courseType, 
      student.year, 
      student.courseDivision, 
      student.batch
    );
    
    // Check if student already exists in this section
    const existingIndex = existingStudents.findIndex(s => s.id === student.id);
    
    // Generate new ID if needed
    if (!student.id) {
      // Get all students to find highest ID
      const highestId = findHighestStudentId();
      student.id = highestId + 1;
    }
    
    // Update or add the student
    if (existingIndex >= 0) {
      existingStudents[existingIndex] = student;
    } else {
      existingStudents.push(student);
    }
    
    // Save updated student list
    localStorage.setItem(sectionKey, JSON.stringify(existingStudents));
    console.log(`Saved student to section key: ${sectionKey}`, student);
    return true;
  } catch (error) {
    console.error('Error saving student:', error);
    return false;
  }
};

// Get students by section
export const getStudentsBySection = (
  courseType: string,
  year: string,
  courseDivision?: string,
  section?: string
): Student[] => {
  try {
    const sectionKey = getSectionKey(courseType, year, courseDivision, section);
    const studentsJson = localStorage.getItem(sectionKey);
    
    if (!studentsJson) {
      return [];
    }
    
    return JSON.parse(studentsJson) as Student[];
  } catch (error) {
    console.error('Error getting students by section:', error);
    return [];
  }
};

// Get all students across all sections
export const getAllStudents = (): Student[] => {
  try {
    const allStudents: Student[] = [];
    const allKeys = Object.keys(localStorage);
    
    // Filter keys that might contain student data (based on our key pattern)
    const studentKeys = allKeys.filter(key => 
      key.startsWith('pu_') || key.startsWith('post-pu_')
    );
    
    // Gather students from all matching keys
    studentKeys.forEach(key => {
      const studentsJson = localStorage.getItem(key);
      if (studentsJson) {
        try {
          const students = JSON.parse(studentsJson) as Student[];
          allStudents.push(...students);
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });
    
    return allStudents;
  } catch (error) {
    console.error('Error getting all students:', error);
    return [];
  }
};

// Find highest student ID across all sections
const findHighestStudentId = (): number => {
  const allStudents = getAllStudents();
  if (allStudents.length === 0) {
    return 0;
  }
  return Math.max(...allStudents.map(s => s.id));
};

// Remove a student from all sections
const removeStudentFromAllSections = (studentId: number): boolean => {
  try {
    const allKeys = Object.keys(localStorage);
    let removed = false;
    
    // Filter keys that might contain student data
    const studentKeys = allKeys.filter(key => 
      key.startsWith('pu_') || key.startsWith('post-pu_')
    );
    
    // Check each section for the student
    studentKeys.forEach(key => {
      const studentsJson = localStorage.getItem(key);
      if (studentsJson) {
        try {
          const students = JSON.parse(studentsJson) as Student[];
          const filteredStudents = students.filter(s => s.id !== studentId);
          
          // If student was found and removed, update storage
          if (filteredStudents.length !== students.length) {
            localStorage.setItem(key, JSON.stringify(filteredStudents));
            removed = true;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });
    
    return removed;
  } catch (error) {
    console.error('Error removing student:', error);
    return false;
  }
};

// Delete a student by ID
export const deleteStudent = (studentId: number): boolean => {
  return removeStudentFromAllSections(studentId);
};

// Clear all student data
export const clearAllStudentData = (): boolean => {
  try {
    const allKeys = Object.keys(localStorage);
    
    // Filter keys that might contain student data
    const studentKeys = allKeys.filter(key => 
      key.startsWith('pu_') || key.startsWith('post-pu_')
    );
    
    // Remove all student data
    studentKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing student data:', error);
    return false;
  }
};

// Export the storage API
export const SectionStorage = {
  saveStudent,
  getStudentsBySection,
  getAllStudents,
  deleteStudent,
  clearAllStudentData
};