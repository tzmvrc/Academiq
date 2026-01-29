import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { GraduationCap, Mail, Lock, User, Upload, ArrowLeft } from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, navigate to dashboard
    navigate('/dashboard');
  };

  const handleGoogleSignup = () => {
    // For demo purposes, navigate to dashboard
    navigate('/dashboard');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-10 right-20 w-36 h-36 bg-coral rounded-full border-[3px] border-foreground opacity-30" />
      <div className="absolute bottom-10 left-20 w-28 h-28 bg-mint rounded-full border-[3px] border-foreground opacity-30" />
      <div className="absolute top-1/3 left-10 w-24 h-24 bg-primary rounded-full border-[3px] border-foreground opacity-30" />

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-foreground font-semibold mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <BrutalCard className="p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold">Academiq</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Join Academiq</h1>
          <p className="text-muted-foreground text-center mb-8">
            Create your account and start learning today
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className="w-20 h-20 bg-muted rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center overflow-hidden hover:bg-muted/80 transition-colors">
                  {avatar ? (
                    <img 
                      src={URL.createObjectURL(avatar)} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Avatar</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <BrutalInput
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <BrutalInput
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <BrutalInput
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="flex items-start gap-2">
              <input 
                type="checkbox" 
                className="w-4 h-4 mt-1 border-2 border-foreground rounded" 
                required
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{' '}
                <a href="#" className="font-semibold text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-semibold text-primary hover:underline">
                  Privacy Policy
                </a>
              </span>
            </div>

            <BrutalButton type="submit" variant="primary" className="w-full">
              Create Account
            </BrutalButton>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-[2px] bg-foreground/20" />
            <span className="text-sm font-medium text-muted-foreground">or</span>
            <div className="flex-1 h-[2px] bg-foreground/20" />
          </div>

          {/* Google OAuth */}
          <BrutalButton 
            variant="outline" 
            className="w-full"
            onClick={handleGoogleSignup}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </BrutalButton>

          {/* Login Link */}
          <p className="text-center mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </BrutalCard>
      </div>
    </div>
  );
};
