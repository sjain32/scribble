'use client';

import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const AuthButtons = () => {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <Button variant="ghost" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        );
    }

    if (status === 'authenticated') {
        return (
            <div className="flex items-center gap-x-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image ?? undefined} />
                    <AvatarFallback className="text-xs font-semibold">
                        {session.user?.name?.charAt(0).toUpperCase() ?? <User size={16} />}
                    </AvatarFallback>
                </Avatar>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    aria-label="Sign Out"
                >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                </Button>
            </div>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => signIn()}
            aria-label="Sign In"
        >
            <LogIn className="h-4 w-4 mr-1" />
            Sign In
        </Button>
    );
}; 