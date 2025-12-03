import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration - Connect to your existing backend
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5000' // Android emulator connecting to localhost:5000
  : 'https://your-replit-url.replit.app'; // Replace with your Replit deployment URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (credentials: {username: string; password: string}) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
  getUser: async () => {
    const response = await api.get('/api/auth/user');
    return response.data;
  },
};

// Students API
export const studentsAPI = {
  getStudents: async (filters?: any) => {
    const response = await api.get('/api/students', { params: filters });
    return response.data;
  },
  createStudent: async (student: any) => {
    const response = await api.post('/api/students', student);
    return response.data;
  },
  updateStudent: async (id: number, student: any) => {
    const response = await api.put(`/api/students/${id}`, student);
    return response.data;
  },
  deleteStudent: async (id: number) => {
    const response = await api.delete(`/api/students/${id}`);
    return response.data;
  },
};

// Attendance API
export const attendanceAPI = {
  getAttendance: async (filters?: any) => {
    const response = await api.get('/api/attendance', { params: filters });
    return response.data;
  },
  saveAttendance: async (attendanceData: any) => {
    const response = await api.post('/api/attendance', attendanceData);
    return response.data;
  },
  getAttendanceSheet: async (filters?: any) => {
    const response = await api.get('/api/attendance/sheet', { params: filters });
    return response.data;
  },
  exportAttendance: async (filters?: any) => {
    const response = await api.get('/api/attendance/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },
};

// Namaz API
export const namazAPI = {
  getNamazAttendance: async (filters?: any) => {
    const response = await api.get('/api/namaz', { params: filters });
    return response.data;
  },
  saveNamazAttendance: async (namazData: any) => {
    const response = await api.post('/api/namaz', namazData);
    return response.data;
  },
  exportNamaz: async (filters?: any) => {
    const response = await api.get('/api/namaz/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },
};

// Leave API
export const leaveAPI = {
  getLeaves: async (filters?: any) => {
    const response = await api.get('/api/leaves', { params: filters });
    return response.data;
  },
  createLeave: async (leaveData: any) => {
    const response = await api.post('/api/leaves', leaveData);
    return response.data;
  },
  updateLeave: async (id: number, leaveData: any) => {
    const response = await api.put(`/api/leaves/${id}`, leaveData);
    return response.data;
  },
  deleteLeave: async (id: number) => {
    const response = await api.delete(`/api/leaves/${id}`);
    return response.data;
  },
};

// Timetable API
export const timetableAPI = {
  getTimetable: async (filters?: any) => {
    const response = await api.get('/api/timetable', { params: filters });
    return response.data;
  },
  getSubjects: async (filters?: any) => {
    const response = await api.get('/api/subjects', { params: filters });
    return response.data;
  },
  getPeriods: async (filters?: any) => {
    const response = await api.get('/api/periods', { params: filters });
    return response.data;
  },
};

// Holidays API
export const holidaysAPI = {
  getHolidays: async () => {
    const response = await api.get('/api/holidays');
    return response.data;
  },
  createHoliday: async (holidayData: any) => {
    const response = await api.post('/api/holidays', holidayData);
    return response.data;
  },
};

// Missed Sections API
export const missedSectionsAPI = {
  getMissedSections: async (filters?: any) => {
    const response = await api.get('/api/missed-sections', { params: filters });
    return response.data;
  },
  completeMissedSection: async (id: number, data: any) => {
    const response = await api.put(`/api/missed-sections/${id}/complete`, data);
    return response.data;
  },
};

export default api;