// File: components/Participants.tsx

// This component uses Liveblocks hooks and renders dynamic UI
"use client";

import React from 'react';
// Import Liveblocks hooks and the Presence type (ensure path is correct)
import { useOthers, useSelf } from "@liveblocks/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from 'lucide-react';

// Increase the number of visible avatars
const MAX_SHOWN_AVATARS = 3;

/**
 * Participants Component
 *
 * Displays avatars of users currently present in the Liveblocks room.
 * Uses authenticated user information from NextAuth via Liveblocks presence.
 */
export const Participants = () => {
  // Hook to get the list of *other* users in the room.
  // The generic <Presence> types the `user.presence` field within each user object.
  const others = useOthers();

  // Hook to get information about the current user (self).
  // This is useful for displaying the user's own avatar differently.
  const currentUser = useSelf();

  // Combine current user and others into a single array
  const allUsers = currentUser ? [currentUser, ...others] : others;

  // Calculate how many users to show directly vs stacking
  const usersToShow = allUsers.slice(0, MAX_SHOWN_AVATARS);
  const additionalUsersCount = allUsers.length - MAX_SHOWN_AVATARS;

  // Helper function to generate initials from a name string
  const getInitials = (name?: string | null): string => {
    if (!name) return "A"; // Default to 'A' for Anonymous if name is missing
    const names = name.trim().split(" ");
    const firstInitial = names[0]?.[0]?.toUpperCase() || "";
    const lastInitial = names.length > 1 ? names[names.length - 1]?.[0]?.toUpperCase() : "";
    return firstInitial + (lastInitial || "");
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-md p-2 shadow-md flex items-center h-10">
      <TooltipProvider delayDuration={100}>
        <div className="flex gap-x-2 items-center">
          {usersToShow.map(({ connectionId, info }, index) => (
            <Tooltip key={connectionId}>
              <TooltipTrigger asChild>
                <Avatar 
                  className={`h-8 w-8 border-2 transition hover:ring-2 hover:ring-blue-500 ${
                    index === 0 && currentUser ? 'border-blue-500' : 'border-neutral-200'
                  }`}
                >
                  <AvatarImage
                    src={info?.picture as string | undefined}
                    alt={info?.name as string || 'User Avatar'}
                  />
                  <AvatarFallback className="text-xs font-semibold bg-neutral-100">
                    {info?.name ? getInitials(info.name as string) : <User size={14} />}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white border-black">
                <p>{info?.name as string || 'Anonymous'}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {additionalUsersCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold border-2 border-neutral-300 text-neutral-600">
                  +{additionalUsersCount}
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white border-black">
                <p>{additionalUsersCount} more user{additionalUsersCount > 1 ? 's' : ''} online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};