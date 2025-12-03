import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/hooks/use-notification";

interface PeriodSetupScreenProps {
  onBack: () => void;
}

interface Period {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
}

export default function PeriodSetupScreen({ onBack }: PeriodSetupScreenProps) {
  const [selectedCourse, setSelectedCourse] = useState("pu");
  
  // Mock period setups - in a real app, this would come from an API call
  const [puPeriods, setPuPeriods] = useState<Period[]>([
    { id: 1, name: "Period 1", startTime: "09:00", endTime: "10:00" },
    { id: 2, name: "Period 2", startTime: "10:00", endTime: "11:00" },
    { id: 3, name: "Period 3", startTime: "11:30", endTime: "12:30" },
  ]);
  
  const [postPuPeriods, setPostPuPeriods] = useState<Period[]>([
    { id: 1, name: "Period 1", startTime: "09:00", endTime: "10:00" },
    { id: 2, name: "Period 2", startTime: "10:00", endTime: "11:00" },
    { id: 3, name: "Period 3", startTime: "11:30", endTime: "12:30" },
    { id: 4, name: "Period 4", startTime: "13:30", endTime: "14:30" },
    { id: 5, name: "Period 5", startTime: "14:30", endTime: "15:30" },
    { id: 6, name: "Period 6", startTime: "15:45", endTime: "16:45" },
    { id: 7, name: "Period 7", startTime: "16:45", endTime: "17:45" },
  ]);
  
  const { showNotification } = useNotification();
  
  const addPeriod = () => {
    if (selectedCourse === "pu") {
      const newId = puPeriods.length > 0 ? Math.max(...puPeriods.map(p => p.id)) + 1 : 1;
      const newPeriod: Period = {
        id: newId,
        name: `Period ${puPeriods.length + 1}`,
        startTime: "00:00",
        endTime: "00:00"
      };
      setPuPeriods([...puPeriods, newPeriod]);
    } else {
      const newId = postPuPeriods.length > 0 ? Math.max(...postPuPeriods.map(p => p.id)) + 1 : 1;
      const newPeriod: Period = {
        id: newId,
        name: `Period ${postPuPeriods.length + 1}`,
        startTime: "00:00",
        endTime: "00:00"
      };
      setPostPuPeriods([...postPuPeriods, newPeriod]);
    }
  };
  
  const removePeriod = (id: number) => {
    if (selectedCourse === "pu") {
      setPuPeriods(puPeriods.filter(period => period.id !== id));
    } else {
      setPostPuPeriods(postPuPeriods.filter(period => period.id !== id));
    }
  };
  
  const updatePeriod = (id: number, field: 'name' | 'startTime' | 'endTime', value: string) => {
    if (selectedCourse === "pu") {
      setPuPeriods(puPeriods.map(period => 
        period.id === id ? { ...period, [field]: value } : period
      ));
    } else {
      setPostPuPeriods(postPuPeriods.map(period => 
        period.id === id ? { ...period, [field]: value } : period
      ));
    }
  };
  
  const savePeriodSetup = () => {
    // In a real app, this would send the data to an API
    showNotification("Period setup saved successfully.", "success");
    onBack();
  };
  
  const periods = selectedCourse === "pu" ? puPeriods : postPuPeriods;

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center p-4 bg-principal-primary text-white">
        <button 
          className="mr-3 back-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-colors relative z-30 cursor-pointer" 
          aria-label="Go back"
          onClick={onBack}
          type="button"
          style={{ pointerEvents: 'auto' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Period Setup</h2>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Configure Periods</h3>
          
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full mb-4">
              <SelectValue placeholder="Select Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pu">PU College</SelectItem>
              <SelectItem value="post-pu">Post-PUC</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="space-y-3 mt-4">
            {periods.map((period) => (
              <div key={period.id} className="flex items-center space-x-2">
                <Input 
                  type="text"
                  className="flex-1"
                  value={period.name}
                  onChange={(e) => updatePeriod(period.id, 'name', e.target.value)}
                />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input 
                    type="time"
                    className="text-sm"
                    value={period.startTime}
                    onChange={(e) => updatePeriod(period.id, 'startTime', e.target.value)}
                  />
                  <Input 
                    type="time"
                    className="text-sm"
                    value={period.endTime}
                    onChange={(e) => updatePeriod(period.id, 'endTime', e.target.value)}
                  />
                </div>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => removePeriod(period.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <Button 
              variant="outline"
              className="text-sm flex items-center"
              onClick={addPeriod}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Period
            </Button>
            
            <div className="text-xs text-gray-500">
              {selectedCourse === "pu" 
                ? "PU College typically has 3 periods" 
                : "Post-PUC typically has 7-8 periods"}
            </div>
          </div>
        </div>
        
        <Button 
          className="w-full bg-principal-primary hover:bg-principal-dark"
          onClick={savePeriodSetup}
        >
          Save Period Configuration
        </Button>
      </div>
    </div>
  );
}
