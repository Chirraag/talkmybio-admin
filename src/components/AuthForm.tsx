import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { LogIn, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";

interface AuthFormProps {
  isSignUp?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ isSignUp = false }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuthError = (error: AuthError | Error) => {
    console.error("Authentication error:", error);

    const errorMessages: Record<string, string> = {
      "auth/invalid-credential": "Invalid email or password. Please check your credentials and try again.",
      "auth/wrong-password": "Invalid email or password. Please check your credentials and try again.",
      "auth/user-not-found": "No admin account found with this email.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/network-request-failed": "Network error. Please check your connection.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/operation-not-allowed": "This sign-in method is not enabled.",
      "auth/email-already-in-use": "An admin account with this email already exists.",
      "auth/weak-password": "Password should be at least 6 characters long.",
    };

    const code = (error as AuthError).code;
    const message = errorMessages[code] || error.message;
    toast.error(message || "An error occurred during sign in. Please try again.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Create user account
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Create admin document
        await setDoc(doc(db, 'admins', user.uid), {
          name,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        navigate("/ai-preferences");
        toast.success("Admin account created successfully!");
      } else {
        // Sign in
        const { user } = await signInWithEmailAndPassword(auth, email, password);

        // Verify admin status
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          await auth.signOut();
          toast.error('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }

        navigate("/ai-preferences");
        toast.success("Signed in successfully!");
      }
    } catch (error) {
      handleAuthError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? "Create Admin Account" : "Admin Sign In"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              minLength={6}
            />
            <p className="mt-1 text-sm text-gray-500">
              Password must be at least 6 characters long
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              "Processing..."
            ) : isSignUp ? (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/signin"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  Need an admin account?{" "}
                  <Link
                    to="/signup"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};