import { useState, useEffect, FormEvent } from 'react';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { User, Note, MarketplaceListing, TimetableEntry } from './types';
import { LogIn, LayoutDashboard, Notebook, Calculator, Calendar, ShoppingBag, MessageSquare, LogOut, Loader2, Plus, Search, ChevronRight, Menu, X, Mail, Phone, User as UserIcon, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Dashboard from './components/Dashboard';
import Notes from './components/Notes';
import GPACalculator from './components/GPACalculator';
import Timetable from './components/Timetable';
import Marketplace from './components/Marketplace';
import AIAssistant from './components/AIAssistant';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'role' | 'method' | 'form'>('role');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'student' | 'student-seller'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as User);
        } else {
          // New user registration inherits selected role
          const newUser: User = {
            uid: fbUser.uid,
            name: name || fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            phoneNumber: phone || fbUser.phoneNumber || '',
            role: selectedRole as any,
            school: '',
            department: '',
            gpaHistory: []
          };
          try {
            await setDoc(doc(db, 'users', fbUser.uid), newUser);
            setCurrentUser(newUser);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'users');
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedRole, name, phone]);

  const handleGoogleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error('Login Error', e);
      if (e.code === 'auth/popup-blocked') {
        setLoginError('Sign-in popup was blocked. Please allow popups.');
      } else {
        setLoginError(e.message || 'Error communicating with Google.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      if (authMode === 'register') {
        if (!name.trim()) throw new Error('Name is required');
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth Error', err);
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4 selection:bg-accent-blue/30 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center flex-col items-center">
             <div className="w-20 h-20 bg-accent-blue rounded-3xl flex items-center justify-center shadow-2xl shadow-accent-blue/20 mb-6">
                <LayoutDashboard className="w-10 h-10 text-[#0F172A]" />
             </div>
             <h1 className="text-4xl font-black text-white tracking-tight uppercase italic">ALITE ON <span className="text-accent-blue">CAMPUS</span></h1>
             <p className="mt-4 text-white/40 font-bold uppercase tracking-widest text-xs">Neural Network Interface Active</p>
          </div>

          <div id="recaptcha-container"></div>
          
          <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 shadow-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {authStep === 'role' && (
                <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Select Designation</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => { setSelectedRole('student'); setAuthStep('method'); }}
                      className="p-6 glass-panel border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group"
                    >
                      <UserIcon className="w-8 h-8 text-accent-blue group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <p className="font-black text-white uppercase text-xs">Standard Student</p>
                        <p className="text-[10px] text-white/40 font-medium">Access tools, notes, & marketplace.</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setSelectedRole('student-seller'); setAuthStep('method'); }}
                      className="p-6 glass-panel border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group"
                    >
                      <Store className="w-8 h-8 text-accent-green group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <p className="font-black text-white uppercase text-xs">Student & Seller</p>
                        <p className="text-[10px] text-white/40 font-medium">Access all tools + list items for sale.</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {authStep === 'method' && (
                <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setAuthStep('role')} className="text-white/40 hover:text-white transition-colors text-xs font-bold uppercase">← Role Selection</button>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight mb-8">Verification Protocol</h2>
                  
                  <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Google Identity
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black text-white/20 px-2 bg-[#0F172A] w-max mx-auto">Neural Credentials</div>
                  </div>

                  <button onClick={() => { setAuthMode('login'); setAuthStep('form'); }} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest">
                    <LogIn className="w-5 h-5 text-accent-blue" />
                    Direct Login
                  </button>

                  <button onClick={() => { setAuthMode('register'); setAuthStep('form'); }} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-black rounded-2xl hover:bg-accent-blue/20 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest">
                    <Plus className="w-5 h-5" />
                    New Node Registration
                  </button>
                </motion.div>
              )}

              {authStep === 'form' && (
                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <button onClick={() => setAuthStep('method')} className="text-white/40 hover:text-white transition-colors text-xs font-bold uppercase">← Methods</button>
                    <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">{authMode} Mode</span>
                  </div>
                  
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'register' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <input 
                          required 
                          placeholder="FULL NAME" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-accent-blue font-black text-xs uppercase" 
                        />
                        <input 
                          placeholder="PHONE (OPTIONAL)" 
                          value={phone} 
                          onChange={e => setPhone(e.target.value)} 
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-accent-blue font-black text-xs" 
                        />
                      </div>
                    )}
                    <input 
                      required 
                      type="email" 
                      placeholder="EMAIL ADDRESS" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-accent-blue font-black text-xs uppercase" 
                    />
                    <input 
                      required 
                      type="password" 
                      placeholder="SECURE PASSWORD" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-accent-blue font-black text-xs" 
                    />
                    
                    <button 
                      disabled={loginLoading} 
                      className="w-full py-5 bg-accent-blue text-[#0F172A] font-black rounded-2xl uppercase text-[10px] tracking-[0.25em] shadow-lg shadow-accent-blue/20 mt-4 active:scale-95 transition-all"
                    >
                      {authMode === 'register' ? 'Initialize Node' : 'Initialize Session'}
                    </button>

                    <button 
                      type="button"
                      onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      className="w-full text-[10px] font-black text-white/20 uppercase hover:text-white transition-colors text-center"
                    >
                      {authMode === 'login' ? "Don't have a node? Create one" : "Already verified? Resume session"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {loginLoading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                <Loader2 className="w-10 h-10 animate-spin text-accent-blue" />
              </div>
            )}
          </div>

          {loginError && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-400/10 border border-red-400/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-tight leading-relaxed">
              ⚠️ {loginError}
              <button onClick={() => setLoginError(null)} className="block mt-2 underline opacity-50 hover:opacity-100">Dismiss Alert</button>
            </motion.div>
          )}
          
          <div className="grid grid-cols-2 gap-3 text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">
             <div className="p-4 glass-panel border-white/5 rounded-2xl">Vault Active</div>
             <div className="p-4 glass-panel border-white/5 rounded-2xl">GPA Node Up</div>
             <div className="p-4 glass-panel border-white/5 rounded-2xl">Market Sync</div>
             <div className="p-4 glass-panel border-white/5 rounded-2xl">Neuro Assistant</div>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'notes', label: 'Study Vault', icon: Notebook },
    { id: 'gpa', label: 'GPA Calc', icon: Calculator },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'market', label: 'Marketplace', icon: ShoppingBag },
    { id: 'ai', label: 'AI Tutor', icon: MessageSquare },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={currentUser} setActiveTab={setActiveTab} />;
      case 'notes': return <Notes user={currentUser} />;
      case 'gpa': return <GPACalculator user={currentUser} />;
      case 'timetable': return <Timetable user={currentUser} />;
      case 'market': return <Marketplace user={currentUser} />;
      case 'ai': return <AIAssistant user={currentUser} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen os-bg flex text-white">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel m-4 rounded-3xl border-white/10">
        <div className="p-6 border-b border-white/10">
           <h2 className="text-xl font-black text-white flex items-center gap-2">
             <div className="w-8 h-8 bg-accent-green rounded-lg flex items-center justify-center">
               <LayoutDashboard className="w-5 h-5 text-[#0F172A]" />
             </div>
             ALITE ON <span className="text-accent-green">CAMPUS</span>
           </h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-accent-green shadow-sm' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-accent-green' : 'text-white/40'}`} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-3 border border-white/5">
             <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center overflow-hidden border border-white/20">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`} alt="avatar" />
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-white/50 truncate capitalize">{currentUser.role}</p>
             </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="md:hidden flex items-center justify-between p-4 glass-panel m-4 mb-0 rounded-2xl h-16 shrink-0 border-white/10">
           <h2 className="text-lg font-black text-white flex items-center gap-2">
             <div className="w-8 h-8 bg-accent-green rounded-lg flex items-center justify-center">
               <LayoutDashboard className="w-5 h-5 text-[#0F172A]" />
             </div>
             ALITE ON <span className="text-accent-green">CAMPUS</span>
           </h2>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/10 rounded-lg">
             {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
           </button>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="absolute inset-0 z-50 md:hidden bg-[#0F172A]/95 backdrop-blur-xl"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-xl font-black text-white tracking-tight">Menu</h2>
                  <button onClick={() => setIsMobileMenuOpen(false)}><X className="text-white" /></button>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                   {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-bold ${
                        activeTab === tab.id ? 'bg-white/10 text-accent-green' : 'text-white/60'
                      }`}
                    >
                      <tab.icon className="w-6 h-6" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
                <div className="p-6 border-t border-white/10">
                   <button onClick={handleLogout} className="w-full py-4 text-red-400 font-bold border border-red-400/20 rounded-xl">Sign Out</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               transition={{ duration: 0.3 }}
               className="max-w-6xl mx-auto"
             >
               {renderContent()}
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
