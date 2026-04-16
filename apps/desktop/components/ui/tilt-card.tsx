'use client';

import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  glareClassName?: string;
  rotate?: number;
}

export function TiltCard({ children, className, rotate = 12 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)',
  });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * rotate * 2;
    const rotateX = (0.5 - y) * rotate * 2;
    const rotateZ = (x - 0.5) * 1.5;

    setStyle({
      transform: `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(1.01)`,
    });
  };

  const reset = () => {
    setStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)',
    });
  };

  return (
    <div
      ref={ref}
      className={cn(
        'group relative transform-gpu transition-transform duration-150 ease-out',
        className
      )}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
    </div>
  );
}
