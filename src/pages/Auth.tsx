import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Mail, Lock, User, Phone, Hash, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Matric Number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Allowed email domains for Elizade University
const ALLOWED_DOMAINS = ['elizadeuniversity.edu.ng'];

const validateEmailDomain = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

const signupSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .refine(validateEmailDomain, {
      message: 'Please use your Elizade University email (@elizadeuniversity.edu.ng)',
    }),
  fullName: z.string().min(2, 'Full name is required'),
  matricNumber: z.string().min(1, 'Matriculation number is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

  useEffect(() => {
    if (user) {
      console.info("User detected in Auth.tsx, navigating to dashboard...");
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      email: '', 
      fullName: '', 
      matricNumber: '', 
      phoneNumber: '', 
      password: '', 
      confirmPassword: '' 
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.identifier, data.password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, {
      full_name: data.fullName,
      matric_number: data.matricNumber,
      phone_number: data.phoneNumber,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(error.message || 'Signup failed. Please try again.');
      }
    } else {
      toast.success('Account created successfully! Welcome to Elizade AI.');
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    console.info("Initiating Google sign-in...");
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("Google sign-in error:", error);
      toast.error(error.message || 'Google sign-in failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4 shadow-gold-lg">
            <GraduationCap className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-cream">Elizade AI</h1>
          <p className="text-cream/60 mt-1">Your AI-Powered Study Partner</p>
        </div>

        <Card className="glass border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">
              {isLogin ? 'Welcome Back' : 'Join Elizade AI'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in with your student credentials' 
                : 'Create your student account'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Toggle Tabs */}
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  isLogin 
                    ? 'bg-card shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  !isLogin 
                    ? 'bg-card shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email or Matric Number</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="identifier"
                        placeholder="name.surname@elizadeuniversity.edu.ng or MAT/123/456"
                        className="pl-10 input-focus-ring"
                        {...loginForm.register('identifier')}
                      />
                    </div>
                    {loginForm.formState.errors.identifier && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.identifier.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10 input-focus-ring"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full btn-gold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-cream/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-transparent px-2 text-cream/40">Or continue with</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-cream/10 bg-white/5 text-cream hover:bg-white/10"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={signupForm.handleSubmit(handleSignup)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        className="pl-10 input-focus-ring"
                        {...signupForm.register('fullName')}
                      />
                    </div>
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">School Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name.surname@elizadeuniversity.edu.ng"
                        className="pl-10 input-focus-ring"
                        {...signupForm.register('email')}
                      />
                    </div>
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="matricNumber">Matric Number</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="matricNumber"
                          placeholder="MAT/123/456"
                          className="pl-10 input-focus-ring"
                          {...signupForm.register('matricNumber')}
                        />
                      </div>
                      {signupForm.formState.errors.matricNumber && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.matricNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phoneNumber"
                          placeholder="+234..."
                          className="pl-10 input-focus-ring"
                          {...signupForm.register('phoneNumber')}
                        />
                      </div>
                      {signupForm.formState.errors.phoneNumber && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.phoneNumber.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10 input-focus-ring"
                        {...signupForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 input-focus-ring"
                        {...signupForm.register('confirmPassword')}
                      />
                    </div>
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full btn-gold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-cream/40 text-sm">
          © 2024 Elizade University. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
