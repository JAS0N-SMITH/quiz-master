'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizTimerProps {
  timeLimit: number; // in minutes
  onExpire: () => void;
  startedAt: string;
}

export function QuizTimer({ timeLimit, onExpire, startedAt }: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const totalSeconds = timeLimit * 60;

    const updateTimer = () => {
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        onExpire();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [timeLimit, startedAt, onExpire]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isLowTime = timeRemaining < 5 * 60; // Less than 5 minutes

  return (
    <Badge
      variant={isLowTime ? 'destructive' : 'secondary'}
      className={cn(
        'text-lg px-4 py-2 font-mono',
        isLowTime && 'animate-pulse'
      )}
    >
      <Clock className="mr-2 h-4 w-4" />
      {formattedTime}
    </Badge>
  );
}
