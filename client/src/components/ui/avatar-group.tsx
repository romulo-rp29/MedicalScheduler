import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarGroupProps {
  avatars: {
    src?: string;
    alt: string;
    fallback: string;
  }[];
  limit?: number;
  className?: string;
}

export function AvatarGroup({ avatars, limit = 4, className }: AvatarGroupProps) {
  const showCount = limit < avatars.length ? limit : avatars.length;
  const remainingCount = avatars.length - showCount;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {avatars.slice(0, showCount).map((avatar, i) => (
        <Avatar key={i} className="border-2 border-background">
          <AvatarImage src={avatar.src} alt={avatar.alt} />
          <AvatarFallback>{avatar.fallback}</AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div className="bg-muted flex items-center justify-center w-8 h-8 rounded-full border-2 border-background text-xs font-medium">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default AvatarGroup;
