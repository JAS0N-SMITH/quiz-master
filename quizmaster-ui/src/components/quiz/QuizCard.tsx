'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileQuestion, User } from 'lucide-react';
import type { Quiz } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface QuizCardProps {
  quiz: Quiz;
  onDelete?: (quizId: string) => void;
  showDelete?: boolean;
}

export function QuizCard({ quiz, onDelete, showDelete = false }: QuizCardProps) {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const isOwner = quiz.teacherId === user?.id;

  const truncateDescription = (text?: string, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{quiz.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {truncateDescription(quiz.description)}
            </CardDescription>
          </div>
          {!quiz.published && (
            <Badge variant="secondary" className="ml-2">
              Draft
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileQuestion className="h-4 w-4" />
            <span>{quiz.questionCount || quiz.questions?.length || 0} questions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{quiz.timeLimit} minutes</span>
          </div>
          {quiz.teacher && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{quiz.teacher.name}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isTeacher && isOwner ? (
          <div className="flex gap-2 w-full">
            <Link href={`/dashboard/quizzes/${quiz.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Edit
              </Button>
            </Link>
            <Link href={`/dashboard/quizzes/${quiz.id}/submissions`} className="flex-1">
              <Button variant="outline" className="w-full">
                Results
              </Button>
            </Link>
            {showDelete && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(quiz.id);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        ) : quiz.published ? (
          <Link href={`/dashboard/quizzes/${quiz.id}/take`} className="w-full">
            <Button className="w-full">Take Quiz</Button>
          </Link>
        ) : (
          <Button disabled className="w-full">
            Not Available
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
