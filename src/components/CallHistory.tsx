import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, collectionGroup, getDoc, doc as firebaseDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConversationDialog } from './ConversationDialog';

interface CallEntry {
  id: string;
  callId: string;
  category: string;
  creationTime: Date;
  initialQuestion: string;
  lastUpdated: Date;
  recording_url: string;
  sessionId: string;
  storyId: string;
  transcript: string;
  transcript_object: Array<{
    content: string;
    role: string;
    metadata?: {
      response_id: number;
    };
    words: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
  updated: boolean;
  videoComplete: boolean;
  videoUrl: string;
  userEmail: string;
}

const CALLS_PER_PAGE = 20;

export const CallHistory: React.FC = () => {
  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallEntry | null>(null);
  const [isConversationOpen, setIsConversationOpen] = useState(false);

    const fetchCalls = async (isInitial = true) => {
      try {
        if (isInitial) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        // 1) Fetch every call document
        const snapshot = await getDocs(collectionGroup(db, 'call_history'));

        // 2) Build full array with userEmail look-up
        const callsData = await Promise.all(
          snapshot.docs.map(async docSnap => {
            const data = docSnap.data();

            // fetch the user’s email from the parent “users” doc
            const userId = docSnap.ref.parent.parent?.id;
            let userEmail = 'Unknown';
            if (userId) {
              try {
                const userDoc = await getDoc(firebaseDoc(db, 'users', userId));
                if (userDoc.exists()) {
                  userEmail = userDoc.data().email || 'Unknown';
                }
              } catch (err) {
                console.error('Error fetching user email:', err);
              }
            }

            // fallback to docSnap.id if data.callId is missing
            const callId = data.callId || docSnap.id;

            return {
              id: docSnap.id,
              callId,
              category: data.category,
              creationTime: data.creationTime.toDate(),
              initialQuestion: data.initialQuestion,
              lastUpdated: data.lastUpdated.toDate(),
              recording_url: data.recording_url,
              sessionId: data.sessionId,
              storyId: data.storyId,
              transcript: data.transcript,
              transcript_object: data.transcript_object || [],
              updated: data.updated,
              videoComplete: data.videoComplete,
              videoUrl: data.videoUrl,
              userEmail,
            } as CallEntry;
          })
        );

        // 3) Sort all calls by newest first
        const sortedCallsData = callsData.sort(
          (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
        );

        // 4) Client-side pagination: take first N on initial load, then first (prev + N) on “load more”
        const total = sortedCallsData.length;
        const count = isInitial ? CALLS_PER_PAGE : calls.length + CALLS_PER_PAGE;
        const paginated = sortedCallsData.slice(0, count);

        // 5) Update state (always in perfect descending order) and flag if more remain
        setCalls(paginated);
        setHasMore(count < total);

        // keep lastVisible for compatibility (not used in this client-side approach)
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      } catch (error) {
        console.error('Error fetching calls:', error);
        toast.error('Failed to load call history');
      } finally {
        if (isInitial) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchCalls(false);
    }
  };

  const handleViewConversation = (call: CallEntry) => {
    setSelectedCall(call);
    setIsConversationOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">All Call History</h1>
            <p className="text-gray-600 mt-1">
              View all user conversations across the platform
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Call List */}
            <div className="divide-y divide-gray-200">
              {calls.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No calls found</p>
                </div>
              ) : (
                calls.map(call => (
                  <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                            {call.category}
                          </span>
                          <span className="text-sm text-gray-500">
                            {call.userEmail}
                          </span>
                          <span className="text-sm text-gray-500">
                            Call ID: {call.callId}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{call.initialQuestion}</p>

                        <div className="text-sm text-gray-500">
                          {format(call.creationTime, 'PPpp')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={() => handleViewConversation(call)}
                          className="flex items-center px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View Conversation
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCall && (
        <ConversationDialog
          isOpen={isConversationOpen}
          onClose={() => {
            setIsConversationOpen(false);
            setSelectedCall(null);
          }}
          transcript={selectedCall.transcript_object}
          title={selectedCall.initialQuestion}
          videoUrl={selectedCall.videoUrl}
          audioUrl={selectedCall.recording_url}
        />
      )}
    </>
  );
};

