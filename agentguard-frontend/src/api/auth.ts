import { apiClient, setAuthToken, removeAuthToken } from './client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
  created_at: string;
  is_default_password?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface ApiKeyResponse {
  api_key: string;
  created_at: string;
  role: string;
  description: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
      localStorage.setItem('user_profile', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (username: string, email: string, password: string, role?: string): Promise<UserProfile> => {
    const response = await apiClient.post<UserProfile>('/auth/register', {
      username,
      email,
      password,
      role: role || 'analyst',
    });
    return response.data;
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  changePassword: async (current_password: string, new_password: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/change-password', {
      current_password,
      new_password,
    });
    return response.data;
  },

  generateApiKey: async (): Promise<ApiKeyResponse> => {
    const response = await apiClient.post<ApiKeyResponse>('/auth/generate-key');
    return response.data;
  },

  bootstrap: async (): Promise<{ message: string; seeded: boolean }> => {
    const response = await apiClient.post('/auth/bootstrap');
    return response.data;
  },

  logout: (): void => {
    removeAuthToken();
    window.location.href = '/login';
  },

  getCurrentUser: (): UserProfile | null => {
    const raw = localStorage.getItem('user_profile');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
