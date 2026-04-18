import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GRADE_POINTS = {
  'A': 5,
  'B': 4,
  'C': 3,
  'D': 2,
  'E': 1,
  'F': 0
};

export function calculateGPA(courses: { units: number | string, grade: string }[]) {
  let totalPoints = 0;
  let totalUnits = 0;

  courses.forEach(course => {
    const units = Number(course.units) || 0;
    const point = GRADE_POINTS[course.grade as keyof typeof GRADE_POINTS] || 0;
    totalPoints += point * units;
    totalUnits += units;
  });

  return totalUnits > 0 ? Number((totalPoints / totalUnits).toFixed(2)) : 0;
}
