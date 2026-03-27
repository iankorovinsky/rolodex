'use client';

import { useState, memo } from 'react';
import Video2Ascii from 'video2ascii';

const AsciiBackground = memo(function AsciiBackground() {
  const [numColumns] = useState(() =>
    typeof window === 'undefined' ? 120 : Math.floor(window.innerWidth / 10)
  );

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-0">
      <div className="w-full h-full">
        <Video2Ascii
          src="/videos/flower-fields.mp4"
          numColumns={numColumns}
          colored={true}
          brightness={0.5}
          audioEffect={0}
          enableMouse={false}
          enableRipple={false}
          charset="detailed"
          isPlaying={true}
          autoPlay={true}
        />
      </div>
    </div>
  );
});

export default AsciiBackground;
