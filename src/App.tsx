import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { AISettings } from './components/AIPreferences';
import { StoryPreferences } from './components/StoryPreferences';
import { PromptsView } from './components/PromptsView';
import { AgentSettingsView } from './components/AgentSettingsView';
import { CallHistory } from './components/CallHistory';
import { Toaster } from 'react-hot-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Admin } from './types/admin';
import { Sidebar } from './components/Sidebar';

function App() {
  const [user, loading] = useAuthState(auth);
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsCheckingAdmin(false);
        return;
      }

      setIsCheckingAdmin(true);
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          const data = adminDoc.data() as Admin;
          setAdminData(data);
        } else {
          // If not an admin, sign them out
          await auth.signOut();
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (loading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user || !adminData) {
    return (
      <>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/signin" element={<AuthForm />} />
            <Route path="/signup" element={<AuthForm isSignUp />} />
            <Route path="*" element={<Navigate to="/signin" />} />
          </Routes>
        </Router>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar 
            adminName={adminData.name}
            email={adminData.email}
          />
          <main className="flex-1 ml-64">
            <Routes>
              <Route path="/ai-preferences" element={<AISettings />} />
              <Route path="/story-preferences" element={<StoryPreferences />} />
              <Route path="/prompts" element={<PromptsView />} />
              <Route path="/prompts/:id" element={<AgentSettingsView />} />
              <Route path="/call-history" element={<CallHistory />} />
              <Route path="/" element={<Navigate to="/ai-preferences" />} />
              <Route path="*" element={<Navigate to="/ai-preferences" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
}

export default App;