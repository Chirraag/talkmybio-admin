import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Check } from 'lucide-react';
import { collection, getDocs, writeBatch, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Retell from 'retell-sdk';
import toast from 'react-hot-toast';

interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  accent: string;
  gender: string;
  age: string;
  preview_audio_url: string;
}

const DEFAULT_VOICE: Voice = {
  voice_id: "play-Cimo",
  voice_name: "Cimo",
  provider: "play",
  accent: "American",
  gender: "female",
  age: "Middle Aged",
  preview_audio_url: "https://retell-utils-public.s3.us-west-2.amazonaws.com/play-Cimo.mp3"
};

export const AISettings: React.FC = () => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [conversationStyle, setConversationStyle] = useState<'casual' | 'balanced' | 'reflective' | null>(null);
  const [followUpIntensity, setFollowUpIntensity] = useState<'fewer' | 'balanced' | 'more' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      try {
        // Initialize Retell client
        const client = new Retell({ apiKey: import.meta.env.VITE_RETELL_API_KEY });
        
        // Fetch admin preferences
        const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          if (adminData.aiPreferences) {
            setSelectedVoice(adminData.aiPreferences.voice);
            setConversationStyle(adminData.aiPreferences.conversationStyle);
            setFollowUpIntensity(adminData.aiPreferences.followUpIntensity);
          } else {
            setSelectedVoice(DEFAULT_VOICE);
            setConversationStyle('balanced');
            setFollowUpIntensity('balanced');
          }
        }

        // Fetch available voices
        const voiceResponses = await client.voice.list();
        setVoices(voiceResponses);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load preferences');
        setSelectedVoice(DEFAULT_VOICE);
        setConversationStyle('balanced');
        setFollowUpIntensity('balanced');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [selectedVoice]);

  const handlePlaySample = () => {
    if (!selectedVoice) return;

    audioRef.current = new Audio(selectedVoice.preview_audio_url);
    audioRef.current.onended = () => setIsPlaying(false);

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio sample');
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  // Modified updateRetellAgents: a new Retell client is instantiated during each update so that
  // each agent receives an independent update call.
  const updateRetellAgents = async (usersSnapshot: any) => {
    const client = new Retell({ apiKey: import.meta.env.VITE_RETELL_API_KEY });
    const failedUpdates: string[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.agentIds && Array.isArray(userData.agentIds)) {
        const updatePromises = userData.agentIds.map(async (agentId: string) => {
          try {
            // Directly update the agent's voice using the current selectedVoice
            await client.agent.update(agentId, { voice_id: selectedVoice.voice_id });
          } catch (error) {
            console.error(`Error updating agent ${agentId}:`, error);
            failedUpdates.push(agentId);
          }
        });
        await Promise.allSettled(updatePromises);
      }
    }

    if (failedUpdates.length > 0) {
      console.error(`Failed to update some agents: ${failedUpdates.join(', ')}`);
    }
  };

  const handleSaveChanges = async () => {
    if (!auth.currentUser || !selectedVoice || !conversationStyle || !followUpIntensity) return;

    setIsSaving(true);
    try {
      // Update admin preferences
      await updateDoc(doc(db, 'admins', auth.currentUser.uid), {
        aiPreferences: {
          voice: selectedVoice,
          followUpIntensity,
          conversationStyle
        },
        updatedAt: serverTimestamp()
      });

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));

      // Update each user's agents via the Retell API
      try {
        await updateRetellAgents(usersSnapshot);
      } catch (error: any) {
        console.error('Error updating Retell agents:', error);
        toast.error(error.message);
        // Continue with Firestore updates even if some Retell updates fail
      }

      // Batch update Firestore for all users
      const batch = writeBatch(db);
      usersSnapshot.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          'aiPreferences.voice': selectedVoice,
          'aiPreferences.followUpIntensity': followUpIntensity,
          'aiPreferences.conversationStyle': conversationStyle,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast.success('Updated AI preferences successfully');
    } catch (error) {
      console.error('Error updating AI preferences:', error);
      toast.error('Failed to update some preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !selectedVoice || !conversationStyle || !followUpIntensity) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Conversation Preferences</h2>
          <p className="text-gray-600 mb-6">
            Customize how StoryMindAI interacts with users across the application.
          </p>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-8">
              {/* Conversation Style */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Style</h3>
                <div className="grid grid-cols-3 gap-4">
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="conversationStyle"
                      value="casual"
                      checked={conversationStyle === 'casual'}
                      onChange={(e) => setConversationStyle(e.target.value as 'casual' | 'balanced' | 'reflective')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      conversationStyle === 'casual' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Casual</div>
                    <div className="text-sm text-gray-600">Friendly, conversational tone with simple language</div>
                  </label>
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="conversationStyle"
                      value="balanced"
                      checked={conversationStyle === 'balanced'}
                      onChange={(e) => setConversationStyle(e.target.value as 'casual' | 'balanced' | 'reflective')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      conversationStyle === 'balanced' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Balanced</div>
                    <div className="text-sm text-gray-600">Natural mix of conversational and thoughtful questions</div>
                  </label>
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="conversationStyle"
                      value="reflective"
                      checked={conversationStyle === 'reflective'}
                      onChange={(e) => setConversationStyle(e.target.value as 'casual' | 'balanced' | 'reflective')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      conversationStyle === 'reflective' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Reflective</div>
                    <div className="text-sm text-gray-600">Deeper, more philosophical approach to conversations</div>
                  </label>
                </div>
              </div>

              {/* AI Voice */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Voice</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative w-64" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      disabled={isLoading}
                    >
                      {selectedVoice.voice_name} ({selectedVoice.gender})
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {voices.map((voice) => (
                          <button
                            key={voice.voice_id}
                            onClick={() => {
                              setSelectedVoice(voice);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                              selectedVoice.voice_id === voice.voice_id ? 'bg-orange-50 text-orange-600' : ''
                            }`}
                          >
                            {voice.voice_name} ({voice.gender})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handlePlaySample}
                    className="flex items-center px-4 py-2 text-orange-600 hover:text-orange-700 transition-colors"
                    disabled={isLoading}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isPlaying ? 'Stop Sample' : 'Play Sample'}
                  </button>
                </div>
              </div>

              {/* Follow-up Questions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Follow-up Questions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="followUpIntensity"
                      value="fewer"
                      checked={followUpIntensity === 'fewer'}
                      onChange={(e) => setFollowUpIntensity(e.target.value as 'fewer' | 'balanced' | 'more')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      followUpIntensity === 'fewer' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Fewer Questions</div>
                    <div className="text-sm text-gray-600">Minimal follow-up questions for a concise conversation</div>
                  </label>
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="followUpIntensity"
                      value="balanced"
                      checked={followUpIntensity === 'balanced'}
                      onChange={(e) => setFollowUpIntensity(e.target.value as 'fewer' | 'balanced' | 'more')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      followUpIntensity === 'balanced' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Balanced</div>
                    <div className="text-sm text-gray-600">Natural flow of follow-up questions</div>
                  </label>
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="followUpIntensity"
                      value="more"
                      checked={followUpIntensity === 'more'}
                      onChange={(e) => setFollowUpIntensity(e.target.value as 'fewer' | 'balanced' | 'more')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      followUpIntensity === 'more' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">More Questions</div>
                    <div className="text-sm text-gray-600">Detailed exploration with more follow-up questions</div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveChanges}
                disabled={isSaving || isLoading}
                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes for All Users
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};