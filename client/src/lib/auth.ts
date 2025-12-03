
import { apiRequest } from "./queryClient";

interface LoginCredentials {
  username: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  return response.json();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error("Failed to fetch current user");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
}
