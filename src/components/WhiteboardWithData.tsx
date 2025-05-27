'use client';

import { useEffect, useRef } from 'react';
import { Whiteboard } from './Whiteboard';
import { fabric } from 'fabric-with-erasing';

interface WhiteboardWithDataProps {
    initialData?: object | null;
}

export const WhiteboardWithData = ({ initialData }: WhiteboardWithDataProps) => {
    const canvasRef = useRef<fabric.Canvas | null>(null);

    useEffect(() => {
        if (initialData && canvasRef.current) {
            try {
                canvasRef.current.loadFromJSON(initialData, () => {
                    console.log('Canvas loaded with initial data');
                });
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        }
    }, [initialData]);

    return <Whiteboard ref={canvasRef} />;
}; 