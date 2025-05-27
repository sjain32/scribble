'use client';

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Optional: Configure session behavior
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch session when window is focused
    >
      {children}
    </SessionProvider>
  );
} 