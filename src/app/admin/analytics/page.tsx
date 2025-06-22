// src/app/admin/analytics/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { format, subDays, differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { motion } from 'framer-motion';
import {
    ArrowLeft, BarChart3, Star, Target, Users, Loader2, AlertTriangle, Calendar as CalendarIcon,
    Trophy, TrendingUp, TrendingDown, UserPlus, HelpCircle, Download, BookOpen, BrainCircuit
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// --- Type Definitions ---
interface KpiData {
    totalQuizzes: number;
    avgScore: number;
    topCategory: string;
    totalUsers: number;
}

interface KpiChanges {
    totalQuizzes: number;
    avgScore: number;
    totalUsers: number;
}

interface CategoryData {
    name: string;
    avgScore: number;
    quizzes: number;
}

interface QuizPerformanceData {
    quiz_id: string;
    quiz_title: string;
    avg_score: number;
    total_attempts: number;
    unique_takers: number;
}

interface AnalyticsData {
    kpis: KpiData;
    kpiChanges: KpiChanges;
    categoryChartData: CategoryData[];
    activityChartData: { date: string; quizzes: number; }[];
    questionStats: { hardest: any[]; easiest: any[]; };
    leaderboardData: any[];
    userSignupChartData: { date: string; "New Users": number; }[];
    quizPerformanceData: QuizPerformanceData[];
    rawAttemptsData: any[];
}

interface UserProfile { id: string; full_name: string | null; email: string | null; }

// --- UI SUB-COMPONENTS ---
const StatCard = ({ icon, title, value, trend, unit = '' }: { icon: React.ReactNode, title: string, value: string | number, trend: number, unit?: string }) => {
    const isPositive = trend >= 0;
    const trendColor = isPositive ? 'text-green-400' : 'text-red-400';

    return (
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6">
            <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <div className="text-gray-500">{icon}</div>
            </div>
            <div className="flex items-baseline gap-2">
                 <p className="text-4xl font-bold text-white mt-2">{value}{unit}</p>
                 <div className={`flex items-center text-sm font-semibold ${trendColor}`}>
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                 </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">vs. previous period</p>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-700 rounded w-1/2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/4 mt-2"></div>
    </div>
);

const EmptyState = ({ message, icon }: { message: string, icon: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
        {icon}
        <p className="mt-2 text-sm">{message}</p>
    </div>
);

const AdminLoading = () => <main className="flex min-h-screen items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 text-cyan-400 animate-spin" /></main>;
const AccessDenied = () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-gray-900">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
        <p className="mt-2 text-gray-400">You do not have permission to view this page.</p>
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 mt-6">Go to Homepage</Link>
    </main>
);

const QuestionStatsWidget = ({ title, questions, icon, colorClass }: { title: string, questions: any[], icon: React.ReactNode, colorClass: string }) => (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-full min-h-[300px]">
        <div className="flex items-center gap-3 mb-4"><div className={`text-lg ${colorClass}`}>{icon}</div><h3 className="font-bold text-white">{title}</h3></div>
        {questions.length === 0 ? (
            <EmptyState message="Not enough data to calculate question difficulty." icon={<HelpCircle size={32}/>} />
        ) : (
            <ul className="space-y-3 text-sm">
                {questions.map((q: any) => (<li key={q.question_id} className="flex justify-between items-center border-b border-gray-700/50 pb-2 last:border-b-0"><span className="text-gray-300 w-4/5 truncate" title={q.questions.question_text_en}>{q.questions.question_text_en}</span><span className={`font-bold ${colorClass}`}>{q.correct_percentage.toFixed(1)}%</span></li>))}
            </ul>
        )}
    </div>
);

const LeaderboardWidget = ({ users }: { users: any[] }) => (
     <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-full min-h-[300px]">
        <div className="flex items-center gap-3 mb-4"><Trophy size={20} className="text-yellow-400"/><h3 className="font-bold text-white">Top Users</h3></div>
         {users.length === 0 ? (
            <EmptyState message="No users with scores in this period." icon={<Users size={32}/>} />
        ) : (
            <ol className="space-y-3 text-sm">
               {users.map((user, index) => (<li key={user.id} className="flex items-center justify-between border-b border-gray-700/50 pb-2 last:border-b-0"><div className="flex items-center gap-3"><span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span><span className="text-gray-200 truncate">{user.full_name || 'Unnamed User'}</span></div><span className="font-bold text-white">{user.total_score || 0} pts</span></li>))}
            </ol>
        )}
    </div>
);

const CategoryChartWidget = ({ data }: { data: CategoryData[] }) => {
    const COLORS = ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'];
    return (
        <div className="col-span-12 lg:col-span-7 bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-96">
            <h3 className="font-bold text-white mb-4">Category Performance</h3>
             {data.length === 0 ? (
                <EmptyState message="No category data available for this selection." icon={<BookOpen size={32} />} />
            ) : (
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                        <YAxis type="category" dataKey="name" width={100} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                        <Legend />
                        <Bar dataKey="avgScore" name="Avg Score">
                            {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Bar>
                         <Bar dataKey="quizzes" name="Total Quizzes" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
             )}
        </div>
    );
};

const QuizPerformanceWidget = ({ data }: { data: QuizPerformanceData[] }) => (
    <div className="col-span-12 bg-gray-800/50 border border-gray-700/80 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4"><BrainCircuit size={20} className="text-purple-400" /><h3 className="font-bold text-white">Quiz Performance Details</h3></div>
        {data.length === 0 ? (
            <EmptyState message="No individual quiz performance data for this selection." icon={<HelpCircle size={32}/>} />
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Quiz Title</th>
                            <th scope="col" className="px-6 py-3 text-center">Total Attempts</th>
                            <th scope="col" className="px-6 py-3 text-center">Unique Takers</th>
                            <th scope="col" className="px-6 py-3 text-right">Avg Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(quiz => (
                            <tr key={quiz.quiz_id} className="border-b border-gray-700/80 hover:bg-gray-800/60">
                                <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{quiz.quiz_title}</th>
                                <td className="px-6 py-4 text-center">{quiz.total_attempts}</td>
                                <td className="px-6 py-4 text-center">{quiz.unique_takers}</td>
                                <td className="px-6 py-4 text-right font-bold">{quiz.avg_score.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// --- MAIN ANALYTICS PAGE ---
export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState(searchParams.get('userId') || 'all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: searchParams.get('from') ? new Date(searchParams.get('from')!) : subDays(new Date(), 30),
    to: searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date(),
  });

  
const fetchAnalyticsData = useCallback(async (userId: string, currentRange: DateRange | undefined) => {
  setIsFiltering(true);
  setData(null);

  try {
      if (!currentRange?.from || !currentRange?.to) {
        throw new Error("Date range is required.");
      }
      
      const toDate = new Date(currentRange.to);
      toDate.setHours(23, 59, 59, 999);

      const diff = differenceInDays(toDate, currentRange.from);
      const prevRange = {
          from: subDays(currentRange.from, diff + 1),
          to: subDays(toDate, diff + 1)
      };
      
      const fetchDataForPeriod = async (range: { from: Date, to: Date }, isMainPeriod: boolean) => {
          let attemptsQuery = supabase
              .from('quiz_attempts')
              .select('*, categories(name_en)') 
              .eq('status', 'completed')
              .gte('created_at', range.from.toISOString())
              .lte('created_at', range.to.toISOString());

          if (userId !== 'all') {
              attemptsQuery = attemptsQuery.eq('user_id', userId);
          }
          
          // vvv --- THE FINAL FIX IS HERE --- vvv
          // We now query the 'leaderboard' view we created, which already calculates the total_score.
          const leaderboardQuery = isMainPeriod 
              ? supabase.from('leaderboard').select('id, full_name, total_score').limit(10)
              : Promise.resolve({ data: [], error: null });
          // ^^^ --- THE FINAL FIX IS HERE --- ^^^

          const [
              attemptsRes,
              signupsRes,
              questionStatsRes,
              leaderboardRes,
              quizPerformanceRes
          ] = await Promise.all([
              attemptsQuery,
              supabase.from('profiles').select('id, created_at').gte('created_at', range.from.toISOString()).lte('created_at', range.to.toISOString()),
              isMainPeriod ? supabase.from('question_stats').select('question_id, correct_percentage, total_attempts, questions(question_text_en)').filter('total_attempts', 'gte', 1) : Promise.resolve({ data: [], error: null }),
              leaderboardQuery, // Using the new leaderboard query
              isMainPeriod ? supabase.rpc('get_quiz_performance_stats', { from_date: range.from.toISOString(), to_date: range.to.toISOString() }) : Promise.resolve({ data: [], error: null })
          ]);

          if (attemptsRes.error) throw new Error(`Failed fetching quiz_attempts: ${attemptsRes.error.message}`);
          if (signupsRes.error) throw new Error(`Failed fetching user_signups: ${signupsRes.error.message}`);
          if (isMainPeriod && questionStatsRes.error) throw new Error(`Failed fetching question_stats view: ${questionStatsRes.error.message}`);
          if (isMainPeriod && leaderboardRes.error) throw new Error(`Failed fetching leaderboard data: ${leaderboardRes.error.message}`);
          if (isMainPeriod && quizPerformanceRes.error) throw new Error(`Failed fetching RPC: ${quizPerformanceRes.error.message}`);
          
          return { 
              attempts: attemptsRes.data || [],
              signups: signupsRes.data || [],
              questionStats: questionStatsRes.data,
              leaderboardData: leaderboardRes.data,
              quizPerformanceData: quizPerformanceRes.data
          };
      };

      const mainPeriodData = await fetchDataForPeriod({ from: currentRange.from, to: toDate }, true);
      const prevPeriodData = await fetchDataForPeriod(prevRange, false);

      const totalQuizzes = mainPeriodData.attempts.length;
      const totalScore = mainPeriodData.attempts.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgScore = totalQuizzes > 0 ? (totalScore / totalQuizzes) : 0;
      const totalUsers = mainPeriodData.signups.length;
      
      const categoryPerformance = mainPeriodData.attempts.reduce((acc: any, a: any) => { const catName = a.categories?.name_en || 'General'; if (!acc[catName]) acc[catName] = { totalScore: 0, count: 0 }; acc[catName].totalScore += a.score || 0; acc[catName].count += 1; return acc; }, {} as Record<string, { totalScore: number, count: number }>);
      const categoryChartData = Object.entries(categoryPerformance).map(([name, data]) => ({ name, avgScore: parseFloat((data.totalScore / data.count || 0).toFixed(1)), quizzes: data.count })).sort((a,b) => b.quizzes - a.quizzes);

      const attemptsByDay = mainPeriodData.attempts.reduce((acc: any, a: any) => { const date = new Date(a.created_at).toISOString().split('T')[0]; acc[date] = (acc[date] || 0) + 1; return acc; }, {} as Record<string, number>);
      const activityChartData = Object.entries(attemptsByDay).map(([date, quizzes]) => ({ date, quizzes })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const userSignupsByDay = mainPeriodData.signups.reduce((acc: any, u: any) => { const date = new Date(u.created_at).toISOString().split('T')[0]; acc[date] = (acc[date] || 0) + 1; return acc; }, {} as Record<string, number>);
      const userSignupChartData = Object.entries(userSignupsByDay).map(([date, count]) => ({ date, "New Users": count })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const prevTotalQuizzes = prevPeriodData.attempts.length;
      const prevTotalScore = prevPeriodData.attempts.reduce((sum, a) => sum + (a.score || 0), 0);
      const prevAvgScore = prevTotalQuizzes > 0 ? (prevTotalScore / prevTotalQuizzes) : 0;
      const prevTotalUsers = prevPeriodData.signups.length;

      const calculateChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100.0 : 0;
          return ((current - previous) / previous) * 100;
      };
      
      setData({
          kpis: { totalQuizzes, avgScore: parseFloat(avgScore.toFixed(1)), topCategory: categoryChartData[0]?.name || 'N/A', totalUsers },
          kpiChanges: {
              totalQuizzes: calculateChange(totalQuizzes, prevTotalQuizzes),
              avgScore: calculateChange(avgScore, prevAvgScore),
              totalUsers: calculateChange(totalUsers, prevTotalUsers),
          },
          categoryChartData,
          activityChartData,
          questionStats: {
              hardest: (mainPeriodData.questionStats || []).sort((a,b) => a.correct_percentage - b.correct_percentage).slice(0, 5),
              easiest: (mainPeriodData.questionStats || []).sort((a,b) => b.correct_percentage - a.correct_percentage).slice(0, 5),
          },
          leaderboardData: mainPeriodData.leaderboardData || [],
          userSignupChartData,
          quizPerformanceData: mainPeriodData.quizPerformanceData || [],
          rawAttemptsData: mainPeriodData.attempts,
      });
  } catch (error) {
      console.error('Failed to fetch analytics data:', error);
  } finally {
      setIsFiltering(false);
      setInitialLoading(false);
  }
}, [selectedUser, date]);

  useEffect(() => { 
    const initializePage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile?.role === 'admin') {
            setIsAuthorized(true);
            const { data: usersData } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
            setUsers(usersData || []);
            fetchAnalyticsData(selectedUser, date);
          } else {
            setIsAuthorized(false);
            setInitialLoading(false);
          }
        } else {
            setIsAuthorized(false);
            setInitialLoading(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthorized(false);
        setInitialLoading(false);
      }
    };
    initializePage();
  }, []);

  const handleFilterChange = () => {
    const params = new URLSearchParams(searchParams);
    if (selectedUser !== 'all') params.set('userId', selectedUser); else params.delete('userId');
    if (date?.from) params.set('from', format(date.from, 'yyyy-MM-dd')); else params.delete('from');
    if (date?.to) params.set('to', format(date.to, 'yyyy-MM-dd')); else params.delete('to');
    
    router.replace(`/admin/analytics?${params.toString()}`);
    
    fetchAnalyticsData(selectedUser, date);
  };
  
  const handleExport = () => {
      if (!data?.rawAttemptsData) return;
      const headers = ["attempt_id", "user_id", "quiz_title", "score", "completed_at"];
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + data.rawAttemptsData.map((row: any) => {
              const quizTitle = row.quizzes?.name_en || 'N/A'; // Corrected from title to name_en
              return [
                row.id,
                row.user_id,
                `"${quizTitle.replace(/"/g, '""')}"`,
                row.score,
                row.created_at
            ].join(",");
          }).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `khojney_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (initialLoading) return <AdminLoading />;
  if (!isAuthorized) return <AccessDenied />;

  return (
    <main className="min-h-screen w-full p-4 sm:p-8 bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <div>
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 mb-2"><ArrowLeft size={16} /> Back to Admin Dashboard</Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Platform Analytics</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
                 <Popover>
                    <PopoverTrigger asChild><Button id="date" variant={"outline"} className="w-full sm:w-[280px] justify-start text-left font-normal bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:text-white"><CalendarIcon className="mr-2 h-4 w-4" />{date?.from ? (date.to ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}` : format(date.from, "LLL dd, y")) : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} /></PopoverContent>
                </Popover>
                <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full sm:w-auto bg-gray-800 border border-gray-600 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="all">All Users</option>
                    {users.map(user => (<option key={user.id} value={user.id}>{user.full_name || user.email}</option>))}
                </select>
                <Button onClick={handleFilterChange} disabled={isFiltering} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 flex items-center gap-2">
                    {isFiltering ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Apply'}
                </Button>
                <Button onClick={handleExport} disabled={!data || data.rawAttemptsData.length === 0} variant="outline" className="w-full sm:w-auto bg-gray-800 border-gray-600 hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"><Download size={16}/> Export CSV</Button>
            </div>
        </div>
        
        {(isFiltering && !data)}
        {initialLoading ? (
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><SkeletonLoader /><SkeletonLoader /><SkeletonLoader /><SkeletonLoader /></div>
                <div className="grid grid-cols-12 gap-6"><div className="col-span-12 lg:col-span-7"><SkeletonLoader/></div><div className="col-span-12 lg:col-span-5"><SkeletonLoader/></div></div>
            </div>
        ) : !data || data.kpis.totalQuizzes === 0 ? (
            <div className="text-center h-96 flex items-center justify-center rounded-lg bg-gray-800/50"><EmptyState message="No quiz attempts found for this selection." icon={<BarChart3 size={32} />} /></div>
        ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={<UserPlus size={24} />} title="New Users" value={data.kpis.totalUsers} trend={data.kpiChanges.totalUsers} />
                    <StatCard icon={<BarChart3 size={24} />} title="Total Quizzes Taken" value={data.kpis.totalQuizzes} trend={data.kpiChanges.totalQuizzes} />
                    <StatCard icon={<Target size={24} />} title="Average Score" value={data.kpis.avgScore} trend={data.kpiChanges.avgScore} unit=" pts" />
                    <StatCard icon={<Star size={24} />} title="Top Category" value={data.kpis.topCategory} trend={0} />
                </div>
                
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-96"><h3 className="font-bold text-white mb-4">Daily Activity (Quizzes vs. New Users)</h3><ResponsiveContainer width="100%" height="90%"><LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} /><XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} /><YAxis yAxisId="left" stroke="#22d3ee" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Quizzes', angle: -90, position: 'insideLeft', fill: '#22d3ee', style: {textAnchor: 'middle'} }} /><YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'New Users', angle: -90, position: 'insideRight', fill: '#82ca9d', style: {textAnchor: 'middle'} }} /><Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} /><Legend /><Line yAxisId="left" type="monotone" dataKey="quizzes" name="Quizzes" data={data.activityChartData} stroke="#22d3ee" strokeWidth={2} dot={false} /><Line yAxisId="right" type="monotone" dataKey="New Users" name="New Users" data={data.userSignupChartData} stroke="#82ca9d" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
                    
                    <CategoryChartWidget data={data.categoryChartData} />
                    <div className="col-span-12 lg:col-span-5"><LeaderboardWidget users={data.leaderboardData} /></div>

                    <div className="col-span-12"><QuizPerformanceWidget data={data.quizPerformanceData} /></div>

                    <div className="col-span-12 lg:col-span-6"><QuestionStatsWidget title="Easiest Questions" questions={data.questionStats.easiest} icon={<TrendingUp />} colorClass="text-green-400" /></div>
                    <div className="col-span-12 lg:col-span-6"><QuestionStatsWidget title="Hardest Questions" questions={data.questionStats.hardest} icon={<TrendingDown />} colorClass="text-red-400" /></div>
                </div>
            </motion.div>
        )}
      </div>
    </main>
  );
}