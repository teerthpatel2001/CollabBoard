import api from './api';
import { ApiResponse, User, AuthTokens, LoginFormData, RegisterFormData } from '../types';

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authService = {
  register: async (data: RegisterFormData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    const { tokens, user } = response.data.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return { user, tokens };
  },

  login: async (data: LoginFormData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    const { tokens, user } = response.data.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return { user, tokens };
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },

  updateProfile: async (data: { name?: string; avatar?: string }): Promise<User> => {
    const response = await api.patch<ApiResponse<{ user: User }>>('/auth/profile', data);
    return response.data.data.user;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.patch('/auth/change-password', data);
  },

  refreshToken: async (): Promise<AuthTokens> => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post<ApiResponse<{ tokens: AuthTokens }>>('/auth/refresh-token', {
      refreshToken,
    });
    const { tokens } = response.data.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return tokens;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },
};