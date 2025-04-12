export interface Admin {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  aiPreferences?: {
    voice: {
      voice_id: string;
      voice_name: string;
      provider: string;
      accent: string;
      gender: string;
      age: string;
      preview_audio_url: string;
    };
    followUpIntensity: 'fewer' | 'balanced' | 'more';
    conversationStyle: 'casual' | 'balanced' | 'reflective';
  };
  storyPreferences?: {
    narrativeStyle: 'first-person' | 'third-person';
    lengthPreference: 'shorter' | 'balanced' | 'longer';
    detailRichness: 'fewer' | 'balanced' | 'more';
  };
}