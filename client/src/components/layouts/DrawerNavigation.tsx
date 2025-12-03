import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Menu, 
  X, 
  ClipboardCheck, 
  Church, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  CalendarDays, 
  Clock, 
  Users, 
  BookOpen,
  Database,
  AlertTriangle,
  LogOut
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

import darulIrshadLogo from '@assets/darul_irshad_mani-removebg-preview.png';

interface DrawerNavigationProps {
  onModuleSelect: (module: string) => void;
}

export default function DrawerNavigation({ onModuleSelect }: DrawerNavigationProps) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const role = user?.role || 'teacher';
  
  // Handle selecting a module from the drawer
  const handleModuleSelect = (module: string) => {
    // Close drawer and navigate
    setOpen(false);
    onModuleSelect(module);
  };
  

  
  const menuItems = [
    {
      name: 'Attendance',
      icon: <ClipboardCheck className="h-5 w-5" />,
      module: 'attendance',
      isPrincipalOnly: false,
    },
    {
      name: 'Namaz',
      icon: <Church className="h-5 w-5" />,
      module: 'namaz',
      isPrincipalOnly: false,
    },
    {
      name: 'Leave',
      icon: <Calendar className="h-5 w-5" />,
      module: 'leave',
      isPrincipalOnly: false,
    },
    {
      name: 'Academic Calendar',
      icon: <CalendarDays className="h-5 w-5" />,
      module: 'academic-calendar',
      isPrincipalOnly: false,
    },
    {
      name: 'Remarks',
      icon: <MessageSquare className="h-5 w-5" />,
      module: 'remarks',
      isPrincipalOnly: false,
    },
    {
      name: 'Results',
      icon: <BarChart3 className="h-5 w-5" />,
      module: 'results',
      isPrincipalOnly: false,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed top-4 left-4 z-50 rounded-full bg-white brand-shadow hover:bg-gray-100 focus:outline-none min-h-[44px] min-w-[44px]"
        >
          <Menu className="h-5 w-5 brand-dark-blue" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="py-6 px-4 brand-nav text-white">
            <div className="flex items-center gap-3">
              <img 
                src={darulIrshadLogo} 
                alt="Darul Irshad Logo" 
                className="w-10 h-10 rounded-full bg-white p-0.5 shadow-sm object-contain"
              />
              <div>
                <SheetTitle className="text-white text-lg font-bold">Darul Irshad</SheetTitle>
                <p className="text-white opacity-80 text-xs">Education With Awareness</p>
              </div>
            </div>

          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto py-2">
            {menuItems
              .filter(item => item.module !== 'cleardata' && item.module !== 'classes') // Filter out data deletion and classes buttons
              .map((item) => (
                <button
                  key={item.module}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors min-h-[44px]"
                  onClick={() => handleModuleSelect(item.module)}
                >
                  <span className="brand-dark-blue">
                    {item.icon}
                  </span>
                  <span className="text-gray-700 font-medium">{item.name}</span>
                </button>
              ))}
          </div>

          {/* Logout Button */}
          <div className="border-t border-gray-200 p-4">
            <button
              className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-3 transition-colors min-h-[44px] rounded-lg"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <span className="text-red-600">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="text-red-600 font-medium">Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}