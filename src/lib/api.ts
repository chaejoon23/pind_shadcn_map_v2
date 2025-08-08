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

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
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
}

export const apiClient = new ApiClient();