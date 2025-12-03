import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/hooks/use-notification";
import { ArrowLeft, Check, X } from "lucide-react";

interface Student {
  id: number;
  name: string;
  prayers: number;
  totalPrayers: number;
  status: "present" | "absent";
}

interface NamazScreenProps {
  onBack: () => void;
  role: string;
}

export default function NamazScreen({ onBack, role }: NamazScreenProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [prayer, setPrayer] = useState("zuhr");
  const [year, setYear] = useState("");
  const [batch, setBatch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Students data - will load from your actual student database
  const [students, setStudents] = useState<Student[]>([]);
  
  const { showNotification } = useNotification();
  
  const handleStatusChange = (id: number, status: "present" | "absent") => {
    setStudents(students.map(student => 
      student.id === id ? { ...student, status } : student
    ));
  };
  
  const markAllAbsent = () => {
    setStudents(students.map(student => ({ ...student, status: "absent" })));
  };
  
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const presentPercentage = Math.round(
    (students.filter(s => s.status === "present").length / students.length) * 100
  );
  
  const saveNamazAttendance = () => {
    // In a real app, call an API to save the namaz attendance data
    showNotification("Namaz attendance has been marked successfully.", "success");
    onBack();
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className={`flex items-center p-4 ${role === 'principal' ? 'bg-principal-primary' : 'bg-teacher-primary'} text-white`}>
        <button 
          className="mr-3 back-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-colors relative z-30 cursor-pointer" 
          aria-label="Go back"
          onClick={onBack}
          type="button"
          style={{ pointerEvents: 'auto' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Namaz Tracking</h2>
      </div>
      
      <div className="p-4 bg-teacher-light space-y-2">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Input 
            type="date"
            className="p-2 rounded-lg border border-gray-300 text-sm"
            aria-label="Select date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          
          <Select value={prayer} onValueChange={setPrayer}>
            <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
              <SelectValue placeholder="Select prayer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fajr">Fajr</SelectItem>
              <SelectItem value="zuhr">Zuhr</SelectItem>
              <SelectItem value="asr">Asr</SelectItem>
              <SelectItem value="maghrib">Maghrib</SelectItem>
              <SelectItem value="isha">Isha</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Year (PUC)</SelectItem>
              <SelectItem value="2">2nd Year (PUC)</SelectItem>
              <SelectItem value="3">3rd Year (Post-PUC)</SelectItem>
              <SelectItem value="4">4th Year (Post-PUC)</SelectItem>
              <SelectItem value="5">5th Year (Post-PUC)</SelectItem>
              <SelectItem value="6">6th Year (Post-PUC)</SelectItem>
              <SelectItem value="7">7th Year (Post-PUC)</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
              <SelectValue placeholder="Select Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Batch A</SelectItem>
              <SelectItem value="b">Batch B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="relative">
          <Input 
            type="text"
            placeholder="Search students..."
            className="w-full p-2 pl-8 rounded-lg border border-gray-300 text-sm"
            aria-label="Search students"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
        </div>
      </div>
      
      <div className="p-4 bg-white">
        <div className="bg-gray-100 rounded-lg p-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Namaz Attendance Overview</h3>
          <div className="relative pt-1">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs font-semibold inline-block text-green-600">
                  Present: {presentPercentage}%
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold inline-block text-red-600">
                  Absent: {100 - presentPercentage}%
                </span>
              </div>
            </div>
            <div className="flex h-2 overflow-hidden text-xs bg-red-200 rounded">
              <div style={{ width: `${presentPercentage}%` }} className="bg-green-500"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total: <span>{students.length}</span> students</h3>
            <Button 
              variant="outline"
              type="button"
              className="text-xs bg-gray-200 py-1 px-2 rounded text-gray-700 hover:bg-gray-300 active:bg-gray-400 transition-colors cursor-pointer shadow-sm"
              onClick={markAllAbsent}
            >
              Mark All Absent
            </Button>
          </div>
          
          {filteredStudents.map((student) => (
            <div 
              key={student.id} 
              className={`bg-white rounded-xl shadow-sm p-3 flex items-center justify-between relative 
                ${student.status === 'present' ? 'border-l-4 border-blue-500' : student.status === 'absent' ? 'border-l-4 border-error' : ''}
                transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer
              `}
              onClick={() => {
                // Toggle status when clicking on the card
                const newStatus = student.status === 'present' ? 'absent' : 'present';
                handleStatusChange(student.id, newStatus);
              }}
            >
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-600">
                  <span className="font-medium">{student.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">{student.name}</h4>
                  <p className="text-xs text-gray-500">{student.prayers}/{student.totalPrayers} prayers today</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  type="button"
                  className={`present-btn ${student.status === 'present' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'} h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:opacity-80 active:opacity-70`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleStatusChange(student.id, "present");
                  }}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button 
                  type="button"
                  className={`absent-btn ${student.status === 'absent' ? 'bg-error text-white' : 'bg-gray-200 text-gray-500'} h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:opacity-80 active:opacity-70`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleStatusChange(student.id, "absent");
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Save Button */}
      <div className="p-4 bg-white border-t">
        <Button 
          type="button"
          className={`w-full py-3 px-4 ${role === 'principal' ? 'bg-principal-primary hover:bg-principal-dark' : 'bg-teacher-primary hover:bg-teacher-dark'} text-white rounded-lg font-medium shadow-sm transition-colors duration-200 hover:shadow-md active:scale-[0.98] cursor-pointer`}
          onClick={saveNamazAttendance}
        >
          Save Namaz Attendance
        </Button>
      </div>
    </div>
  );
}
