import React, { useState, useEffect } from 'react';
import { User, TimetableEntry } from '../types';
import { Calendar, Plus, Clock, MapPin, Trash2, X } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface TimetableProps {
  user: User;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function Timetable({ user }: TimetableProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [day, setDay] = useState<typeof DAYS[number]>('Monday');
  const [courseCode, setCourseCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'timetable'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry)));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'timetable'), {
        day,
        courseCode: courseCode.toUpperCase(),
        startTime,
        endTime,
        location,
        userId: user.uid
      });
      setIsAdding(false);
      setCourseCode('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'timetable');
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'timetable', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
           <h1 className="text-2xl font-black text-white">Chronos Link 📅</h1>
           <p className="text-white/60 font-medium italic text-xs uppercase tracking-widest mt-1">Temporal coordinate synchronization active.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-accent-blue text-[#0F172A] rounded-xl font-black hover:bg-blue-400 transition-all shadow-lg shadow-accent-blue/10 uppercase text-xs tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Log Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS.map((today) => {
          const dayEntries = entries.filter(e => e.day === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div key={today} className="space-y-3">
               <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-center py-2 glass-panel rounded-lg border-white/5">{today.slice(0, 3)}</div>
               <div className="space-y-2">
                  {dayEntries.length > 0 ? (
                    dayEntries.map((entry) => (
                      <div key={entry.id} className="p-3 glass-panel rounded-xl border-white/10 hover:bg-white/5 transition-all group relative">
                         <p className="font-black text-white text-[11px] uppercase tracking-tighter truncate">{entry.courseCode}</p>
                         <div className="space-y-1 mt-2">
                            <div className="flex items-center gap-1.5 text-[9px] text-white/40 font-bold uppercase transition-colors group-hover:text-accent-blue">
                               <Clock className="w-3 h-3" />
                               {entry.startTime} - {entry.endTime}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-bold uppercase truncate">
                               <MapPin className="w-3 h-3" />
                               {entry.location}
                            </div>
                         </div>
                         <button 
                           onClick={() => removeEntry(entry.id)}
                           className="absolute top-1.5 right-1.5 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <Trash2 className="w-3 h-3" />
                         </button>
                      </div>
                    ))
                  ) : (
                    <div className="h-24 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-white/10 group">
                       <Calendar className="w-4 h-4 mb-1 opacity-10 group-hover:opacity-20 transition-opacity" />
                       <span className="text-[8px] font-black uppercase tracking-widest">VOID</span>
                    </div>
                  )}
               </div>
            </div>
          );
        })}
      </div>

      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-xl">
            <div className="glass-panel rounded-3xl p-8 w-full max-w-md shadow-2xl border-white/20 animate-in fade-in zoom-in">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">Temporal Entry</h3>
                 <button onClick={() => setIsAdding(false)} className="text-white/30 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
               </div>
               <form onSubmit={handleAdd} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Course Identification</label>
                        <input required value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="CSC 201" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white font-black uppercase focus:ring-1 focus:ring-accent-blue" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Day Cycle</label>
                        <select value={day} onChange={e => setDay(e.target.value as any)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white font-black bg-[#0F172A] focus:ring-1 focus:ring-accent-blue">
                           {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Physical Hub</label>
                        <input required value={location} onChange={e => setLocation(e.target.value)} placeholder="Main Auditorium" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white font-bold focus:ring-1 focus:ring-accent-blue" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Start Vector</label>
                        <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white font-black focus:ring-1 focus:ring-accent-blue" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase mb-2">End Vector</label>
                        <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white font-black focus:ring-1 focus:ring-accent-blue" />
                     </div>
                  </div>
                  <button type="submit" className="w-full py-4 bg-accent-blue text-[#0F172A] font-black rounded-2xl shadow-xl shadow-accent-blue/10 mt-6 active:scale-95 transition-all uppercase text-xs tracking-widest">COMMIT TO TIMELINE</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
