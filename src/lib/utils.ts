import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function generateId(): string {
  return (
    "id-" +
    Math.random().toString(36).substr(2, 9) +
    "-" +
    Date.now().toString(36)
  );
}
