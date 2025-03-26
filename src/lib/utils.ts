import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanJobUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const jobId = pathSegments[pathSegments.length - 1].split('-').pop(); // Get the numeric ID at the end
    return `https://www.linkedin.com/jobs/view/${jobId}`;
  } catch (error) {
    console.error('Error cleaning URL:', error);
    return url;
  }
} 