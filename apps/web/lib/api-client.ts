/**
 * API Client for SAK ERP System
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://35.154.55.38/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

interface LoginData {
  email: string;
  password: string;
  tenantId?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
}

interface ResetPasswordRequestData {
  email: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Merge existing headers
      if (options.headers) {
        const existingHeaders = options.headers as Record<string, string>;
        Object.assign(headers, existingHeaders);
      }

      // Add auth token if available
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * Get JWT token from localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Save JWT tokens to localStorage
   */
  private saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Remove tokens from localStorage
   */
  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Register a new user and create company
   */
  async register(data: RegisterData): Promise<ApiResponse<any>> {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      // Auto-login after registration
      const authData = response.data as any;
      if (authData.accessToken && authData.refreshToken) {
        this.saveTokens(authData.accessToken, authData.refreshToken);
      }
    }

    return response;
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      this.saveTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    this.clearTokens();
    return response;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: ResetPasswordRequestData): Promise<ApiResponse> {
    return this.request('/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot refresh token on server side' };
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    const response = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success && response.data) {
      const authData = response.data as any;
      this.saveTokens(authData.accessToken, authData.refreshToken);
    }

    return response;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Generic GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      if (queryString) {
        url = `${endpoint}?${queryString}`;
      }
    }
    const response = await this.request<T>(url, { method: 'GET' });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, { method: 'DELETE' });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiResponse, RegisterData, LoginData, LoginResponse, ResetPasswordRequestData };
