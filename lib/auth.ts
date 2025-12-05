import { createClient } from './supabase/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { UserRole } from '@/types/supabase';

// Cache user lookup per request to avoid duplicate queries
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return userData ? { ...user, ...userData } : null;
  } catch (error) {
    // If Supabase isn't configured, return null
    return null;
  }
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }
  return user;
}

export function canViewCosts(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canAddCustomers(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canAddDistributors(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export async function requireApproved() {
  const user = await requireAuth();
  if (!user.is_approved && user.role !== 'admin') {
    redirect('/dashboard');
  }
  return user;
}

