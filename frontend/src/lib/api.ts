// API configuration and base fetch wrapper

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
  message?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || data.message || 'An error occurred',
      response.status
    );
  }

  return data.data as T;
}

// Auth API
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'CREATOR' | 'ADMIN';
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  register: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    return fetcher<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return fetcher<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async (): Promise<void> => {
    await fetcher('/auth/logout', { method: 'POST' });
  },

  getMe: async (): Promise<{ user: User }> => {
    return fetcher<{ user: User }>('/auth/me');
  },

  refresh: async (): Promise<{ token: string }> => {
    return fetcher<{ token: string }>('/auth/refresh', { method: 'POST' });
  },
};

// Content API
export interface Content {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC' | 'PAID';
  coverImageUrl?: string;
  processingProgress: number;
  createdAt: string;
  _count?: { learningSessions: number };
}

export interface ContentDetail extends Content {
  sections: Array<{
    id: string;
    title: string;
    contentText: string;
    sectionOrder: number;
  }>;
  learningMaps: Array<{
    id: string;
    totalConcepts: number;
    concepts: Array<{
      id: string;
      title: string;
      description?: string;
      conceptOrder: number;
    }>;
  }>;
  user: {
    id: string;
    name: string | null;
    avatarUrl?: string | null;
  };
}

export const contentApi = {
  list: async (): Promise<{ contents: Content[] }> => {
    return fetcher<{ contents: Content[] }>('/content');
  },

  get: async (id: string): Promise<{ content: ContentDetail }> => {
    return fetcher<{ content: ContentDetail }>(`/content/${id}`);
  },

  upload: async (
    file: File,
    title: string,
    description?: string,
    visibility: string = 'PRIVATE'
  ): Promise<{ content: { id: string; title: string; status: string }; message: string }> => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('visibility', visibility);

    const response = await fetch(`${API_BASE_URL}/content/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new ApiError(data.error?.message || 'Upload failed', response.status);
    }

    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await fetcher(`/content/${id}`, { method: 'DELETE' });
  },

  reprocess: async (id: string): Promise<void> => {
    await fetcher(`/content/${id}/process`, { method: 'POST' });
  },
};

export { ApiError };
