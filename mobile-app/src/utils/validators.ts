// Validation utilities for forms and data

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateRollNumber = (rollNo: string): boolean => {
  return rollNo.trim().length >= 2 && rollNo.trim().length <= 20;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50;
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

export const validateBloodGroup = (bloodGroup: string): boolean => {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validGroups.includes(bloodGroup.toUpperCase());
};

export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength;
};

// Composite validators
export const studentValidators = {
  name: (name: string) => ({
    isValid: validateName(name),
    message: 'Name must be 2-50 characters long',
  }),
  
  rollNo: (rollNo: string) => ({
    isValid: validateRollNumber(rollNo),
    message: 'Roll number must be 2-20 characters long',
  }),
  
  phone: (phone: string) => ({
    isValid: phone === '' || validatePhone(phone),
    message: 'Please enter a valid phone number',
  }),
  
  email: (email: string) => ({
    isValid: email === '' || validateEmail(email),
    message: 'Please enter a valid email address',
  }),
  
  dob: (dob: string) => ({
    isValid: dob === '' || validateDate(dob),
    message: 'Please enter date in YYYY-MM-DD format',
  }),
  
  bloodGroup: (bloodGroup: string) => ({
    isValid: bloodGroup === '' || validateBloodGroup(bloodGroup),
    message: 'Please enter a valid blood group (A+, B-, etc.)',
  }),
};

export const leaveValidators = {
  reason: (reason: string) => ({
    isValid: validateMinLength(reason, 10),
    message: 'Reason must be at least 10 characters long',
  }),
  
  dateRange: (fromDate: Date, toDate: Date) => ({
    isValid: fromDate <= toDate,
    message: 'From date cannot be after to date',
  }),
};