import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, User, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface LoginScreenProps {
  onLogin: (username: string, role: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Use proper server authentication
      await login(username, password);
      // Login successful - onLogin will be called via useAuth context
      onLogin(username, 'teacher');
    } catch (err: any) {
      setError(err.message || 'Wrong username or password');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#005C83] via-[#0070a0] to-[#005C83]">
      {/* Header with logo */}
      <div className="pt-16 pb-8 text-center">
        <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
          <GraduationCap className="w-10 h-10 text-[#005C83]" />
        </div>
        <h1 className="text-white text-2xl font-semibold mb-2">Darul Irshad</h1>
        <p className="text-blue-100 text-sm">Student Management System</p>
      </div>
      {/* Login Form */}
      <div className="px-6">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Welcome Back</h2>
              <p className="text-gray-500 text-sm">Sign in to continue</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-12 pl-10 text-base border-gray-200 focus:border-[#005C83] focus:ring-2 focus:ring-[#005C83]/20 rounded-lg"
                    placeholder="Enter your username"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pl-10 text-base border-gray-200 focus:border-[#005C83] focus:ring-2 focus:ring-[#005C83]/20 rounded-lg"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-[#005C83] hover:bg-[#004a6b] text-white rounded-lg mt-6 shadow-lg transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-blue-100 text-xs">
            <p>Powered by NXT GEN DEV'S</p>
          </div>
        </div>
      </div>
    </div>
  );
}