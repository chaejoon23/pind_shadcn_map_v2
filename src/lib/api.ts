const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://192.168.18.124:9000';

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

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
}

export interface PlacesWithVideoResponse {
  video: VideoInfo;
  places: ApiPlace[];
}

export interface ApiResponse {
  mode: 'db' | 'new';
  places: ApiPlace[];
}

export interface JobResponse {
  job_id: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: string;
  progress: number;
  current_step: string;
}

export interface JobResultResponse {
  job_id: string;
  status: string;
  places: ApiPlace[];
  processing_time?: number;
  error_message?: string;
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
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async processYouTubeURL(url: string, withAuth = false): Promise<ApiResponse> {
    
    // Step 1: Submit job
    const jobResponse = await this.makeRequest<JobResponse>('/api/v1/youtube/process', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    // Step 2: Poll for completion
    return this.pollForJobCompletion(jobResponse.job_id);
  }

  private async pollForJobCompletion(jobId: string): Promise<ApiResponse> {
    const maxAttempts = 60; // 60초 최대 대기
    const pollInterval = 1000; // 1초마다 체크

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await this.makeRequest<JobStatusResponse>(`/api/v1/jobs/${jobId}/status`);
        
        if (statusResponse.status === 'SUCCESS') {
          const resultResponse = await this.makeRequest<JobResultResponse>(`/api/v1/jobs/${jobId}/result`);
          return {
            mode: 'new',
            places: resultResponse.places || []
          };
        } else if (statusResponse.status === 'FAILURE') {
          throw new Error(`작업 처리 실패: ${statusResponse.current_step || '알 수 없는 오류'}`);
        }

        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw new Error(`작업 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Continue to next attempt for non-final attempts
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('작업 처리 시간이 초과되었습니다.');
  }

  async getUserHistory(): Promise<VideoData[]> {
    const historyData = await this.makeRequest<any[]>('/api/v1/users/history');
    
    // 백엔드 응답을 VideoData 형태로 변환
    return historyData.map((item) => {
      // title이 없거나 빈 문자열인 경우 기본값 사용
      const title = item.title && item.title.trim() 
        ? item.title 
        : `YouTube Video - ${item.id}`;
      
      return {
        id: item.id,
        title: title,
        thumbnail: item.thumbnail_url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
        date: new Date(item.created_at).toISOString().split('T')[0],
        locations: (item.places || []).map((place: any, index: number) => ({
          id: `place-${index}`,
          name: place.name || 'Unknown Place',
          address: '',
          category: '',
          description: '',
          coordinates: {
            lat: place.lat || 0,
            lng: place.lng || 0
          },
          videoId: item.id
        }))
      };
    });
  }


  async getPlacesForVideo(videoId: string): Promise<PlacesWithVideoResponse> {
    return this.makeRequest<PlacesWithVideoResponse>(`/api/v1/youtube/places/${videoId}`);
  }


  // API 응답을 앱에서 사용하는 형식으로 변환
  convertApiPlacesToLocations(places: ApiPlace[], videoId: string): LocationData[] {
    return places.map((place, index) => {
      return {
        id: `place-${index}`,
        name: place.name || 'Unknown Place',
        address: '',
        category: '',
        description: '',
        coordinates: {
          lat: place.lat || 0,
          lng: place.lng || 0
        },
        videoId: videoId
      }
    });
  }

  async getVideoFromDB(videoId: string): Promise<{id: string; title: string; thumbnail: string} | null> {
    try {
      return this.makeRequest<{id: string; title: string; thumbnail: string}>(`/api/v1/youtube/video/${videoId}`);
    } catch (error) {
      return null;
    }
  }

  convertPlacesResponseToVideoData(response: PlacesWithVideoResponse): VideoData {
    return {
      id: response.video.id,
      title: response.video.title,
      thumbnail: response.video.thumbnail,
      date: new Date().toISOString(),
      locations: this.convertApiPlacesToLocations(response.places, response.video.id)
    };
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

}

export const apiClient = new ApiClient();