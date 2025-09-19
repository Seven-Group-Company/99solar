'use client';

import { useEffect, useState } from "react";
import { Users, DollarSign, Gavel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { OverviewChart } from '../_components/overview-charts';
import { RecentActivity } from '../_components/recent-activity';
import { fetchActiveCustomers, fetchDashboardStats, fetchHighestBid } from "@/utils/api";


export default function DashboardPage() {
  const [stats, setStats] = useState([
    { title: 'Total Bids', value: '...', icon: Gavel, change: '' },
    { title: 'Active Customers', value: '...', icon: Users, change: '' },
    { title: 'Highest Bid', value: '...', icon: DollarSign, change: '' },
    { title: 'Monthly Revenue', value: '...', icon: DollarSign, change: '' },
  ]);
  const [fileName] = useState('example.xlsx'); // Set this dynamically as needed
  
  useEffect(() => {
    if (!localStorage.getItem('isAuthenticated')) {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchActiveCustomers(fileName),
      fetchHighestBid(),
    ]).then(([dashboard, activeCustomers, highestBid]) => {
      setStats([
        { title: 'Total Bids Today', value: dashboard.totalBids.toLocaleString(), icon: Gavel, change: '' },
        { title: 'Active Customers', value: (activeCustomers ?? 0).toString(), icon: Users, change: '' },
        {
          title: 'Highest Bid',
          value: `$${highestBid.amount?.toLocaleString() || '0'}`,
          icon: DollarSign,
          change: `${highestBid.description || ''} (${highestBid.date ? new Date(highestBid.date).toLocaleDateString() : ''})`
        },
        { title: 'Monthly Revenue', value: `$${dashboard.monthlyRevenue.toLocaleString()}`, icon: DollarSign, change: '+8%' },
      ]);
    }).catch(console.error);
  }, [fileName]);

  return (
    <div className="space-y-4 h-full overflow-scroll">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-gray-500">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
      </div>

      {/* Chart and Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 h-[400px]">
        <Card className="col-span-4 h-full">
          <CardHeader>
            <CardTitle>Bid Activity Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-57px)]">
            <OverviewChart />
          </CardContent>
        </Card>
        <Card className="col-span-3 h-full">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-57px)] overflow-y-auto">
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}