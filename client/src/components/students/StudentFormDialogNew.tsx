import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/hooks/use-notification';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { User } from 'lucide-react';

// Define form schema
const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name is required (min 2 characters)' }),
  rollNo: z.string().min(1, { message: 'Roll number is required' }),
  courseType: z.string(),
  courseDivision: z.string().optional(),
  year: z.string(),
  batch: z.string().optional(),
  dob: z.string().min(1, { message: 'Date of birth is required' }),
  bloodGroup: z.string().min(1, { message: 'Blood group is required' }),
  fatherName: z.string().min(1, { message: 'Father\'s name is required' }),
  motherName: z.string().min(1, { message: 'Mother\'s name is required' }),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  address: z.string().min(1, { message: 'Address is required' }),
  photoUrl: z.string().optional(),
});

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: any;
  classConfig: {
    courseType: string;
    courseDivision?: string;
    year: string;
    sections: string[];
  };
  saveStudent: (data: any) => void;
}

export default function StudentFormDialog({ 
  open, 
  onOpenChange, 
  student, 
  classConfig, 
  saveStudent: saveStudentData 
}: StudentFormDialogProps) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Photo upload state
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photoUrl || null);
  
  // State for tracking submission status
  const [isPending, setIsPending] = useState(false);

  // Setup form with validation
  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: student ? {
      ...student
    } : {
      name: '',
      rollNo: '',
      courseType: classConfig.courseType,
      courseDivision: classConfig.courseDivision || undefined,
      year: classConfig.year,
      batch: classConfig.sections[0],
      dob: '',
      bloodGroup: '',
      fatherName: '',
      motherName: '',
      contact1: '',
      contact2: '',
      address: '',
      photoUrl: '',
    },
  });

  // Reset form when student changes
  useEffect(() => {
    if (student) {
      form.reset(student);
      setPhotoPreview(student.photoUrl || null);
    } else {
      form.reset({
        name: '',
        rollNo: '',
        courseType: classConfig.courseType,
        courseDivision: classConfig.courseDivision || undefined,
        year: classConfig.year,
        batch: classConfig.sections[0],
        dob: '',
        bloodGroup: '',
        fatherName: '',
        motherName: '',
        contact1: '',
        contact2: '',
        address: '',
        photoUrl: '',
      });
      setPhotoPreview(null);
    }
    setStudentPhoto(null);
  }, [student, classConfig, form]);

  // Handle photo upload
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setStudentPhoto(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Form submission handler
  const onSubmit = (data: z.infer<typeof studentFormSchema>) => {
    setIsPending(true);
    
    try {
      // Here, in a real implementation, you would upload the photo
      // to a server/storage and then update the photoUrl field in data
      // with the URL of the uploaded image before saving the student data
      
      // For now, if there's a new photo, just simulate setting the URL
      if (studentPhoto && photoPreview) {
        // In a real app, this would be the URL returned from the upload service
        data.photoUrl = photoPreview as string;
      }
      
      // Make sure we have the required fields for proper class filtering
      const preparedData = {
        ...data,
        // Ensure these fields are set correctly
        courseType: classConfig.courseType,
        courseDivision: classConfig.courseDivision,
        year: classConfig.year,
        // Use the current section from classConfig - this is critical for proper section assignment
        batch: classConfig.sections && classConfig.sections.length > 0 ? classConfig.sections[0] : "A"
      };
      
      console.log("Class config:", classConfig);
      
      console.log("Submitting student with data:", preparedData);
      
      // Use the saveStudentData prop from parent component
      saveStudentData(preparedData);
      
      // Removed success notification to avoid popup interruption
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      showNotification(`Error: ${error.message || 'An error occurred'}`, 'error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-center">Add New Student</DialogTitle>
            </DialogHeader>
            
            {/* Photo upload */}
            <div className="flex flex-col items-center space-y-3 pb-4 pt-2">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div>
                <Label htmlFor="photo" className="cursor-pointer inline-block text-sm px-4 py-2 bg-gray-50 rounded-md hover:bg-gray-100 border">
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Label>
                <Input 
                  id="photo" 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                  className="hidden" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-y-4">
              {/* Required Fields */}
              <div className="space-y-3">
                {/* Hidden fields for class info */}
                <input type="hidden" {...form.register("courseType")} />
                <input type="hidden" {...form.register("courseDivision")} />
                <input type="hidden" {...form.register("year")} />
                <input type="hidden" {...form.register("batch")} />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student's full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rollNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter roll number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter father's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter mother's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter full address (street, city, pin code)" 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}