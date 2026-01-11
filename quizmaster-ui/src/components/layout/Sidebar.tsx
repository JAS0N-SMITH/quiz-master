'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, FileText, BarChart3 } from 'lucide-react';

const studentNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/quizzes', label: 'Browse Quizzes', icon: BookOpen },
  { href: '/dashboard/results', label: 'My Results', icon: FileText },
];

const teacherNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/quizzes', label: 'My Quizzes', icon: BookOpen },
  { href: '/dashboard/quizzes/create', label: 'Create Quiz', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navItems = user?.role === 'TEACHER' || user?.role === 'ADMIN' 
    ? teacherNavItems 
    : studentNavItems;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-16">
      <div className="flex-1 flex flex-col min-h-0 border-r bg-background">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
