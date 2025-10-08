'use client';

import { cn } from '@/app/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, Users, Menu, X, Award, Filter } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'File Management', href: '/dashboard/file-upload', icon: FileText },
  { name: 'Customer Bidding', href: '/dashboard/bids-report', icon: Users },
  { name: 'Verizon Awards', href: '/dashboard/bid-filter', icon: Filter },
  { name: 'Award Filter', href: '/dashboard/awarding', icon: Award },
  // { name: 'Verizon Submissions', href: '/dashboard/verizon-submissions', icon: Upload },
  // { name: 'Award Management', href: '/dashboard/award-management', icon: Award },
  // { name: 'Invoicing', href: '/dashboard/invoicing', icon: FileInput },
  // { name: 'Reports', href: '/dashboard/reports', icon: LineChart },
  // { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    // Close sidebar when route changes on mobile
    if (isMobile) {
      setIsOpen(false);
    }
  }, [pathname]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed z-50 p-2 md:hidden bottom-8 right-4 bg-gray-200 text-black rounded-full shadow-lg hover:bg-gray-300 transition-colors"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed h-full z-40">
        <div className="flex flex-col w-64 h-full border-r border-gray-200 bg-white">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Bid Manager</h1>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="flex fixed inset-0 z-40 bg-black md:hidden"
              onClick={toggleSidebar}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed z-40 top-0 flex flex-col w-64 h-full border-r border-gray-200 bg-white shadow-lg md:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900">99 Solar Bid Manager</h1>
                <button 
                  onClick={toggleSidebar} 
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto">
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                        onClick={toggleSidebar}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}