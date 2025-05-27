// File: components/Room.tsx
"use client";

import { Participants } from "./Participants";
import { WhiteboardWithData } from "./WhiteboardWithData";

interface RoomProps {
  initialData?: object | null;
}

export function Room({ initialData }: RoomProps) {
  return (
    // --- Main Container ---
    // h-screen w-screen: Fills the viewport.
    // flex flex-col: Stacks children (Toolbar, Main Content) vertically.
    // bg-neutral-50: Sets a light background for the whole room area.
    // text-neutral-900: Default text color (can be overridden).
    // overflow-hidden: Prevents scrollbars on the main container.
    <div className="h-screen w-screen flex flex-col bg-neutral-50 text-neutral-900 overflow-hidden">

      {/* --- Toolbar Section --- */}
      {/* w-full: Full width.
          h-[60px]: Fixed height for the toolbar area.
          flex items-center: Vertically centers Toolbar content (needed for height).
          px-0: No horizontal padding here; Toolbar component handles its own padding.
          bg-white: White background for the toolbar area.
          shadow-sm: Subtle bottom shadow for visual separation.
          z-10: Ensures toolbar is above other content if needed. */}
      

      {/* --- Main Content Area (Whiteboard + Participants) --- */}
      {/* flex-1: Allows this div to grow and fill remaining vertical space.
          relative: Positioning context for the absolutely positioned Participants.
          w-full: Ensures it takes full width below the toolbar. */}
      <div className="flex-1 relative w-full">

        {/* --- Whiteboard Canvas Area --- */}
        {/* The Whiteboard component fills this area due to its own styles */}
        <WhiteboardWithData initialData={initialData} />

        {/* --- Participants List Container --- */}
        {/* absolute: Positioned relative to the parent above.
            top-3 right-3: Placed near the top-right corner.
            bg-white rounded-lg: Card-like appearance.
            px-3 py-2: Internal padding.
            h-[40px] flex items-center: Fixed height, centers content vertically.
            shadow-md: Card shadow.
            z-10: Ensures it's visually on top of the Whiteboard. */}
        <div className="absolute top-3 right-3 bg-white rounded-lg px-3 py-2 h-[40px] flex items-center shadow-md z-10 hidden sm:flex">
          <Participants />
        </div>
      </div>

    </div>
  );
}