import React, { useState } from 'react';

interface ReelThumbnailProps {
  src?: string;
  size?: string;
  alt?: string;
}

export const ReelThumbnail: React.FC<ReelThumbnailProps> = ({
  src,
  size = 'w-11 h-11',
  alt = 'Thumbnail',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${size} rounded-[5px] bg-secondary border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0 select-none`}
      >
        reel
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`${size} rounded-[5px] object-cover border border-border shrink-0`}
      loading="lazy"
    />
  );
};
