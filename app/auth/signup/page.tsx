'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function SignupPage() {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    userType: '' as 'Graduate' | 'Undergraduate' | 'Other' | '',
    customUserType: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    // Basic client-side validation
    if (!formData.userType) {
      setErrors({ userType: ['Please select a user type'] });
      setLoading(false);
      return;
    }

    if (formData.userType === 'Other' && !formData.customUserType.trim()) {
      setErrors({ customUserType: ['Please specify your user type'] });
      setLoading(false);
      return;
    }

    try {
      await signup({
        ...formData,
        userType: formData.userType as 'Graduate' | 'Undergraduate' | 'Other',
      });
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'username' in err) {
        // Field-specific validation errors
        setErrors(err as Record<string, string[]>);
      } else {
        setErrors({ general: [err instanceof Error ? err.message : 'Signup failed'] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join Clarity AI to start learning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                 First Name
               </label>
               <input
                 type="text"
                 id="firstName"
                 name="firstName"
                 value={formData.firstName}
                 onChange={handleChange}
                 required
                 className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
               />
               {errors.firstName && (
                 <p className="text-red-500 text-sm mt-1">{errors.firstName[0]}</p>
               )}
             </div>
             <div>
               <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                 Last Name
               </label>
               <input
                 type="text"
                 id="lastName"
                 name="lastName"
                 value={formData.lastName}
                 onChange={handleChange}
                 required
                 className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
               />
               {errors.lastName && (
                 <p className="text-red-500 text-sm mt-1">{errors.lastName[0]}</p>
               )}
             </div>
          </div>

           <div>
             <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
               Email
             </label>
             <input
               type="email"
               id="email"
               name="email"
               value={formData.email}
               onChange={handleChange}
               required
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
             />
             {errors.email && (
               <p className="text-red-500 text-sm mt-1">{errors.email[0]}</p>
             )}
           </div>

           <div>
             <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
               Username
             </label>
             <input
               type="text"
               id="username"
               name="username"
               value={formData.username}
               onChange={handleChange}
               required
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
             />
             {errors.username && (
               <p className="text-red-500 text-sm mt-1">{errors.username[0]}</p>
             )}
           </div>

           <div>
             <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
               Password
             </label>
             <input
               type="password"
               id="password"
               name="password"
               value={formData.password}
               onChange={handleChange}
               required
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
             />
             {errors.password && (
               <p className="text-red-500 text-sm mt-1">{errors.password[0]}</p>
             )}
           </div>

           <div>
             <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
               Confirm Password
             </label>
             <input
               type="password"
               id="confirmPassword"
               name="confirmPassword"
               value={formData.confirmPassword}
               onChange={handleChange}
               required
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
             />
             {errors.confirmPassword && (
               <p className="text-red-500 text-sm mt-1">{errors.confirmPassword[0]}</p>
             )}
           </div>

           <div>
             <label htmlFor="userType" className="block text-sm font-medium text-foreground mb-1">
               User Type
             </label>
             <select
               id="userType"
               name="userType"
               value={formData.userType}
               onChange={handleChange}
               required
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
             >
               <option value="">Select user type</option>
               <option value="Undergraduate">Undergraduate</option>
               <option value="Graduate">Graduate</option>
               <option value="Other">Other</option>
             </select>
             {errors.userType && (
               <p className="text-red-500 text-sm mt-1">{errors.userType[0]}</p>
             )}
           </div>

           {formData.userType === 'Other' && (
             <div>
               <label htmlFor="customUserType" className="block text-sm font-medium text-foreground mb-1">
                 Please specify
               </label>
               <input
                 type="text"
                 id="customUserType"
                 name="customUserType"
                 value={formData.customUserType}
                 onChange={handleChange}
                 required
                 placeholder="e.g., High School, Professional, etc."
                 className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
               />
               {errors.customUserType && (
                 <p className="text-red-500 text-sm mt-1">{errors.customUserType[0]}</p>
               )}
             </div>
           )}

           {errors.general && (
             <div className="text-red-500 text-sm text-center">{errors.general[0]}</div>
           )}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}