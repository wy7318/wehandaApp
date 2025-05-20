import React, { useEffect } from 'react';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If not authenticated and not loading, redirect to login
  if (!loading && !user) {
    return <Redirect href="/login" />;
  }

  // Show nothing while checking auth status
  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="restaurant/[id]" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}