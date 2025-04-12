import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AgentSkeleton } from '../types/agent';
import { Category } from '../types/category';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Retell from 'retell-sdk';

export const AgentSettingsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skeleton, setSkeleton] = useState<AgentSkeleton | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generalPrompt, setGeneralPrompt] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);

        // Fetch agent skeleton
        const skeletonDoc = await getDoc(doc(db, 'agent_skeletons', id));
        if (!skeletonDoc.exists()) {
          toast.error('Agent settings not found');
          navigate('/prompts');
          return;
        }

        const skeletonData = {
          id: skeletonDoc.id,
          ...skeletonDoc.data(),
        } as AgentSkeleton;
        setSkeleton(skeletonData);

        // Initialize form state
        setGeneralPrompt(skeletonData.llm_configurations.general_prompt);

        // Fetch category
        const categoryDoc = await getDoc(
          doc(db, 'categories', skeletonData.category_id)
        );
        if (categoryDoc.exists()) {
          setCategory({
            id: categoryDoc.id,
            ...categoryDoc.data(),
          } as Category);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load agent settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const updateRetellLLMs = async () => {
    if (!skeleton?.category_id) return;

    const client = new Retell({ apiKey: import.meta.env.VITE_RETELL_API_KEY });
    const failedUpdates: string[] = [];

    try {
      // Query agents collection for agents with matching category_id
      const agentsQuery = query(
        collection(db, 'agents'),
        where('categoryId', '==', skeleton.category_id)
      );

      const agentsSnapshot = await getDocs(agentsQuery);

      // Update each agent's LLM
      for (const agentDoc of agentsSnapshot.docs) {
        const agentData = agentDoc.data();
        if (agentData.llmId) {
          try {
            await client.llm.update(agentData.llmId, {
              general_prompt: generalPrompt,
            });
          } catch (error) {
            console.error(`Error updating LLM ${agentData.llmId}:`, error);
            failedUpdates.push(agentData.llmId);
          }
        }
      }

      if (failedUpdates.length > 0) {
        console.error(
          `Failed to update some LLMs: ${failedUpdates.join(', ')}`
        );
      }
    } catch (error) {
      console.error('Error updating Retell LLMs:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!id || !skeleton) return;

    setIsSaving(true);
    try {
      // Update the agent skeleton document
      await updateDoc(doc(db, 'agent_skeletons', id), {
        'llm_configurations.general_prompt': generalPrompt,
        updatedAt: serverTimestamp(),
      });

      // Update Retell LLMs
      try {
        await updateRetellLLMs();
        toast.success('Agent prompt and LLMs updated successfully');
      } catch (error) {
        console.error('Error updating Retell LLMs:', error);
        toast.error(
          'Failed to update some LLMs. Changes saved to Firebase only.'
        );
      }
    } catch (error) {
      console.error('Error updating agent prompt:', error);
      toast.error('Failed to update agent prompt');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !skeleton || !category) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/prompts')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-500" />
              </button>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {category.title} Prompt
                </h1>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
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
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Prompt
              </label>
              <textarea
                value={generalPrompt}
                onChange={(e) => setGeneralPrompt(e.target.value)}
                rows={35}
                className="w-full h-[calc(100vh-280px)] min-h-[600px] rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 font-mono text-sm resize-none"
                placeholder="Enter the prompt that defines how the AI agent behaves and responds..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
