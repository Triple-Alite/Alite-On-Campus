import React, { useState, useEffect } from 'react';
import { User, Note } from '../types';
import { Search, Plus, Filter, Download, ThumbsUp, FileText, User as UserIcon, Calendar, Loader2, X, Image as ImageIcon, ChevronLeft, ChevronRight, LayoutGrid, Trash2, FileUp, Paperclip } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface NotesProps {
  user: User;
}

export default function Notes({ user }: NotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  // Gallery State
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'gallery'>('grid');
  
  // Upload Form State
  interface UploadItem {
    id: string;
    title: string;
    courseCode: string;
    type: 'note' | 'past_question';
    resourceFile: File | null;
    imageFile: File | null;
    imagePreview: string | null;
    externalUrl: string;
  }

  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);

  const addQueueItem = () => {
    setUploadQueue([...uploadQueue, {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      courseCode: '',
      type: 'note',
      resourceFile: null,
      imageFile: null,
      imagePreview: null,
      externalUrl: ''
    }]);
  };

  const updateQueueItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeQueueItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    if (isUploading && uploadQueue.length === 0) {
      addQueueItem();
    }
  }, [isUploading]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = uploadQueue.filter(item => (item.resourceFile || item.externalUrl) && item.title && item.courseCode);
    if (validItems.length === 0) return;
    
    setIsPosting(true);

    try {
      await Promise.all(validItems.map(async (item) => {
        let finalFileUrl = item.externalUrl;
        let finalImageUrl = '';

        // 1. Upload Resource File if present
        if (item.resourceFile) {
          const resourceRef = ref(storage, `notes/${user.uid}/files/${Date.now()}_${item.resourceFile.name}`);
          const resourceSnapshot = await uploadBytes(resourceRef, item.resourceFile);
          finalFileUrl = await getDownloadURL(resourceSnapshot.ref);
        }

        // 2. Upload Representative Image if present
        if (item.imageFile) {
          const imageRef = ref(storage, `notes/${user.uid}/images/${Date.now()}_${item.imageFile.name}`);
          const imageSnapshot = await uploadBytes(imageRef, item.imageFile);
          finalImageUrl = await getDownloadURL(imageSnapshot.ref);
        }

        // 3. Save to Firestore
        await addDoc(collection(db, 'notes'), {
          title: item.title,
          courseCode: item.courseCode.toUpperCase(),
          type: item.type,
          fileUrl: finalFileUrl,
          imageUrl: finalImageUrl || undefined,
          uploadedBy: user.uid,
          authorName: user.name,
          likes: [],
          createdAt: serverTimestamp(),
          school: user.school || 'Campus'
        });
      }));

      setIsUploading(false);
      setUploadQueue([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notes');
    } finally {
      setIsPosting(false);
    }
  };

  const onFileChange = (id: string, file: File, field: 'resource' | 'image') => {
    if (field === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateQueueItem(id, { imageFile: file, imagePreview: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      updateQueueItem(id, { resourceFile: file });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleLike = async (note: Note) => {
    const noteRef = doc(db, 'notes', note.id);
    const hasLiked = note.likes.includes(user.uid);
    try {
      await updateDoc(noteRef, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const galleryNotes = filteredNotes.filter(n => !!n.imageUrl);

  const openGallery = (noteId: string) => {
    const index = galleryNotes.findIndex(n => n.id === noteId);
    if (index !== -1) setGalleryIndex(index);
  };

  const nextGallery = () => {
    if (galleryIndex !== null) {
      setGalleryIndex((galleryIndex + 1) % galleryNotes.length);
    }
  };

  const prevGallery = () => {
    if (galleryIndex !== null) {
      setGalleryIndex((galleryIndex - 1 + galleryNotes.length) % galleryNotes.length);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-black text-white">Study Vault 📡</h1>
            <p className="text-white/60 font-medium">Remote material synchronization active.</p>
         </div>
         <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-white/5 p-1 rounded-xl border border-white/10">
               <button 
                 onClick={() => setViewMode('grid')}
                 title="Grid View"
                 className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent-blue text-[#0F172A]' : 'text-white/40 hover:text-white'}`}
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('gallery')}
                 title="Media Gallery"
                 className={`p-2 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-accent-blue text-[#0F172A]' : 'text-white/40 hover:text-white'}`}
               >
                 <ImageIcon className="w-4 h-4" />
               </button>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUploading(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-accent-green text-[#0F172A] rounded-xl font-black transition-all shadow-lg shadow-accent-green/10 uppercase text-[10px] tracking-widest"
            >
              <Plus className="w-4 h-4" />
              New Upload
            </motion.button>
         </div>
      </div>

      <div className="relative group">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent-blue w-5 h-5 transition-colors" />
         <input 
           type="text" 
           placeholder="SCAN FOR COURSE CODE..." 
           className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-blue focus:outline-none shadow-inner font-bold text-sm tracking-tight placeholder:text-white/20"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <AnimatePresence>
        {galleryIndex !== null && galleryNotes[galleryIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0F172A]/95 backdrop-blur-3xl flex flex-col"
          >
             {/* Header */}
             <div className="p-6 flex items-center justify-between">
                <div>
                   <h3 className="text-white font-black uppercase tracking-tight">{galleryNotes[galleryIndex].courseCode}</h3>
                   <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{galleryNotes[galleryIndex].title}</p>
                </div>
                <button onClick={() => setGalleryIndex(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                   <X className="w-6 h-6" />
                </button>
             </div>

             {/* Image */}
             <div className="flex-1 flex items-center justify-center p-4 relative">
                <button 
                  onClick={prevGallery}
                  className="absolute left-4 z-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
                >
                   <ChevronLeft className="w-8 h-8" />
                </button>

                <motion.img 
                  key={galleryNotes[galleryIndex].id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={galleryNotes[galleryIndex].imageUrl} 
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                  alt="Gallery"
                  referrerPolicy="no-referrer"
                />

                <button 
                  onClick={nextGallery}
                  className="absolute right-4 z-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
                >
                   <ChevronRight className="w-8 h-8" />
                </button>
             </div>

             {/* Footer Info */}
             <div className="p-8 bg-black/20 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-accent-blue flex items-center justify-center border border-white/10 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${galleryNotes[galleryIndex].authorName}`} alt="avatar" />
                   </div>
                   <div>
                      <p className="text-white font-black text-xs uppercase italic">{galleryNotes[galleryIndex].authorName}</p>
                      <p className="text-white/30 text-[9px] font-black uppercase tracking-tighter">Contributor Archive Alpha</p>
                   </div>
                </div>
                
                <div className="flex items-center gap-4">
                   <a 
                     href={galleryNotes[galleryIndex].fileUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="px-8 py-4 bg-accent-blue text-[#0F172A] rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                   >
                      <Download className="w-4 h-4" />
                      FETCH DATA
                   </a>
                </div>
             </div>

             {/* Counter */}
             <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/40 font-black tracking-widest uppercase">
                {galleryIndex + 1} / {galleryNotes.length}
             </div>
          </motion.div>
        )}

        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-2xl overflow-y-auto"
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="glass-panel rounded-[2rem] p-6 md:p-10 w-full max-w-2xl shadow-2xl border-white/20 my-8"
             >
                <div className="flex justify-between items-center mb-8">
                   <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Vault Submission</h3>
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Synchronization Queue: {uploadQueue.length} Units</p>
                   </div>
                   <button onClick={() => setIsUploading(false)} className="p-2 text-white/30 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleUpload} className="space-y-8">
                   <div className="max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar space-y-8">
                      {uploadQueue.map((item, index) => (
                        <div key={item.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl relative group/item">
                           <div className="absolute -top-3 -right-3">
                              {uploadQueue.length > 1 && (
                                <button 
                                  type="button"
                                  onClick={() => removeQueueItem(item.id)}
                                  className="p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/item:opacity-100 transition-opacity active:scale-95"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                           </div>

                           <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Resource Title</label>
                                    <input 
                                      value={item.title} 
                                      onChange={e => updateQueueItem(item.id, { title: e.target.value })} 
                                      required 
                                      placeholder="e.g. Quantum Physics Vol 1" 
                                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-medium" 
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Course Index</label>
                                       <input 
                                         value={item.courseCode} 
                                         onChange={e => updateQueueItem(item.id, { courseCode: e.target.value })} 
                                         required 
                                         placeholder="PHY101" 
                                         className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-black uppercase text-center" 
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Type</label>
                                       <select 
                                         value={item.type} 
                                         onChange={e => updateQueueItem(item.id, { type: e.target.value as any })} 
                                         className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-black bg-[#0F172A] uppercase"
                                       >
                                          <option value="note">LECTURE NOTE</option>
                                          <option value="past_question">PAST QUESTION</option>
                                       </select>
                                    </div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Primary Payload (File or URL)</label>
                                    <div className="flex gap-2">
                                       <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                          <Paperclip className={`w-4 h-4 ${item.resourceFile ? 'text-accent-green' : 'text-white/40'}`} />
                                          <span className="text-[10px] font-black text-white/40 uppercase truncate">
                                             {item.resourceFile ? item.resourceFile.name : 'Attach File'}
                                          </span>
                                          <input 
                                            type="file" 
                                            onChange={(e) => e.target.files?.[0] && onFileChange(item.id, e.target.files[0], 'resource')} 
                                            className="hidden" 
                                          />
                                       </label>
                                       <input 
                                         value={item.externalUrl} 
                                         onChange={e => updateQueueItem(item.id, { externalUrl: e.target.value })} 
                                         placeholder="OR Paste URL..." 
                                         className="flex-[1.5] px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white text-[10px] font-medium italic" 
                                       />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase mb-2">Metadata Visualization (Ops)</label>
                                    <div className="flex items-center gap-4">
                                       <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                          <ImageIcon className={`w-4 h-4 ${item.imageFile ? 'text-accent-blue' : 'text-white/40'}`} />
                                          <span className="text-[10px] font-black text-white/40 uppercase">Thumbnail</span>
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => e.target.files?.[0] && onFileChange(item.id, e.target.files[0], 'image')} 
                                            className="hidden" 
                                          />
                                       </label>
                                       {item.imagePreview && (
                                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                             <img src={item.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>

                   <button 
                     type="button" 
                     onClick={addQueueItem}
                     className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/30 font-black uppercase text-[10px] tracking-widest hover:border-accent-blue/40 hover:text-accent-blue transition-all"
                   >
                      <Plus className="w-4 h-4" />
                      Append to Synchronization Queue
                   </button>

                   <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
                      <button 
                        disabled={isPosting}
                        type="submit" 
                        className="w-full py-5 bg-accent-blue text-[#0F172A] font-black rounded-2xl shadow-xl shadow-accent-blue/20 uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         {isPosting ? (
                           <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              INITIATING MULTI-STREAM UPLOAD...
                           </>
                         ) : 'AUTHORIZE SYNCHRONIZATION'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsUploading(false)} 
                        className="w-full py-3 font-black text-white/20 hover:text-white uppercase text-[8px] tracking-[0.2em] transition-colors"
                      >
                         Abort Mission / Flush Queue
                      </button>
                   </div>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent-blue" /></div>
      ) : viewMode === 'gallery' ? (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {galleryNotes.map((note) => (
             <motion.div 
               key={note.id}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               onClick={() => openGallery(note.id)}
               className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-accent-blue/50 transition-colors"
             >
                <img 
                  src={note.imageUrl} 
                  alt={note.title} 
                  className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <span className="text-accent-blue text-[8px] font-black uppercase tracking-[0.2em] mb-1">{note.courseCode}</span>
                  <p className="text-white text-[10px] font-black uppercase line-clamp-2 leading-tight">{note.title}</p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                    <span className="text-white/40 text-[8px] font-bold uppercase">{note.authorName}</span>
                  </div>
                </div>
             </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredNotes.map((note) => (
             <div key={note.id} className="glass-panel rounded-2xl overflow-hidden hover:bg-white/10 border-white/10 transition-all flex flex-col group">
                {note.imageUrl && (
                  <div 
                    onClick={() => openGallery(note.id)}
                    className="h-40 overflow-hidden bg-[#0F172A]/50 border-b border-white/5 cursor-pointer relative"
                  >
                    <img 
                      src={note.imageUrl} 
                      alt={note.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-accent-blue/0 group-hover:bg-accent-blue/10 transition-colors flex items-center justify-center">
                       <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8" />
                    </div>
                  </div>
                )}
                <div className="p-6 flex-1 space-y-4">
                   <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        note.type === 'note' ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue' : 'bg-accent-green/10 border-accent-green/20 text-accent-green'
                      }`}>
                        {note.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-bold text-white/40 flex items-center gap-1 uppercase">
                         <Calendar className="w-3 h-3" />
                         {note.createdAt ? format(note.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}
                      </span>
                   </div>
                   
                   <div 
                     onClick={() => note.imageUrl && openGallery(note.id)}
                     className="cursor-pointer group/title"
                   >
                      <h4 className="font-black text-white uppercase text-sm tracking-tight mb-1 group-hover/title:text-accent-blue transition-colors">{note.courseCode}</h4>
                      <p className="text-white/60 font-medium line-clamp-2 text-xs leading-relaxed">{note.title}</p>
                   </div>

                   <div className="flex items-center gap-2 pt-2">
                      <div className="w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center overflow-hidden border border-white/10">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${note.authorName}`} alt="u" />
                      </div>
                      <span className="text-[10px] text-white/50 font-black uppercase tracking-tighter truncate">{note.authorName}</span>
                   </div>
                </div>

                <div className="p-4 bg-white/5 flex items-center gap-2 border-t border-white/10">
                    <button 
                      onClick={() => toggleLike(note)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all border ${
                        note.likes.includes(user.uid) 
                        ? 'bg-accent-green text-[#0F172A] border-accent-green active:scale-95' 
                        : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${note.likes.includes(user.uid) ? 'fill-current' : ''}`} />
                      {note.likes.length} VOTES
                    </button>
                    <a 
                      href={note.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent-blue text-[#0F172A] rounded-xl font-black text-[10px] uppercase hover:bg-emerald-400 transition-all border border-transparent"
                    >
                      <Download className="w-3 h-3" />
                      VIEW
                    </a>
                </div>
             </div>
           ))}
        </div>
      )}

      {!loading && filteredNotes.length === 0 && (
        <div className="py-20 text-center space-y-4">
           <FileText className="w-16 h-16 mx-auto text-white/10" />
           <p className="text-white/40 font-bold uppercase tracking-widest text-sm text-center italic">DATABASE EMPTY • SCAN TERMINATED</p>
           <button onClick={() => setSearchTerm('')} className="text-accent-blue font-black hover:underline text-xs">RESET SCRUBBER</button>
        </div>
      )}
       <AnimatePresence>
        {errorStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 right-2 z-[70] p-4 bg-red-400/10 border border-red-400/20 backdrop-blur-md rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-tight max-w-[200px]"
          >
            ⚠️ {errorStatus}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
