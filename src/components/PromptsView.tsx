import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AgentSkeleton } from '../types/agent';
import { Category } from '../types/category';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export const PromptsView: React.FC = () => {
  const [agentSkeletons, setAgentSkeletons] = useState<AgentSkeleton[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch agent skeletons
        const skeletonsSnapshot = await getDocs(collection(db, 'agent_skeletons'));
        const skeletonsData = skeletonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AgentSkeleton[];

        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];

        setAgentSkeletons(skeletonsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load prompts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCategoryDetails = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return {
      title: category?.title || 'Unknown Category',
      description: category?.description || '',
      emoji_unicode: category?.emoji_unicode || ''
    };
  };

  const decodeEmoji = (unicode: string) => {
    try {
      const codePoints = unicode
        .replace(/\\u/g, '')
        .split(/[\s,{}]+/)
        .filter(Boolean)
        .map(code => parseInt(code, 16));
      return String.fromCodePoint(...codePoints);
    } catch (error) {
      console.error('Error decoding emoji:', error);
      return '📝';
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Categories</h1>
          <p className="text-gray-600 mt-1">
            Configure AI behavior and prompts for different conversation categories
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentSkeletons.map((skeleton) => {
            const category = getCategoryDetails(skeleton.category_id);
            return (
              <button
                key={skeleton.id}
                onClick={() => navigate(`/prompts/${skeleton.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-orange-500 transition-colors group"
              >
                <div className="text-4xl mb-4">{decodeEmoji(category.emoji_unicode)}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Configure agent settings
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};