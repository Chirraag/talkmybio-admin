import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, Bot, Book, History, LogOut, MessageSquare } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';

interface SidebarProps {
  adminName: string;
  email: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ adminName, email }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white font-semibold">{adminName[0]?.toUpperCase() || '?'}</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{adminName}</h2>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        <nav className="space-y-1">
          <NavLink
            to="/ai-preferences"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Bot className="w-5 h-5" />
            <span>AI Preferences</span>
          </NavLink>

          <NavLink
            to="/story-preferences"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Book className="w-5 h-5" />
            <span>Story Preferences</span>
          </NavLink>

          <NavLink
            to="/prompts"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <MessageSquare className="w-5 h-5" />
            <span>Prompts</span>
          </NavLink>

          <NavLink
            to="/call-history"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <History className="w-5 h-5" />
            <span>Call History</span>
          </NavLink>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};