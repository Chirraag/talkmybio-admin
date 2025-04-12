import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { collection, getDocs, writeBatch, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import toast from 'react-hot-toast';

export const StoryPreferences: React.FC = () => {
  const [narrativeStyle, setNarrativeStyle] = useState<'first-person' | 'third-person'>('first-person');
  const [lengthPreference, setLengthPreference] = useState<'shorter' | 'balanced' | 'longer'>('balanced');
  const [detailRichness, setDetailRichness] = useState<'fewer' | 'balanced' | 'more'>('balanced');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!auth.currentUser) return;

      try {
        const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          if (adminData.storyPreferences) {
            setNarrativeStyle(adminData.storyPreferences.narrativeStyle);
            setLengthPreference(adminData.storyPreferences.lengthPreference);
            setDetailRichness(adminData.storyPreferences.detailRichness);
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleSaveChanges = async () => {
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      // Update admin preferences
      await updateDoc(doc(db, 'admins', auth.currentUser.uid), {
        storyPreferences: {
          narrativeStyle,
          lengthPreference,
          detailRichness
        },
        updatedAt: serverTimestamp()
      });

      // Update all users' preferences
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);

      usersSnapshot.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          'storyPreferences.narrativeStyle': narrativeStyle,
          'storyPreferences.lengthPreference': lengthPreference,
          'storyPreferences.detailRichness': detailRichness,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast.success('Updated story preferences for all users successfully');
    } catch (error) {
      console.error('Error updating story preferences:', error);
      toast.error('Failed to update story preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Story Generation Preferences</h2>
          <p className="text-gray-600 mb-6">
            Configure how stories are generated for all users across the platform
          </p>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-8">
              {/* Narrative Style */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Narrative Style</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="narrativeStyle"
                      value="first-person"
                      checked={narrativeStyle === 'first-person'}
                      onChange={(e) => setNarrativeStyle(e.target.value as 'first-person' | 'third-person')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      narrativeStyle === 'first-person' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">First Person</div>
                    <div className="text-sm text-gray-600">
                      Stories written from your perspective ("I remember...")
                    </div>
                  </label>

                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="narrativeStyle"
                      value="third-person"
                      checked={narrativeStyle === 'third-person'}
                      onChange={(e) => setNarrativeStyle(e.target.value as 'first-person' | 'third-person')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      narrativeStyle === 'third-person' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Third Person</div>
                    <div className="text-sm text-gray-600">
                      Stories written from an observer's perspective ("John remembers...")
                    </div>
                  </label>
                </div>
              </div>

              {/* Story Length */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Story Length</h3>
                <div className="grid grid-cols-3 gap-4">
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="lengthPreference"
                      value="shorter"
                      checked={lengthPreference === 'shorter'}
                      onChange={(e) => setLengthPreference(e.target.value as 'shorter' | 'balanced' | 'longer')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      lengthPreference === 'shorter' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Shorter</div>
                    <div className="text-sm text-gray-600">
                      Concise, focused stories
                    </div>
                  </label>

                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="lengthPreference"
                      value="balanced"
                      checked={lengthPreference === 'balanced'}
                      onChange={(e) => setLengthPreference(e.target.value as 'shorter' | 'balanced' | 'longer')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      lengthPreference === 'balanced' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Balanced</div>
                    <div className="text-sm text-gray-600">
                      Moderate length with key details
                    </div>
                  </label>

                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="lengthPreference"
                      value="longer"
                      checked={lengthPreference === 'longer'}
                      onChange={(e) => setLengthPreference(e.target.value as 'shorter' | 'balanced' | 'longer')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      lengthPreference === 'longer' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Longer</div>
                    <div className="text-sm text-gray-600">
                      Comprehensive, detailed stories
                    </div>
                  </label>
                </div>
              </div>

              {/* Detail Level */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Detail Level</h3>
                <div className="grid grid-cols-3 gap-4">
                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="detailRichness"
                      value="fewer"
                      checked={detailRichness === 'fewer'}
                      onChange={(e) => setDetailRichness(e.target.value as 'fewer' | 'balanced' | 'more')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      detailRichness === 'fewer' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Fewer Details</div>
                    <div className="text-sm text-gray-600">
                      Focus on key events
                    </div>
                  </label>

                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="detailRichness"
                      value="balanced"
                      checked={detailRichness === 'balanced'}
                      onChange={(e) => setDetailRichness(e.target.value as 'fewer' | 'balanced' | 'more')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      detailRichness === 'balanced' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">Balanced</div>
                    <div className="text-sm text-gray-600">
                      Mix of events and details
                    </div>
                  </label>

                  <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="radio"
                      name="detailRichness"
                      value="more"
                      checked={detailRichness === 'more'}
                      onChange={(e) => setDetailRichness(e.target.value as 'fewer' | 'balanced' | 'more')}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                      detailRichness === 'more' ? 'border-orange-500' : 'border-transparent'
                    }`} />
                    <div className="font-medium mb-1">More Details</div>
                    <div className="text-sm text-gray-600">
                      Rich, descriptive narratives
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
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