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
  video_title?: string;
  video_thumbnail?: string;
  processing_time?: number;
  error_message?: string;
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
    url: string, 
    onProgressUpdate?: (progress: number, currentStep: string) => void
  ): Promise<ApiResponse> {
    
    // Step 1: Submit job
    console.log('Submitting YouTube URL for processing:', url);
    const jobResponse = await this.makeRequest<JobResponse>('/api/v1/youtube/process', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    console.log('Job submitted successfully, job_id:', jobResponse.job_id);

    // Step 2: Check if it's a cached result or needs polling
    if (jobResponse.job_id.startsWith('cached_')) {
      // Handle cached results directly
      console.log('Handling cached result for job:', jobResponse.job_id);
      return this.handleCachedResult(jobResponse.job_id);
    } else {
      // Poll for completion for new jobs
      return this.pollForJobCompletion(jobResponse.job_id, onProgressUpdate);
    }
  }

  private async handleCachedResult(jobId: string): Promise<ApiResponse> {
    // Extract video ID from cached job ID (cached_videoId format)
    const videoId = jobId.replace('cached_', '');
    console.log('Fetching cached result for video:', videoId);
    
    try {
      // Server returns List[Place] directly, not PlacesWithVideoResponse
      console.log('Attempting to fetch cached data from:', `/api/v1/youtube/places/${videoId}`);
      const places = await this.makeRequest<ApiPlace[]>(`/api/v1/youtube/places/${videoId}`);
      
      console.log('Cached places received:', {
        placesCount: places?.length || 0,
        places: places
      });
      
      return {
        mode: 'db',
        places: places || [],
        video_title: `YouTube Video - ${videoId}`,
        video_thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      };
    } catch (error) {
      console.error('Failed to fetch cached result:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // "장소 정보가 없습니다" 오류는 정상 상황 (0개 위치)
      if (errorMessage.includes('장소 정보가 없습니다') || errorMessage.includes('not found')) {
        console.log('Video exists in DB but has no places - returning empty result');
        return {
          mode: 'db',
          places: [],
          video_title: `YouTube Video - ${videoId}`,
          video_thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
      }
      
      // 다른 오류의 경우 fallback 시도
      try {
        const resultResponse = await this.makeRequest<JobResultResponse>(`/api/v1/jobs/${jobId}/result`);
        return {
          mode: 'db',
          places: resultResponse.places || [],
          video_title: resultResponse.video_title || `YouTube Video - ${videoId}`,
          video_thumbnail: resultResponse.video_thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
      } catch (fallbackError) {
        console.error('Fallback result fetch also failed:', fallbackError);
        
        // 최종적으로 빈 결과 반환 (오류 대신)
        console.log('Returning empty result for cached video');
        return {
          mode: 'db',
          places: [],
          video_title: `YouTube Video - ${videoId}`,
          video_thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
      }
    }
  }

  private async pollForJobCompletion(
    jobId: string, 
    onProgressUpdate?: (progress: number, currentStep: string) => void
  ): Promise<ApiResponse> {
    const pollInterval = 10000; // Check every 10 seconds
    let retryCount = 0;
    const maxRetries = 3;

    while (true) {
      try {
        console.log(`Polling job ${jobId}, retry count: ${retryCount}`);
        const statusResponse = await this.makeRequest<JobStatusResponse>(`/api/v1/jobs/${jobId}/status`);
        
        // Reset retry count on successful response
        retryCount = 0;
        
        // Update progress callback if provided
        if (onProgressUpdate) {
          onProgressUpdate(statusResponse.progress, statusResponse.current_step);
        }
        
        if (statusResponse.status === 'SUCCESS') {
          const resultResponse = await this.makeRequest<JobResultResponse>(`/api/v1/jobs/${jobId}/result`);
          console.log(`Job ${jobId} completed successfully, places:`, resultResponse.places?.length || 0);
          return {
            mode: 'new',
            places: resultResponse.places || [],
            video_title: resultResponse.video_title,
            video_thumbnail: resultResponse.video_thumbnail
          };
        } else if (statusResponse.status === 'FAILURE') {
          // Get detailed error from result endpoint
          try {
            const resultResponse = await this.makeRequest<JobResultResponse>(`/api/v1/jobs/${jobId}/result`);
            const errorMessage = resultResponse.error_message || statusResponse.current_step || 'Unknown error';
            console.error(`Job ${jobId} failed:`, errorMessage);
            
            // 특정 AI 모델 안전 필터 오류에 대한 사용자 친화적 메시지
            if (errorMessage.includes('finish_reason') && errorMessage.includes('2')) {
              throw new Error('Google AI 안전 필터로 인해 처리할 수 없습니다. 다른 비디오나 짧은 구간을 시도해보세요. (Safety filter triggered)');
            }
            if (errorMessage.includes('response.text') && errorMessage.includes('valid Part')) {
              throw new Error('AI 모델 응답 오류입니다. 서버 관리자에게 문의하거나 다른 비디오를 시도해보세요. (Empty AI response)');
            }
            if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
              throw new Error('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해보세요.');
            }
            
            throw new Error(`비디오 처리 실패: ${errorMessage}`);
          } catch (resultError) {
            console.error(`Job ${jobId} failed (result fetch error):`, resultError);
            throw new Error(`비디오 처리 중 오류가 발생했습니다. 다시 시도해보세요.`);
          }
        }

        // Still processing, wait and try again
        console.log(`Job ${jobId} still processing: ${statusResponse.current_step} (${statusResponse.progress}%)`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        // If it's a network error or API error, continue polling with retry limit
        if (error instanceof Error && error.message.includes('Job processing failed')) {
          throw error;
        }
        
        retryCount++;
        console.log(`Network error during polling (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error(`Max retries reached for job ${jobId}`);
          throw new Error(`Network error: Failed to poll job status after ${maxRetries} retries`);
        }
        
        // For network errors, wait a bit longer and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
      }
    }
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