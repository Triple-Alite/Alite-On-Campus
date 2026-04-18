export interface User {
  uid: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'student' | 'student-seller' | 'admin';
  school?: string;
  department?: string;
  gpaHistory?: SemesterResult[];
}

export interface SemesterResult {
  id: string;
  semesterName: string;
  courses: CourseGrade[];
  gpa: number;
  totalUnits: number;
}

export interface CourseGrade {
  code: string;
  units: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  point: number;
}

export interface Note {
  id: string;
  title: string;
  fileUrl: string;
  courseCode: string;
  school: string;
  type: 'note' | 'past_question';
  uploadedBy: string;
  authorName: string;
  createdAt: any;
  likes: string[];
  imageUrl?: string;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  contact: string;
  imageUrl: string;
  category: 'hostel' | 'textbook' | 'gadget' | 'stationery' | 'apparel' | 'other';
  uploadedBy: string;
  createdAt: any;
}

export interface TimetableEntry {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  courseCode: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  userId: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
