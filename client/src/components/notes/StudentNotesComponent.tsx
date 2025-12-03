import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNotification } from '@/hooks/use-notification';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Pencil, Save, Plus, FileText } from 'lucide-react';

interface StudentNote {
  id: number;
  studentId: number;
  content: string;
  createdAt: string;
  createdBy: string;
  createdByRole: 'teacher' | 'principal';
  visibleTo: ('teacher' | 'principal')[];
}

interface StudentNotesProps {
  studentId: number;
  userRole: 'teacher' | 'principal';
  userName: string;
}

export default function StudentNotesComponent({ studentId, userRole, userName }: StudentNotesProps) {
  const { showNotification } = useNotification();
  const [notes, setNotes] = useState<StudentNote[]>([
    {
      id: 1,
      studentId: studentId,
      content: "Student has shown excellent progress in mathematics. Consider advanced placement for next term.",
      createdAt: "2025-04-15T10:30:00",
      createdBy: "Ahmed Ali",
      createdByRole: "teacher",
      visibleTo: ["teacher", "principal"]
    },
    {
      id: 2,
      studentId: studentId,
      content: "Student needs additional support with Arabic language skills. Parents have been notified.",
      createdAt: "2025-04-20T14:15:00",
      createdBy: "Fatima Khan",
      createdByRole: "teacher",
      visibleTo: ["teacher", "principal"]
    },
    {
      id: 3,
      studentId: studentId,
      content: "Disciplinary meeting scheduled with parents on May 5th regarding attendance issues.",
      createdAt: "2025-04-25T09:45:00",
      createdBy: "Ibrahim Hussain",
      createdByRole: "principal",
      visibleTo: ["principal"]
    }
  ]);

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState<number | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isPrincipalOnly, setIsPrincipalOnly] = useState(false);

  // Filter notes based on user role
  const filteredNotes = notes.filter(note => note.visibleTo.includes(userRole));

  const handleSaveNote = () => {
    if (!newNoteContent.trim()) {
      showNotification("Note content cannot be empty", "error");
      return;
    }

    if (isEditingNote !== null) {
      // Edit existing note
      setNotes(prev => prev.map(note => 
        note.id === isEditingNote 
          ? {
              ...note,
              content: newNoteContent,
              visibleTo: isPrincipalOnly ? ["principal"] : ["teacher", "principal"]
            }
          : note
      ));
      showNotification("Note updated successfully", "success");
    } else {
      // Add new note
      const newNote: StudentNote = {
        id: Math.max(0, ...notes.map(n => n.id)) + 1,
        studentId,
        content: newNoteContent,
        createdAt: new Date().toISOString(),
        createdBy: userName,
        createdByRole: userRole,
        visibleTo: isPrincipalOnly ? ["principal"] : ["teacher", "principal"]
      };
      
      setNotes(prev => [...prev, newNote]);
      showNotification("Note added successfully", "success");
    }
    
    setNewNoteContent("");
    setIsAddingNote(false);
    setIsEditingNote(null);
    setIsPrincipalOnly(false);
  };

  const handleEditNote = (note: StudentNote) => {
    setNewNoteContent(note.content);
    setIsPrincipalOnly(note.visibleTo.length === 1 && note.visibleTo[0] === "principal");
    setIsEditingNote(note.id);
    setIsAddingNote(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Student Notes</h2>
        <Button
          onClick={() => {
            setNewNoteContent("");
            setIsPrincipalOnly(false);
            setIsEditingNote(null);
            setIsAddingNote(true);
          }}
          className="bg-teacher-primary hover:bg-teacher-primary/90"
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Note
        </Button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-600 font-medium">No notes available</p>
          <p className="text-sm text-gray-500">Add a note to start tracking student information</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <Card key={note.id} className={`border-l-4 ${note.visibleTo.length === 1 ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{note.createdBy}</CardTitle>
                    <CardDescription className="text-xs">{formatDate(note.createdAt)}</CardDescription>
                  </div>
                  
                  {note.createdByRole === userRole && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => handleEditNote(note)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit note</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </CardContent>
              <CardFooter className="pt-0 pb-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teacher-primary/10 text-teacher-primary">
                    Teacher
                  </span>
                  
                  {note.visibleTo.length === 1 && (
                    <span className="text-xs text-amber-600 px-2 py-0.5 rounded-full bg-amber-50">
                      Private/Administrative
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Note Dialog */}
      <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditingNote !== null ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              {isEditingNote !== null 
                ? 'Update the existing note information.' 
                : 'Add important information about this student.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-content">Note Content</Label>
              <Textarea
                id="note-content"
                placeholder="Enter note details..."
                rows={5}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="resize-none"
              />
            </div>
            
            {/* Users can now mark notes as private or for administrative use only */}
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="admin-only" 
                checked={isPrincipalOnly}
                onChange={(e) => setIsPrincipalOnly(e.target.checked)}
                className="rounded border-gray-300 text-teacher-primary focus:ring-teacher-primary"
              />
              <Label htmlFor="admin-only" className="cursor-pointer">Mark as private/administrative</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsAddingNote(false);
                setNewNoteContent("");
                setIsEditingNote(null);
                setIsPrincipalOnly(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveNote}
              className="bg-teacher-primary hover:bg-teacher-primary/90"
            >
              <Save className="mr-1 h-4 w-4" />
              {isEditingNote !== null ? 'Update Note' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}