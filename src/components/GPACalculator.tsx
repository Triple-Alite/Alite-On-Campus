import { useState } from 'react';
import { User, SemesterResult, CourseGrade } from '../types';
import { Plus, Trash2, Save, Calculator, History, Trash, Loader2, Trophy } from 'lucide-react';
import { calculateGPA, GRADE_POINTS } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface GPACalculatorProps {
  user: User;
}

export default function GPACalculator({ user }: GPACalculatorProps) {
  const [courses, setCourses] = useState<CourseGrade[]>([{ code: '', units: 0, grade: 'A', point: 5 }]);
  const [semesterName, setSemesterName] = useState('');
  const [saving, setSaving] = useState(false);

  const addCourse = () => {
    setCourses([...courses, { code: '', units: 0, grade: 'A', point: 5 }]);
  };

  const removeCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const updateCourse = (index: number, field: keyof CourseGrade, value: any) => {
    setCourses(prev => prev.map((course, i) => {
      if (i !== index) return course;
      
      const updatedCourse = { ...course, [field]: value };
      if (field === 'grade') {
        updatedCourse.point = GRADE_POINTS[value as keyof typeof GRADE_POINTS];
      }
      return updatedCourse;
    }));
  };

  const totalUnits = courses.reduce((acc, curr) => acc + (Number(curr.units) || 0), 0);
  const totalQualityPoints = courses.reduce((acc, curr) => {
    const units = Number(curr.units) || 0;
    const point = GRADE_POINTS[curr.grade as keyof typeof GRADE_POINTS] || 0;
    return acc + (units * point);
  }, 0);
  const currentGPA = calculateGPA(courses);

  const saveResults = async () => {
    if (!semesterName) {
      alert('IDENTIFICATION ERROR: Please designate a semester name for archival.');
      return;
    }
    if (totalUnits === 0) {
      alert('CALCULATION ERROR: Credit units cannot be zero for synchronization.');
      return;
    }
    setSaving(true);
    const result: SemesterResult = {
      id: Math.random().toString(36).substr(2, 9),
      semesterName,
      courses,
      gpa: currentGPA,
      totalUnits
    };

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        gpaHistory: arrayUnion(result)
      });
      setSemesterName('');
      setCourses([{ code: '', units: 0, grade: 'A', point: 5 }]);
      alert('Results saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6 md:p-8 rounded-3xl border-white/10 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-black text-white px-2">GPA Core 📊</h1>
                <p className="text-sm text-white/40 font-medium px-2 italic">Mathematical models for academic verification.</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-white/30 uppercase mb-1">Semester GPA</p>
                 <p className="text-4xl font-black text-accent-green">{currentGPA}</p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 px-2 mb-2">
                 <div className="col-span-12 md:col-span-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Calculus ID / Subject</div>
                 <div className="col-span-4 md:col-span-2 text-[10px] font-black text-white/30 uppercase tracking-widest">Units</div>
                 <div className="col-span-4 md:col-span-2 text-[10px] font-black text-white/30 uppercase tracking-widest">Grade</div>
                 <div className="col-span-4 md:col-span-2"></div>
              </div>

              {courses.map((course, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-6">
                     <input 
                       value={course.code} 
                       onChange={(e) => updateCourse(index, 'code', e.target.value)}
                       placeholder="e.g. MTH 101" 
                       className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none font-bold text-sm text-white uppercase tracking-tight placeholder:text-white/20"
                     />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                     <input 
                       type="number" 
                       value={course.units || ''} 
                       onChange={(e) => updateCourse(index, 'units', Number(e.target.value))}
                       placeholder="Units" 
                       className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none font-black text-sm text-white"
                     />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                     <select 
                       value={course.grade} 
                       onChange={(e) => updateCourse(index, 'grade', e.target.value)}
                       className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none font-black text-sm text-white cursor-pointer bg-[#0F172A]"
                     >
                        {Object.keys(GRADE_POINTS).map(g => <option key={g} value={g}>{g}</option>)}
                     </select>
                  </div>
                  <div className="col-span-4 md:col-span-2 flex justify-end">
                    <button 
                      onClick={() => removeCourse(index)} 
                      className={`p-3 text-white/20 hover:text-red-500 transition-colors ${courses.length === 1 ? 'opacity-0 cursor-default' : ''}`}
                      disabled={courses.length === 1}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="grid grid-cols-12 gap-3 items-center pt-4 border-t border-white/5 opacity-50">
                <div className="col-span-12 md:col-span-6 text-right pr-4">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Calculated Totals:</span>
                </div>
                <div className="col-span-4 md:col-span-2">
                   <div className="px-4 py-2 bg-white/5 rounded-lg text-center font-black text-xs text-accent-blue">
                     {totalUnits} Units
                   </div>
                </div>
                <div className="col-span-4 md:col-span-2">
                   <div className="px-4 py-2 bg-white/5 rounded-lg text-center font-black text-xs text-accent-green">
                     {totalQualityPoints} Pts
                   </div>
                </div>
              </div>
           </div>

           <button 
             onClick={addCourse}
             className="mt-6 w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-white/30 font-bold flex items-center justify-center gap-2 hover:border-accent-blue/30 hover:text-accent-blue transition-all group"
           >
             <Plus className="w-5 h-5" />
             Add Another Subject
           </button>

           <div className="mt-10 pt-8 border-t border-white/10 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Semester Identification</label>
                <input 
                  value={semesterName}
                  onChange={(e) => setSemesterName(e.target.value)}
                  placeholder="e.g. YEAR 1 - SEMESTER 1" 
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white placeholder:text-white/20 font-black text-lg rounded-2xl outline-none"
                />
              </div>
              <button 
                onClick={saveResults}
                disabled={saving || !currentGPA}
                className="w-full py-5 bg-accent-green text-[#0F172A] rounded-2xl font-black text-lg shadow-xl shadow-accent-green/10 flex items-center justify-center gap-3 disabled:opacity-20 hover:bg-emerald-400 transition-all active:scale-[0.98] uppercase tracking-tighter"
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                Commit to Cloud Log
              </button>
           </div>
        </div>
      </div>

      <div className="space-y-6">
         <div className="glass-panel rounded-3xl p-6 text-white overflow-hidden relative group border-accent-blue/20">
            <div className="relative z-10">
              <h3 className="font-black text-sm text-white/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent-green" />
                Performance Summary
              </h3>
              <div className="space-y-4">
                 <div>
                    <p className="text-white/30 text-[10px] font-black uppercase mb-1">Cumulative Analysis (CGPA)</p>
                    <p className="text-5xl font-black text-white">{(() => {
                        const totalU = user.gpaHistory?.reduce((a, b) => a + (b.totalUnits || 0), 0);
                        const totalP = user.gpaHistory?.reduce((a, b) => a + ((b.gpa || 0) * (b.totalUnits || 0)), 0);
                        return totalU && totalU > 0 ? (totalP / totalU).toFixed(2) : '0.00';
                      })()}</p>
                 </div>
                 <p className="text-xs text-white/60 font-medium leading-relaxed italic">"Excellence is verified through neural iteration. Keep pushing."</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5 transform rotate-12">
               <Calculator className="w-32 h-32" />
            </div>
         </div>

         <section>
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 px-2">
              <History className="w-4 h-4 text-accent-blue" />
              HISTORY LOG
            </h3>
            <div className="space-y-3">
               {user.gpaHistory?.map((history) => (
                 <div key={history.id} className="p-4 glass-panel rounded-2xl border-white/10 flex items-center justify-between hover:bg-white/5 transition-all group">
                    <div className="flex-1 min-w-0 pr-4">
                       <p className="font-black text-white uppercase text-xs truncate">{history.semesterName}</p>
                       <p className="text-[9px] text-white/30 font-black uppercase mt-0.5">{history.courses.length} Units Processed</p>
                    </div>
                    <div className="bg-accent-blue text-[#0F172A] w-12 h-12 rounded-xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                       {history.gpa}
                    </div>
                 </div>
               ))}
               {(!user.gpaHistory || user.gpaHistory.length === 0) && (
                 <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">DRIVE EMPTY</p>
                 </div>
              )}
            </div>
         </section>
      </div>
    </div>
  );
}
