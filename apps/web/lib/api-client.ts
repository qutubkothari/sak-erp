/**
 * API Client for SAK ERP System
 * Handles all HTTP requests to the backend API
 */

const DEFAULT_BROWSER_API_BASE_URL = '/api/v1';
const DEFAULT_SERVER_API_BASE_URL =
  process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1';

function normalizeBaseUrl(value: string): string {
  // Trim whitespace and remove a trailing slash to avoid double slashes when joining.
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) {
    return normalizeBaseUrl(raw);
  }

  if (typeof window !== 'undefined') {
    // Use a relative URL so the Next.js server can proxy via rewrites.
    return DEFAULT_BROWSER_API_BASE_URL;
  }

  return normalizeBaseUrl(DEFAULT_SERVER_API_BASE_URL);
}

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
    email: string;
    firstName?: string;
    lastName?: string;
    tenantId?: string;
    isActive?: boolean;
    role?: {
      id: string;
      name: string;
      permissions?: any[];
    };
    roles?: Array<{
      role: {
        id: string;
        name: string;
        permissions?: any[];
      };
    }>;
  };
}

interface ResetPasswordRequestData {
  email: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl ?? getApiBaseUrl());
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

      const isFormData =
        typeof FormData !== 'undefined' && options.body instanceof FormData;

      const headers: Record<string, string> = {};

      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      // Merge existing headers
      if (options.headers) {
        const existingHeaders = options.headers as Record<string, string>;
        Object.assign(headers, existingHeaders);
      }

      const applyAuthHeader = (token: string | null) => {
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          delete headers['Authorization'];
        }
      };

      // Add auth token if available
      applyAuthHeader(this.getToken());

      const execute = async () => {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Some endpoints return 204/empty body; guard JSON parsing
        const text = await response.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text || null;
        }

        return { response, data };
      };

      let { response, data } = await execute();

      // If access token expired, attempt a single refresh + retry.
      const isAuthEndpoint = endpoint.startsWith('/auth/');
      if (
        response.status === 401 &&
        !isAuthEndpoint &&
        typeof window !== 'undefined'
      ) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            const refreshText = await refreshResponse.text();
            const refreshData = refreshText ? JSON.parse(refreshText) : null;

            if (refreshResponse.ok) {
              const authData = (refreshData as any)?.data ?? refreshData;
              const nextAccessToken = authData?.accessToken;
              const nextRefreshToken = authData?.refreshToken;
              if (nextAccessToken && nextRefreshToken) {
                this.saveTokens(nextAccessToken, nextRefreshToken);
                applyAuthHeader(nextAccessToken);
                ({ response, data } = await execute());
              }
            }
          } catch {
            // Ignore refresh errors; fall through to normal error handling.
          }
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`,
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
    // Clear any cached user data to prevent tenant data leakage
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('tenant');
    localStorage.removeItem('tenantId');
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
    // Clear any existing session data before login to prevent tenant mixing
    this.clearTokens();
    
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      this.saveTokens(response.data.accessToken, response.data.refreshToken);

      // Persist user for role-based UI and employee self-service mapping
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('userId', response.data.user.id);
        } catch {
          // ignore storage errors
        }
      }
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
   * Generic multipart/form-data POST request
   */
  async postForm<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
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
