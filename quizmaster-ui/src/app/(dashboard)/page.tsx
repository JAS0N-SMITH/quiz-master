'use client';

import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-muted-foreground">
          {isTeacher 
            ? 'Manage your quizzes and view student performance.'
            : 'Browse available quizzes and track your progress.'}
        </p>
      </div>

      {isTeacher ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Create Quiz</CardTitle>
              <CardDescription>Create a new quiz for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/quizzes/create">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quiz
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Quizzes</CardTitle>
              <CardDescription>View and manage your quizzes</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/quizzes">
                <Button variant="outline" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Quizzes
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Browse Quizzes</CardTitle>
              <CardDescription>Take available quizzes</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/quizzes">
                <Button className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Quizzes
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
