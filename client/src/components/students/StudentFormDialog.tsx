import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useNotification } from '@/hooks/use-notification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  rollNo: z.string().min(1, { message: 'Roll number is required' }),
  courseType: z.string(),
  courseDivision: z.string().optional(),
  year: z.string(),
  batch: z.string().optional(),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  address: z.string().optional(),
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

export default function StudentFormDialog({ open, onOpenChange, student, classConfig, saveStudent: saveStudentData }: StudentFormDialogProps) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Photo upload state
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Initialize photo preview from student data if available
  useEffect(() => {
    if (student?.photoUrl) {
      setPhotoPreview(student.photoUrl);
    } else {
      setPhotoPreview(null);
    }
    setStudentPhoto(null);
  }, [student]);
  
  // Initialize form with existing student data or defaults
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
  
  // State for tracking submission status
  const [isPending, setIsPending] = useState(false);
  
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof studentFormSchema>) => {
      if (student?.id) {
        return apiRequest(`/api/students/${student.id}`, 'PUT', data);
      } else {
        return apiRequest('/api/students', 'POST', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      // Removed success notification to avoid popup interruption
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      showNotification(`Error: ${error.message}`, 'error');
    }
  });
  
  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload an image file', 'error');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Image size should be less than 2MB', 'error');
      return;
    }
    
    setStudentPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      // Update form value for photoUrl to keep track of change
      form.setValue('photoUrl', URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };
  
  // Form submission handler
  const onSubmit = (data: z.infer<typeof studentFormSchema>) => {
    // Here, in a real implementation, you would upload the photo
    // to a server/storage and then update the photoUrl field in data
    // with the URL of the uploaded image before saving the student data
    
    // For now, if there's a new photo, just simulate setting the URL
    if (studentPhoto && photoPreview) {
      // In a real app, this would be the URL returned from the upload service
      data.photoUrl = photoPreview as string;
    }
    
    // Use the saveStudentData prop from parent component instead of API call
    saveStudentData(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          <DialogDescription>
            {student ? "Update student information below." : "Enter student details to add them to this class."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Photo Upload */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 border-b pb-1">Student Photo</h3>
                <div className="mt-2 flex items-center gap-x-3">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Student photo"
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {photoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 ml-2"
                        onClick={() => {
                          setPhotoPreview(null);
                          setStudentPhoto(null);
                          form.setValue('photoUrl', '');
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a clear passport size photo (JPEG or PNG, max 2MB)
                </p>
              </div>
              
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 border-b pb-1">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student name" {...field} />
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
              
              {/* Class Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Class Information</h3>
                
                <FormField
                  control={form.control}
                  name="courseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Type</FormLabel>
                      <Select
                        disabled
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pu">PU College</SelectItem>
                          <SelectItem value="post-pu">Post-PUC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {classConfig.courseType === 'pu' && (
                  <FormField
                    control={form.control}
                    name="courseDivision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Division</FormLabel>
                        <Select
                          disabled
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="commerce">Commerce</SelectItem>
                            <SelectItem value="science">Science</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select
                        disabled
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classConfig.courseType === 'pu' ? (
                            <>
                              <SelectItem value="1">1st Year</SelectItem>
                              <SelectItem value="2">2nd Year</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="3">3rd Year</SelectItem>
                              <SelectItem value="4">4th Year</SelectItem>
                              <SelectItem value="5">5th Year</SelectItem>
                              <SelectItem value="6">6th Year</SelectItem>
                              <SelectItem value="7">7th Year</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {classConfig.sections.length > 1 && (
                  <FormField
                    control={form.control}
                    name="batch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classConfig.sections.map(section => (
                              <SelectItem key={section} value={section}>
                                Section {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              {/* Family Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Family Information</h3>
                
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
              </div>
              
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Contact Information</h3>
                
                <FormField
                  control={form.control}
                  name="contact1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter primary contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contact2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternative Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter alternative contact number" {...field} />
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
                          placeholder="Enter full address" 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
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