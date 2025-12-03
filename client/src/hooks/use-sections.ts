import { useState, useEffect, useCallback } from 'react';
import { useNotification } from './use-notification';

export interface SectionConfig {
  courseType: string;
  year: string;
  courseDivision: string;
  sections: string[];
}

// Global section state management
let sectionListeners: Set<() => void> = new Set();

export const useSections = () => {
  const { showNotification } = useNotification();
  const [sectionsConfig, setSectionsConfig] = useState<{[key: string]: string[]}>({});

  // Load sections from localStorage
  const loadSections = useCallback(() => {
    try {
      const config: {[key: string]: string[]} = {};
      
      // Load PU Commerce sections
      const pu1Commerce = localStorage.getItem('pu_1_commerce_sections');
      const pu2Commerce = localStorage.getItem('pu_2_commerce_sections');
      
      config['pu_1_commerce'] = pu1Commerce ? JSON.parse(pu1Commerce) : ['A', 'B'];
      config['pu_2_commerce'] = pu2Commerce ? JSON.parse(pu2Commerce) : ['A', 'B'];
      
      // Load other course types as needed
      // Add more configurations here for science, post-pu, etc.
      
      setSectionsConfig(config);
      return config;
    } catch (error) {
      console.error('Error loading sections:', error);
      return {};
    }
  }, []);

  // Save sections to localStorage and notify all listeners
  const updateSections = useCallback((courseKey: string, sections: string[]) => {
    try {
      localStorage.setItem(`${courseKey}_sections`, JSON.stringify(sections));
      
      // Update local state
      setSectionsConfig(prev => ({
        ...prev,
        [courseKey]: sections
      }));
      
      // Notify all components listening to section changes
      sectionListeners.forEach(listener => listener());
      
      return true;
    } catch (error) {
      console.error('Error saving sections:', error);
      return false;
    }
  }, []);

  // Get sections for specific course
  const getSections = useCallback((courseType: string, year: string, courseDivision?: string) => {
    const courseKey = courseDivision 
      ? `${courseType}_${year}_${courseDivision}` 
      : `${courseType}_${year}`;
    
    return sectionsConfig[courseKey] || ['A'];
  }, [sectionsConfig]);

  // Add new section
  const addSection = useCallback((courseType: string, year: string, courseDivision: string, sectionName: string) => {
    const courseKey = `${courseType}_${year}_${courseDivision}`;
    const currentSections = sectionsConfig[courseKey] || [];
    
    if (currentSections.includes(sectionName.toUpperCase())) {
      showNotification(`Section ${sectionName} already exists`, "error");
      return false;
    }
    
    const updatedSections = [...currentSections, sectionName.toUpperCase()].sort();
    const success = updateSections(courseKey, updatedSections);
    
    if (success) {
      showNotification(`Section ${sectionName} added successfully`, "success");
    }
    
    return success;
  }, [sectionsConfig, updateSections, showNotification]);

  // Delete section
  const deleteSection = useCallback((courseType: string, year: string, courseDivision: string, sectionName: string) => {
    const courseKey = `${courseType}_${year}_${courseDivision}`;
    const currentSections = sectionsConfig[courseKey] || [];
    
    // Check if there are students in this section
    const studentsKey = `students_${courseType}_${year}_${courseDivision}_${sectionName.toLowerCase()}`;
    const studentsInSection = localStorage.getItem(studentsKey);
    
    if (studentsInSection) {
      const students = JSON.parse(studentsInSection);
      if (students.length > 0) {
        const confirmDelete = window.confirm(
          `Section ${sectionName} has ${students.length} student(s). Deleting this section will remove these students from the section. Continue?`
        );
        if (!confirmDelete) {
          return false;
        }
        
        // Remove students data for this section
        localStorage.removeItem(studentsKey);
      }
    }
    
    const updatedSections = currentSections.filter(section => section !== sectionName);
    const success = updateSections(courseKey, updatedSections);
    
    if (success) {
      showNotification(`Section ${sectionName} deleted successfully`, "success");
    }
    
    return success;
  }, [sectionsConfig, updateSections, showNotification]);

  // Subscribe to section changes
  const subscribeToSectionChanges = useCallback((callback: () => void) => {
    sectionListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      sectionListeners.delete(callback);
    };
  }, []);

  // Initialize sections on mount
  useEffect(() => {
    loadSections();
  }, [loadSections]);

  return {
    sectionsConfig,
    getSections,
    addSection,
    deleteSection,
    loadSections,
    subscribeToSectionChanges
  };
};

// Utility function to get sections for a specific course configuration
export const getSectionsForCourse = (courseType: string, year: string, courseDivision?: string): string[] => {
  const courseKey = courseDivision 
    ? `${courseType}_${year}_${courseDivision}` 
    : `${courseType}_${year}`;
  
  try {
    const stored = localStorage.getItem(`${courseKey}_sections`);
    return stored ? JSON.parse(stored) : ['A'];
  } catch {
    return ['A'];
  }
};