// Unified Student Service for consistent data fetching across all modules
// Standardizes student loading logic used by Attendance, Remarks, Namaz, and Leave modules

export interface StudentData {
  id: number;
  name: string;
  rollNo: string;
  courseType?: string;
  courseDivision?: string;
  year?: string;
  batch?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  address?: string;
  status?: "present" | "absent" | "on-leave";
  onLeave?: boolean;
}

export interface FormattedStudent {
  id: number;
  name: string;
  rollNo: string;
  status: "present" | "absent" | "on-leave";
  onLeave: boolean;
  courseType?: string;
  courseDivision?: string;
  year?: string;
  batch?: string;
}

/**
 * Generate section key using the same logic as Attendance module
 */
export function getSectionKey(courseType: string, year: string, courseDivision?: string, section: string = "A"): string {
  if (courseType === "post-pu") {
    return `${courseType}_${year}_A`;
  }
  return `${courseType}_${year}_${courseDivision || 'common'}_${section}`;
}

/**
 * Check if student is on approved leave for a specific date
 */
export function isStudentOnLeave(studentId: number, checkDate: string): boolean {
  try {
    const leaves = JSON.parse(localStorage.getItem("leaves_data") || "[]");
    return leaves.some((leave: any) =>
      leave.studentId === studentId &&
      leave.status === 'approved' &&
      new Date(leave.fromDate) <= new Date(checkDate) &&
      new Date(leave.toDate) >= new Date(checkDate)
    );
  } catch (error) {
    console.warn('Error checking leave status:', error);
    return false;
  }
}

/**
 * Fetch students for a specific section using unified logic
 * Same approach as Attendance module for consistency
 */
export function fetchStudentsBySection(
  courseType: string, 
  year: string, 
  courseDivision?: string, 
  section: string = "A", 
  date?: string
): FormattedStudent[] {
  try {
    const sectionKey = getSectionKey(courseType, year, courseDivision, section);
    console.log(`🔍 Fetching students with sectionKey: ${sectionKey}`);
    
    const sectionData = localStorage.getItem(sectionKey);
    const sectionStudents: StudentData[] = sectionData ? JSON.parse(sectionData) : [];
    
    console.log(`📚 Raw students found: ${sectionStudents.length}`);
    
    // Format students with leave status if date provided
    const currentDate = date || new Date().toISOString().split('T')[0];
    
    const formattedStudents: FormattedStudent[] = sectionStudents.map(student => {
      const onLeave = isStudentOnLeave(student.id, currentDate);
      
      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        status: onLeave ? "on-leave" : "present",
        onLeave: onLeave,
        courseType: student.courseType,
        courseDivision: student.courseDivision,
        year: student.year,
        batch: student.batch
      };
    });
    
    console.log(`✅ Formatted students: ${formattedStudents.length}`);
    return formattedStudents;
    
  } catch (error) {
    console.error('Error fetching students by section:', error);
    return [];
  }
}

/**
 * Fetch all students across all sections (for Leave management)
 */
export function fetchAllStudents(date?: string): FormattedStudent[] {
  console.warn('⚠️ fetchAllStudents() is deprecated. Use React Query with /api/students endpoint instead.');
  return [];
}

/**
 * Get available sections for a course type and year
 */
export function getAvailableSections(courseType: string, year: string, courseDivision?: string): string[] {
  const showSections = courseType === "pu" && 
                     (year === "1" || year === "2") && 
                     courseDivision === "commerce";
  
  return showSections ? ["A", "B"] : ["A"];
}

/**
 * Validate if students exist for given parameters
 */
export function validateStudentData(
  courseType: string, 
  year: string, 
  courseDivision?: string, 
  section: string = "A"
): { exists: boolean; count: number; sectionKey: string } {
  const sectionKey = getSectionKey(courseType, year, courseDivision, section);
  const sectionData = localStorage.getItem(sectionKey);
  const students = sectionData ? JSON.parse(sectionData) : [];
  
  return {
    exists: Array.isArray(students) && students.length > 0,
    count: students.length,
    sectionKey: sectionKey
  };
}