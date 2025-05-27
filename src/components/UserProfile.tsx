'use client';

import { useSession } from "next-auth/react";
import Image from "next/image";

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (status === "authenticated" && session.user) {
    return (
      <div className="flex items-center space-x-4 p-4">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || "User avatar"}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <div>
          <p className="font-medium">{session.user.name}</p>
          <p className="text-sm text-gray-500">{session.user.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 text-center">
      <p className="text-gray-600">Not signed in</p>
    </div>
  );
} 