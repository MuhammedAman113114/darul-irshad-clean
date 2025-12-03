import React from 'react';
import { Button } from '@/components/ui/button';

interface SectionNavigationButtonsProps {
  classConfig: {
    courseType: string;
    year: string;
    courseDivision?: string;
    sections: string[];
  };
  onSelectSection?: (section: string) => void;
}

export const SectionNavigationButtons = ({ classConfig, onSelectSection }: SectionNavigationButtonsProps) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {classConfig.sections.map(section => {
        // Create the class storage key for this section
        const sectionKey = `${classConfig.courseType}_${classConfig.year}_${classConfig.courseDivision || 'common'}_${section}`;
        
        return (
          <Button 
            key={section}
            variant="outline" 
            onClick={() => {
              // Create URL for navigating to the section page
              const sectionUrl = `/class/${classConfig.year}PU_${classConfig.courseDivision?.slice(0, 3).toUpperCase()}/section/${section}`;
              
              // Navigate to the section page
              window.location.href = sectionUrl;
            }}
          >
            Section {section}
          </Button>
        );
      })}
    </div>
  );
};

export default SectionNavigationButtons;