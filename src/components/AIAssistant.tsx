import { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { GoogleGenAI } from '@google/genai';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantProps {
  user: User;
}

const AI_PROMPT = `
You are Alite AI, a brilliant and supportive academic assistant for Nigerian university students.
Your tone is encouraging, helpful, and sometimes relates to the Nigerian campus experience (use light pidgin if appropriate/funny, but stay professional for complex explanations).

Goals:
1. Explain academic topics (Math, Physics, Law, Eng, etc.) simply.
2. Provide study tips tailored for various fields of study.
3. Suggest how to tackle specific courses if a course code is mentioned.

Current Student Context:
Name: \${user.name}
School: \${user.school || 'Unspecified'}
Department: \${user.department || 'General Studies'}

Keep answers concise but informative. Use Markdown for formatting.
`;

export default function AIAssistant({ user }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: inputValue }] }],
        config: {
          systemInstruction: AI_PROMPT.replace('\${user.name}', user.name).replace('\${user.school}', user.school || '').replace('\${user.department}', user.department || '')
        }
      });

      const aiText = response.text;
      if (aiText) {
        setMessages(prev => [...prev, { role: 'model', text: aiText }]);
      }
    } catch (err) {
      console.error('AI Error', err);
      setMessages(prev => [...prev, { role: 'model', text: "Omo, something went wrong with my brain. Please try again later! 😅" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      <div className="glass-panel p-4 border-white/10 rounded-2xl flex items-center justify-between shadow-xl">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-blue/20 border border-accent-blue/30 rounded-xl flex items-center justify-center">
               <Sparkles className="w-6 h-6 text-accent-blue" />
            </div>
            <div>
               <h2 className="font-black text-white uppercase tracking-tight">Neural Assistant</h2>
               <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em]">Gemini-3 Operational</p>
            </div>
         </div>
         <div className="px-3 py-1 bg-accent-green/10 text-accent-green text-[9px] font-black rounded-lg border border-accent-green/20 uppercase tracking-widest">ACTIVE</div>
      </div>

      <div ref={scrollRef} className="flex-1 glass-panel border-white/10 rounded-3xl overflow-y-auto p-6 space-y-6 shadow-2xl relative bg-black/20">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-6"
            >
               <Brain className="w-20 h-20 text-white/5 animate-pulse" />
               <div className="space-y-2">
                  <p className="font-black text-white uppercase tracking-tight text-xl italic">Awaiting Input Signal...</p>
                  <p className="text-[10px] text-white/40 max-w-xs mx-auto font-black uppercase tracking-widest leading-relaxed">Neural processing unit ready for academic inquiries, campus guidance, or study optimization.</p>
               </div>
               <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-8">
                  <button onClick={() => setInputValue("Explain photosynthesis simply")} className="p-4 glass-panel border-white/5 rounded-2xl text-[10px] font-black text-white/60 hover:text-accent-blue hover:border-accent-blue/30 transition-all uppercase tracking-widest">Photosynthesis</button>
                  <button onClick={() => setInputValue("Study tips for engineering students")} className="p-4 glass-panel border-white/5 rounded-2xl text-[10px] font-black text-white/60 hover:text-accent-blue hover:border-accent-blue/30 transition-all uppercase tracking-widest">Engineering</button>
               </div>
            </motion.div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl flex gap-3 shadow-lg ${
                m.role === 'user' 
                  ? 'bg-accent-blue text-[#0F172A] rounded-tr-none font-bold' 
                  : 'bg-white/10 text-white backdrop-blur-md border border-white/10 rounded-tl-none'
              }`}>
                {m.role === 'model' && <Bot className="w-4 h-4 shrink-0 mt-1 text-accent-blue" />}
                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                {m.role === 'user' && <UserIcon className="w-4 h-4 shrink-0 mt-1 opacity-40" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
               <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce [animation-delay:0.4s]"></div>
               </div>
               <span className="text-[10px] font-black text-white/20 tracking-[0.3em] uppercase">Processing</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 glass-panel border-white/20 rounded-3xl flex items-center gap-2 shadow-2xl focus-within:ring-1 focus-within:ring-accent-blue/50 transition-all">
         <input 
           value={inputValue}
           onChange={e => setInputValue(e.target.value)}
           onKeyDown={e => e.key === 'Enter' && handleSend()}
           placeholder="Query the system (courses, exams, campus life)..." 
           className="flex-1 px-5 py-4 bg-transparent outline-none font-bold text-sm text-white placeholder:text-white/20" 
         />
         <button 
           onClick={handleSend}
           disabled={isLoading || !inputValue.trim()}
           className="p-4 bg-accent-blue text-[#0F172A] rounded-2xl disabled:opacity-20 hover:scale-105 transition-all active:scale-95 shadow-lg shadow-accent-blue/20"
         >
           <Send className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
}
