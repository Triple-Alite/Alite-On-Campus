import { User, Note, TimetableEntry, SemesterResult } from '../types';
import { Calendar, TrendingUp, BookOpen, Clock, ChevronRight, Bell, Library, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, query, where, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface DashboardProps {
  user: User;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ user, setActiveTab }: DashboardProps) {
  const [upcomingClasses, setUpcomingClasses] = useState<TimetableEntry[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'timetable'),
      where('userId', '==', user.uid),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUpcomingClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry)));
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(
      collection(db, 'notes'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
    });
    return () => unsubscribe();
  }, []);

  const calculateCGPA = (history?: SemesterResult[]) => {
    if (!history || history.length === 0) return '0.00';
    const totalUnits = history.reduce((acc, curr) => acc + (curr.totalUnits || 0), 0);
    const totalPoints = history.reduce((acc, curr) => acc + ((curr.gpa || 0) * (curr.totalUnits || 0)), 0);
    return totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00';
  };

  const stats = [
    { label: 'Current CGPA', value: calculateCGPA(user.gpaHistory), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Study Hours', value: '12.5h', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Materials', value: recentNotes.length.toString(), icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-white">Welcome, {user.name.split(' ')[0]}! 👋</h1>
           <p className="text-white/60 font-medium">System operational at <span className="text-accent-blue font-bold">{user.school || 'Campus'}</span></p>
        </div>
        <div className="flex gap-2">
           <button className="p-3 bg-white/10 border border-white/20 rounded-xl relative hover:bg-white/20 transition-all backdrop-blur-md">
             <Bell className="w-6 h-6 text-white" />
             <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-[#0F172A]"></span>
           </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 glass-panel rounded-3xl border-white/10 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-white">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-2xl bg-white/5 border border-white/10`}>
              <stat.icon className={`w-6 h-6 text-accent-blue`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Agenda */}
        <div className="lg:col-span-2 space-y-6">
          <section className="glass-panel p-6 rounded-3xl border-white/10">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-sm font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-accent-green" />
                 UPCOMING SCHEDULE
               </h3>
               <button onClick={() => setActiveTab('timetable')} className="text-xs font-bold text-accent-blue hover:underline">VIEW FULL</button>
            </div>
            <div className="space-y-4">
               {upcomingClasses.length > 0 ? (
                 upcomingClasses.map((item, i) => (
                   <div key={item.id} className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-all`}>
                      <div className="w-16 flex flex-col items-center justify-center border-r border-white/10 pr-4">
                         <span className="text-sm font-black text-white">{item.startTime}</span>
                         <span className="text-[10px] font-bold text-white/40 uppercase">{item.day.slice(0, 3)}</span>
                      </div>
                      <div className="flex-1">
                         <p className="font-bold text-white uppercase text-sm tracking-tight">{item.courseCode}</p>
                         <p className="text-[11px] text-white/40 font-bold uppercase">{item.location}</p>
                      </div>
                      <span className="px-3 py-1 bg-accent-green/20 text-accent-green text-[9px] font-black rounded-lg uppercase tracking-wider">ACTIVE</span>
                   </div>
                 ))
               ) : (
                 <div className="p-10 text-center text-white/20">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-10" />
                    <p className="font-bold text-sm">NO CLASSES LOGGED</p>
                 </div>
               )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-sm font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                 <Library className="w-4 h-4 text-accent-green" />
                 RESOURCE FEED
               </h3>
               <button onClick={() => setActiveTab('notes')} className="text-xs font-bold text-accent-blue hover:underline">EXPLORE</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recentNotes.map((note) => (
                 <div key={note.id} className="p-5 glass-panel rounded-2xl border-white/10 flex items-center gap-4 hover:bg-white/10 transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-accent-blue/20 transition-colors">
                       <BookOpen className="w-5 h-5 text-white/40 group-hover:text-accent-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="font-bold text-xs text-white uppercase truncate">{note.courseCode}</p>
                       <p className="text-[11px] text-white/60 font-medium truncate">{note.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                 </div>
               ))}
               {recentNotes.length === 0 && <p className="col-span-full py-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">DRIVE EMPTY</p>}
            </div>
          </section>
        </div>

        {/* Right Column: AI & Announcements */}
        <div className="space-y-6">
           <div className="p-6 bg-accent-blue/20 backdrop-blur-md rounded-3xl border border-accent-blue/30 text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="font-black text-lg mb-2 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-accent-blue" />
                  ALITE AI
                </h3>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">Neural processing ready. Ask anything to optimize your study session.</p>
                <button 
                  onClick={() => setActiveTab('ai')}
                  className="w-full py-3 bg-accent-blue text-[#0F172A] font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-accent-blue/20 uppercase text-xs tracking-widest"
                >
                  INITIALIZE CHAT
                </button>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Sparkles className="w-16 h-16 text-white" />
              </div>
           </div>

           <div className="glass-panel rounded-3xl p-6 border-white/10">
              <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-6">CAMPUS BROADCAST</h3>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="w-1 h-8 bg-accent-green rounded-full shrink-0"></div>
                    <div>
                       <p className="text-xs font-bold text-white leading-tight">Exam portal synchronization complete.</p>
                       <p className="text-[10px] text-white/40 font-medium mt-1 uppercase">2 HOURS AGO</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-1 h-8 bg-accent-blue rounded-full shrink-0"></div>
                    <div>
                       <p className="text-xs font-bold text-white leading-tight">Faculty of Science library extended hours.</p>
                       <p className="text-[10px] text-white/40 font-medium mt-1 uppercase">YESTERDAY</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
