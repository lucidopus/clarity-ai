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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string[]> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = ['First name is required'];
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = ['First name must be less than 50 characters'];
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = ['Last name is required'];
    } else if (formData.lastName.length > 50) {
      newErrors.lastName = ['Last name must be less than 50 characters'];
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = ['Email is required'];
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = ['Please enter a valid email address'];
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = ['Username is required'];
    } else if (formData.username.length < 3) {
      newErrors.username = ['Username must be at least 3 characters'];
    } else if (formData.username.length > 20) {
      newErrors.username = ['Username must be less than 20 characters'];
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = ['Username can only contain letters, numbers, and underscores'];
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = ['Password is required'];
    } else if (formData.password.length < 8) {
      newErrors.password = ['Password must be at least 8 characters'];
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(formData.password)) {
      newErrors.password = ['Password must contain uppercase, lowercase, number, and special character'];
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = ['Please confirm your password'];
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = ['Passwords do not match'];
    }

    // User type validation
    if (!formData.userType) {
      newErrors.userType = ['Please select a user type'];
    }

    // Custom user type validation
    if (formData.userType === 'Other' && !formData.customUserType.trim()) {
      newErrors.customUserType = ['Please specify your user type'];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

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