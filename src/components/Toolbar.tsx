'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  RectangleHorizontal,
  Type,
  Eraser,
  MousePointer2,
  Circle,
  Undo2,
  Redo2,
  FileImage,
  FileCode2,
} from 'lucide-react';
import { AuthButtons } from './AuthButtons';

// Make sure this type matches the one in your Whiteboard logic
export type Tool =
    | "pen"
    | "select"
    | "rectangle"
    | "circle"
    | "text"
    | "eraser";

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  onUndo: () => void;
  onRedo: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
}

export const Toolbar = ({ 
  activeTool, 
  setActiveTool, 
  onUndo, 
  onRedo,
  onExportPng,
  onExportSvg 
}: ToolbarProps) => {
    const renderToolButton = (
    tool: Tool,
    Icon: React.ElementType,
    label: string
  ) => (
    <Button
      onClick={() => setActiveTool(tool)}
      variant={activeTool === tool ? 'default' : 'ghost'}
      size="icon"
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );

  return (
    <div className="w-full h-full flex items-center justify-between gap-x-3 bg-white px-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center gap-y-2 gap-x-2">
        {renderToolButton('select', MousePointer2, 'Select')}
        {renderToolButton('pen', Pencil, 'Pen')}
        {renderToolButton('rectangle', RectangleHorizontal, 'Rectangle')}
        {renderToolButton('circle', Circle, 'Circle')}
        {renderToolButton('text', Type, 'Text')}
        {renderToolButton('eraser', Eraser, 'Eraser')}

        {/* Undo / Redo */}
        <Button onClick={onUndo} variant="ghost" size="icon" aria-label="Undo" title="Undo">
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button onClick={onRedo} variant="ghost" size="icon" aria-label="Redo" title="Redo">
          <Redo2 className="h-5 w-5" />
        </Button>

        {/* Export Buttons */}
        <div className="flex items-center gap-x-1 border-l pl-2 border-gray-200">
          <span className="text-xs text-muted-foreground mr-1">Export:</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExportPng}
            aria-label="Export as PNG"
            title="Export as PNG"
          >
            <FileImage className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExportSvg}
            aria-label="Export as SVG"
            title="Export as SVG"
          >
            <FileCode2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center">
        <AuthButtons />
      </div>
    </div>
  );
};
