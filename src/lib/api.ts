const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface LocationData {
  id: string;
  name: string;
  address: string;
  category: string;
  description: string;
  coordinates: { lat: number; lng: number };
  videoId: string;
}

export interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  locations: LocationData[];
}

export interface ApiPlace {
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface ApiResponse {
  mode: 'db' | 'new';
  places: ApiPlace[];
}

export interface URLRequest {
  url: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getAuthToken(): string | null {
    return sessionStorage.getItem('jwt_token');
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('API 요청:', url, options);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    console.log('fetch 호출 시작...')
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    console.log('응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API 오류 응답:', response.status, errorData)
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async processYouTubeURL(url: string, withAuth = false): Promise<ApiResponse> {
    const endpoint = withAuth 
      ? '/api/v1/youtube/process'
      : '/api/v1/youtube/without-login/process';
    
    return this.makeRequest<ApiResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getUserHistory(): Promise<string[]> {
    return this.makeRequest<string[]>('/api/v1/youtube/history');
  }

  async getPlacesForVideo(videoId: string): Promise<ApiPlace[]> {
    return this.makeRequest<ApiPlace[]>(`/api/v1/youtube/places/${videoId}`);
  }

  // API 응답을 앱에서 사용하는 형식으로 변환
  convertApiPlacesToLocations(places: ApiPlace[], videoId: string): LocationData[] {
    console.log('변환할 places 데이터:', places)
    return places.map((place, index) => {
      console.log(`Place ${index}:`, place)
      return {
        id: `place-${index}`,
        name: place.name || 'Unknown Place',
        address: '', // 서버에서 주소 정보를 제공하지 않음
        category: 'Place', // 기본 카테고리
        description: '', // 서버에서 설명을 제공하지 않음
        coordinates: {
          lat: place.lat || 0,
          lng: place.lng || 0
        },
        videoId: videoId
      }
    });
  }

  // YouTube URL에서 비디오 ID 추출
  extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // JWT 인증 관련 함수들
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return response.json();
  }

  async signup(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '회원가입 중 오류가 발생했습니다.');
    }
  }

  // JWT 토큰 저장 및 관리
  saveAuthToken(token: string, tokenType: string = 'Bearer', userEmail: string = ''): void {
    sessionStorage.setItem('jwt_token', token);
    sessionStorage.setItem('token_type', tokenType);
    if (userEmail) {
      sessionStorage.setItem('user_email', userEmail);
    }
  }

  clearAuthToken(): void {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('user_email');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  getUserEmail(): string | null {
    return sessionStorage.getItem('user_email');
  }

  // YouTube oEmbed API를 사용하여 비디오 정보 가져오기 (API 키 불필요)
  async getYouTubeVideoInfo(videoId: string): Promise<{title: string; thumbnail: string} | null> {
    try {
      console.log('YouTube oEmbed API 호출 시작 - videoId:', videoId);
      
      // YouTube oEmbed API 사용 (API 키 불필요)
      const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      console.log('YouTube oEmbed URL:', url);
      
      const response = await fetch(url);
      console.log('YouTube oEmbed 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube oEmbed 오류 응답:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('YouTube oEmbed 응답 데이터:', data);
      
      if (data.title) {
        console.log('비디오 정보 추출 성공:', data.title);
        return {
          title: data.title,
          thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
      }
      
      console.warn('YouTube oEmbed 응답에 제목이 없습니다.');
      return null;
    } catch (error) {
      console.error('YouTube oEmbed API 호출 중 오류:', error);
      
      // oEmbed 실패 시 YouTube Data API 시도
      return this.getYouTubeVideoInfoWithDataAPI(videoId);
    }
  }

  // 백업용 YouTube Data API (Google API 키 필요)
  private async getYouTubeVideoInfoWithDataAPI(videoId: string): Promise<{title: string; thumbnail: string} | null> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      console.log('YouTube Data API 백업 호출 - API 키 존재:', !!apiKey);
      
      if (!apiKey) {
        console.warn('Google API 키가 없어서 기본 제목을 사용합니다.');
        return null;
      }

      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube Data API 오류:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        return {
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
      }
      
      return null;
    } catch (error) {
      console.error('YouTube Data API 백업 호출 중 오류:', error);
      return null;
    }
  }
}

export const apiClient = new ApiClient();