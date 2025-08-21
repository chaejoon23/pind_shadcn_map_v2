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
  video_title?: string;
  video_thumbnail?: string;
}

export interface PlaceResponse {
  mode: 'db' | 'new';
  places: ApiPlace[];
}


export interface UserHistoryItem {
  id: string;
  title?: string;
  thumbnail_url?: string;
  created_at: string;
  places?: Array<{
    name?: string;
    lat?: number;
    lng?: number;
  }>;
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

  async processYouTubeURL(
    url: string
  ): Promise<ApiResponse> {
    
    console.log('Submitting YouTube URL for processing:', url);
    
    // 서버에서 직접 결과를 반환하므로 동기 처리
    const response = await this.makeRequest<PlaceResponse>('/api/v1/youtube/process', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    
    console.log('URL processing completed:', response);
    
    // 비디오 ID 추출하여 썸네일 생성
    const videoId = this.extractVideoId(url);
    
    return {
      mode: response.mode,
      places: response.places,
      video_title: videoId ? `YouTube Video - ${videoId}` : 'YouTube Video',
      video_thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined
    };
  }


  async getUserHistory(): Promise<VideoData[]> {
    const historyData = await this.makeRequest<UserHistoryItem[]>('/api/v1/users/history');
    
    console.log('Received history data:', historyData.length, 'videos');
    
    // Convert backend response to VideoData format
    const convertedData = historyData.map((item) => {
      // Use default value if title is missing or empty
      const title = item.title && item.title.trim() 
        ? item.title 
        : `YouTube Video - ${item.id}`;
      
      // 유효한 좌표를 가진 위치만 포함
      const validLocations = (item.places || []).filter(place => 
        this.isValidCoordinates(place.lat || null, place.lng || null)
      ).map((place, index: number) => ({
        id: `place-${index}`,
        name: place.name || 'Unknown Place',
        address: '',
        category: '',
        description: '',
        coordinates: {
          lat: place.lat!,  // 위에서 검증했으므로 null이 아님
          lng: place.lng!   // 위에서 검증했으므로 null이 아님
        },
        videoId: item.id
      }));
      
      console.log(`Video ${item.id}: ${(item.places || []).length} total places, ${validLocations.length} valid places`);
      
      return {
        id: item.id,
        title: title,
        thumbnail: item.thumbnail_url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
        date: new Date(item.created_at).toISOString().split('T')[0],
        locations: validLocations
      };
    });
    
    // Filter out videos with 0 valid locations
    const videosWithLocations = convertedData.filter(video => video.locations.length > 0);
    console.log('Videos with valid locations:', videosWithLocations.length);
    
    return videosWithLocations;
  }


  async getPlacesForVideo(videoId: string): Promise<PlacesWithVideoResponse> {
    return this.makeRequest<PlacesWithVideoResponse>(`/api/v1/youtube/places/${videoId}`);
  }


  // 좌표 유효성 검증 함수
  isValidCoordinates(lat: number | null, lng: number | null): boolean {
    return lat !== null && lng !== null && 
           lat !== 0 && lng !== 0 && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }

  // Convert API response to app format - 유효한 좌표를 가진 위치만 포함
  convertApiPlacesToLocations(places: ApiPlace[], videoId: string): LocationData[] {
    console.log('Converting places:', places.length, 'total places received');
    
    const validPlaces = places.filter(place => {
      const isValid = this.isValidCoordinates(place.lat, place.lng);
      if (!isValid) {
        console.log('Invalid coordinates found:', place.name, 'lat:', place.lat, 'lng:', place.lng);
      }
      return isValid;
    });
    
    console.log('Valid places after filtering:', validPlaces.length);
    
    return validPlaces.map((place, index) => {
      return {
        id: `place-${index}`,
        name: place.name || 'Unknown Place',
        address: '',
        category: '',
        description: '',
        coordinates: {
          lat: place.lat!,  // null이 아님을 확신할 수 있음 (위에서 필터링했으므로)
          lng: place.lng!   // null이 아님을 확신할 수 있음 (위에서 필터링했으므로)
        },
        videoId: videoId
      }
    });
  }

  async getVideoFromDB(videoId: string): Promise<{id: string; title: string; thumbnail: string} | null> {
    try {
      return this.makeRequest<{id: string; title: string; thumbnail: string}>(`/api/v1/youtube/video/${videoId}`);
    } catch {
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

  // Extract video ID from YouTube URL
  extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // JWT authentication related functions
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid email or password.');
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
      throw new Error(errorData.message || 'An error occurred during signup.');
    }
  }

  // JWT token storage and management
  saveAuthToken(token: string, tokenType: string = 'Bearer', userEmail: string = ''): void {
    sessionStorage.setItem('jwt_token', token);
    sessionStorage.setItem('token_type', tokenType);
    if (userEmail) {
      sessionStorage.setItem('user_email', userEmail);
    }
  }

  setAuthToken(token: string, tokenType: string = 'Bearer'): Promise<void> {
    return new Promise((resolve) => {
      console.log('API 클라이언트: 토큰 저장 중', { tokenLength: token.length, tokenType });
      sessionStorage.setItem('jwt_token', token);
      sessionStorage.setItem('token_type', tokenType);
      console.log('API 클라이언트: 토큰 저장 완료');
      console.log('API 클라이언트: 인증 상태 확인', this.isAuthenticated());
      resolve();
    });
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