import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PeriodManagement from '@/components/periods/PeriodManagement';

interface PeriodManagementPageProps {
  onBack: () => void;
}

const PeriodManagementPage: React.FC<PeriodManagementPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mr-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">
            Period Management System
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <PeriodManagement />
      </div>
    </div>
  );
};

export default PeriodManagementPage;