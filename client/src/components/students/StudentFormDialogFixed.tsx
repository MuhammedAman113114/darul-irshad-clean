import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotification } from '@/hooks/use-notification';
import type { Student, InsertStudent } from "@shared/schema";
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

// Define form schema matching the database schema
const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'Full name is required (min 2 characters)' }),
  rollNo: z.string().optional(), // Made optional to allow empty roll numbers
  courseType: z.string(),
  courseDivision: z.string().nullable().optional(),
  year: z.string(),
  batch: z.string().nullable().optional(),
  dob: z.string().min(1, { message: 'Date of birth is required' }),
  bloodGroup: z.string().nullable().optional(),
  fatherName: z.string().nullable().optional(),
  motherName: z.string().nullable().optional(),
  contact1: z.string().nullable().optional(),
  contact2: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  aadharNumber: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

interface StudentFormDialogProps {
  student?: Student | null;
  onSave: (data: InsertStudent) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function StudentFormDialog({ 
  student, 
  onSave, 
  onCancel, 
  isLoading = false 
}: StudentFormDialogProps) {
  const { showNotification } = useNotification();
  
  // Photo upload state
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photoUrl || null);

  // Setup form with validation
  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      rollNo: '',
      courseType: 'pu',
      courseDivision: 'commerce',
      year: '1',
      batch: 'A',
      dob: '',
      bloodGroup: '',
      fatherName: '',
      motherName: '',
      contact1: '',
      contact2: '',
      address: '',
      aadharNumber: '',
      photoUrl: '',
    },
  });

  // Reset form when student changes
  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        rollNo: student.rollNo,
        courseType: student.courseType,
        courseDivision: student.courseDivision,
        year: student.year,
        batch: student.batch,
        dob: student.dob,
        bloodGroup: student.bloodGroup || '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        contact1: student.contact1 || '',
        contact2: student.contact2 || '',
        address: student.address || '',
        aadharNumber: student.aadharNumber || '',
        photoUrl: student.photoUrl || '',
      });
      setPhotoPreview(student.photoUrl || null);
    } else {
      form.reset({
        name: '',
        rollNo: '',
        courseType: 'pu',
        courseDivision: 'commerce',
        year: '1',
        batch: 'A',
        dob: '',
        bloodGroup: '',
        fatherName: '',
        motherName: '',
        contact1: '',
        contact2: '',
        address: '',
        aadharNumber: '',
        photoUrl: '',
      });
      setPhotoPreview(null);
    }
    setStudentPhoto(null);
  }, [student, form]);

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
  const onSubmit = async (data: z.infer<typeof studentFormSchema>) => {
    try {
      console.log("🚀 Form onSubmit triggered");
      console.log("📝 Form data received:", data);
      console.log("👤 Student context:", student ? "EDITING" : "CREATING");
      console.log("🎯 Student being edited:", student);
      
      // If there's a new photo, set the preview as photoUrl
      if (studentPhoto && photoPreview) {
        data.photoUrl = photoPreview;
      }
      
      // Prepare data for database
      const preparedData: InsertStudent = {
        name: data.name,
        rollNo: data.rollNo || '', // Ensure rollNo is always a string, default to empty string
        courseType: data.courseType,
        courseDivision: data.courseDivision || null,
        year: data.year,
        batch: data.batch || null,
        dob: data.dob,
        bloodGroup: data.bloodGroup || null,
        fatherName: data.fatherName || null,
        motherName: data.motherName || null,
        contact1: data.contact1 || null,
        contact2: data.contact2 || null,
        address: data.address || null,
        aadharNumber: data.aadharNumber || null,
        photoUrl: data.photoUrl || null,
      };
      
      console.log("📦 Prepared data for save:", preparedData);
      console.log("🔗 Calling onSave with prepared data...");
      
      // Call the parent's save function
      onSave(preparedData);
      
      console.log("✅ onSave called successfully");
      
    } catch (error: any) {
      console.error("❌ Form submission error:", error);
      showNotification(`Error: ${error.message || 'An error occurred'}`, 'error');
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log("🚨 Form validation errors:", errors);
            console.log("📝 Current form values:", form.getValues());
          })} className="space-y-4">
            
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
              {/* Basic Info */}
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

              {/* Course Information */}
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="courseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
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

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                          <SelectItem value="5">5th Year</SelectItem>
                          <SelectItem value="6">6th Year</SelectItem>
                          <SelectItem value="7">7th Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Course Division and Batch - only show for PU */}
              {form.watch("courseType") === "pu" && (
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="courseDivision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Division</FormLabel>
                        <Select value={field.value || ''} onValueChange={field.onChange}>
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

                  {form.watch("courseDivision") === "commerce" && (
                    <FormField
                      control={form.control}
                      name="batch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A">Section A</SelectItem>
                              <SelectItem value="B">Section B</SelectItem>
                              <SelectItem value="C">Section C</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
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
                      <Input placeholder="Enter father's name" {...field} value={field.value || ''} />
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
                      <Input placeholder="Enter mother's name" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter primary contact number" {...field} value={field.value || ''} />
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
                    <FormLabel>Contact Number 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter secondary contact number (optional)" {...field} value={field.value || ''} />
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
                        value={field.value || ''} 
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
                    <Select value={field.value || ''} onValueChange={field.onChange}>
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
              
              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 12-digit Aadhar number" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}