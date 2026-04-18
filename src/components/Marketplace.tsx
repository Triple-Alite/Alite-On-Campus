import { useState, useEffect, FormEvent } from 'react';
import { User, MarketplaceListing } from '../types';
import { ShoppingBag, Plus, Search, Tag, Phone, ExternalLink, X, Image as ImageIcon, Loader2, Trash2, CheckCircle2, ArrowUpDown, ShoppingCart, Edit3 } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketplaceProps {
  user: User;
}

export default function Marketplace({ user }: MarketplaceProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceListing['category'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [buyingListing, setBuyingListing] = useState<MarketplaceListing | null>(null);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);

  const categories: (MarketplaceListing['category'] | 'all')[] = ['all', 'hostel', 'textbook', 'gadget', 'stationery', 'apparel', 'other'];

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState<MarketplaceListing['category']>('other');
  const [imageUrl, setImageUrl] = useState('');

  const templates = [
    { title: 'Scientific Calculator', price: '15000', category: 'gadget', desc: 'Casio fx-991EX, excellent condition, all functions operative.', img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=402' },
    { title: 'Ergonomic Backpack', price: '12000', category: 'apparel', desc: 'Waterproof, 15.6 inch laptop compartment, multiple storage nodes.', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400' },
    { title: 'Mathematical Set', price: '2500', category: 'stationery', desc: 'Complete geometry set, stainless steel components.', img: 'https://images.unsplash.com/photo-1413708617479-782181beec1d?auto=format&fit=crop&q=80&w=400' },
    { title: 'Premium Pen Set', price: '1000', category: 'stationery', desc: 'Pack of 10 smooth-ink gel pens, assorted colors.', img: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=387' },
  ];

  const applyTemplate = (t: typeof templates[0]) => {
    setTitle(t.title);
    setPrice(t.price);
    setCategory(t.category as any);
    setDescription(t.desc);
    setImageUrl(t.img);
  };

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceListing)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listings');
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    try {
      if (editingListing) {
        await updateDoc(doc(db, 'listings', editingListing.id), {
          title,
          description,
          price: Number(price),
          contact,
          category,
          imageUrl: imageUrl || 'https://picsum.photos/seed/gadget/400/300',
        });
      } else {
        await addDoc(collection(db, 'listings'), {
          title,
          description,
          price: Number(price),
          contact,
          category,
          imageUrl: imageUrl || 'https://picsum.photos/seed/gadget/400/300',
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setIsAdding(false);
      setEditingListing(null);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'listings');
    } finally {
      setIsPosting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setContact('');
    setImageUrl('');
    setCategory('other');
  };

  const handleEdit = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setTitle(listing.title);
    setDescription(listing.description);
    setPrice(listing.price.toString());
    setContact(listing.contact);
    setCategory(listing.category);
    setImageUrl(listing.imageUrl);
    setIsAdding(true);
  };

  const deleteListing = async (id: string) => {
     try {
       await deleteDoc(doc(db, 'listings', id));
     } catch (err) {
       console.error(err);
     }
  };

  const filteredListings = listings
    .filter(l => {
      const matchesSearch = l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           l.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || l.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
         <div>
            <h1 className="text-2xl font-black text-white">Market Hub 🛒</h1>
            <p className="text-white/60 font-medium italic text-sm">Peer-to-peer commerce node active.</p>
         </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const isAuthorized = user.role === 'student-seller' || user.role === 'admin';
                if (isAuthorized) {
                  setIsAdding(true);
                  setErrorStatus(null);
                } else {
                  setErrorStatus("Seller Protocol Required: Upgrade your profile to list items.");
                  setTimeout(() => setErrorStatus(null), 5000);
                }
              }}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black transition-all shadow-xl uppercase text-[10px] tracking-[0.1em] ${
                (user.role === 'student-seller' || user.role === 'admin')
                  ? 'bg-accent-green text-[#0F172A] shadow-accent-green/20'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              <Plus className="w-4 h-4" />
              New Entry
            </motion.button>
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-2 md:px-0">
        <div className="relative group flex-1">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent-blue w-5 h-5 transition-colors" />
           <input 
             type="text" 
             placeholder="INDEX SEARCH ITEMS..." 
             className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-accent-blue focus:outline-none font-bold text-sm tracking-tight placeholder:text-white/20"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl items-center">
          <button 
            onClick={() => setSortBy('newest')}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'bg-accent-blue text-[#0F172A]' : 'text-white/40 hover:text-white'}`}
          >
            Newest
          </button>
          <button 
            onClick={() => setSortBy('price-asc')}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${sortBy === 'price-asc' ? 'bg-accent-blue text-[#0F172A]' : 'text-white/40 hover:text-white'}`}
          >
            Price <ArrowUpDown className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setSortBy('price-desc')}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${sortBy === 'price-desc' ? 'bg-accent-blue text-[#0F172A]' : 'text-white/40 hover:text-white'}`}
          >
            Price <ArrowUpDown className="w-3 h-3 rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 px-2 md:px-0 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
              selectedCategory === cat 
                ? 'bg-accent-blue/20 text-accent-blue border-accent-blue shadow-[0_0_15px_rgba(30,144,255,0.2)]' 
                : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 flex justify-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-accent-blue" />
        </motion.div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredListings.map((listing, index) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={listing.id} 
              className="glass-panel rounded-3xl overflow-hidden hover:bg-white/5 transition-all flex flex-col group h-full border-white/10 shadow-xl"
            >
                <div className="relative h-48 overflow-hidden bg-[#0F172A]/50">
                   <img 
                     src={listing.imageUrl} 
                     alt={listing.title} 
                     className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 blur-[0.5px] group-hover:blur-0"
                     referrerPolicy="no-referrer"
                   />
                   <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-accent-blue/80 backdrop-blur-md text-[#0F172A] text-[9px] font-black uppercase rounded-lg shadow-sm tracking-widest">
                         {listing.category}
                      </span>
                   </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                   <div className="flex justify-between items-start mb-2 gap-2">
                      <h4 className="font-black text-white uppercase tracking-tight text-sm truncate flex-1 group-hover:text-accent-blue transition-colors">{listing.title}</h4>
                      <div className="text-right">
                         <p className="text-accent-green font-black whitespace-nowrap text-lg tracking-tighter leading-none">₦{listing.price.toLocaleString()}</p>
                         <p className="text-[8px] text-white/20 font-black uppercase tracking-widest mt-1">Direct Exchange</p>
                      </div>
                   </div>
                   <p className="text-white/40 text-[11px] mb-6 line-clamp-3 font-medium flex-1 leading-relaxed">{listing.description}</p>
                   
                   <div className="flex gap-2">
                      <button 
                        onClick={() => setBuyingListing(listing)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent-blue text-[#0F172A] rounded-xl font-black text-[10px] uppercase hover:bg-sky-400 transition-all shadow-lg shadow-accent-blue/10"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        BUY
                      </button>
                      {(listing.uploadedBy === user.uid || user.role === 'admin') && (
                        <div className="flex gap-1">
                           <button 
                             onClick={() => handleEdit(listing)}
                             className="flex items-center justify-center p-3 text-accent-green bg-accent-green/10 hover:bg-accent-green/20 border border-accent-green/20 rounded-xl transition-all"
                             title="SELL: Edit Listing"
                           >
                             <Edit3 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => deleteListing(listing.id)}
                             className="flex items-center justify-center p-3 text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-xl transition-all"
                             title="SELL: Delete Listing"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      )}
                   </div>
                </div>
             </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {isAdding && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-xl overflow-y-auto"
           >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-panel rounded-3xl p-8 w-full max-w-lg shadow-2xl border-white/20 my-8"
              >
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">
                   {editingListing ? 'Update Listing' : 'Commerce Entry'}
                 </h3>
                 <button onClick={() => { setIsAdding(false); setEditingListing(null); resetForm(); }} className="text-white/30 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
               </div>

               <div className="mb-8">
                 <label className="block text-[10px] font-black text-white/30 uppercase mb-3">Quick Templates</label>
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {templates.map((t, i) => (
                     <button 
                       key={i}
                       type="button"
                       onClick={() => applyTemplate(t)}
                       className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl whitespace-nowrap text-[10px] font-black text-white/50 hover:text-accent-blue hover:border-accent-blue transition-all uppercase"
                     >
                       {t.title}
                     </button>
                   ))}
                 </div>
               </div>
               <form onSubmit={handlePost} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Item Designation</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MacBook Air M1" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Price (₦)</label>
                        <input required type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 15000" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-black" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Classification</label>
                        <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-black bg-[#0F172A]">
                           <option value="hostel">HOSTEL</option>
                           <option value="textbook">TEXTBOOK</option>
                           <option value="gadget">GADGET</option>
                           <option value="stationery">STATIONERY</option>
                           <option value="apparel">APPAREL</option>
                           <option value="other">OTHER</option>
                        </select>
                     </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Technical Description</label>
                    <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Functional status, physical condition, age of item, and any known issues..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white text-sm font-medium resize-none"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-white/30 uppercase mb-2">WhatsApp Protocol (No)</label>
                        <input required value={contact} onChange={e => setContact(e.target.value)} placeholder="e.g. 2348012345678" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-medium" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-white/30 uppercase mb-2">Visual Descriptor (URL)</label>
                        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Direct link to item image..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-accent-blue outline-none text-white font-medium" />
                    </div>
                  </div>
                  <button 
                    disabled={isPosting}
                    type="submit" 
                    className="w-full py-4 bg-accent-blue text-[#0F172A] font-black rounded-2xl shadow-xl shadow-accent-blue/10 mt-6 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingListing ? 'SAVE CHANGES' : 'PUBLISH TO MARKET')}
                  </button>
               </form>
            </motion.div>
         </motion.div>
        )}
      </AnimatePresence>

      {!loading && filteredListings.length === 0 && (
        <div className="py-12 text-center space-y-12 px-2">
           <div className="space-y-4">
              <ShoppingBag className="w-16 h-16 mx-auto text-white/10" />
              <p className="text-white/40 font-bold uppercase tracking-widest text-sm text-center italic">
                {searchTerm ? 'PRODUCT NOT AVAILABLE' : 'MARKET EMPTY • NO NODES FOUND'}
              </p>
              <button onClick={() => setSearchTerm('')} className="text-accent-blue font-black hover:underline text-xs">RESET SCRUBBER</button>
           </div>

           <div className="max-w-4xl mx-auto space-y-6">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Marketplace Prototypes</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                 {templates.map((t, i) => (
                   <div key={i} className="glass-panel p-4 rounded-2xl border-white/5 space-y-3 text-left">
                      <img src={t.img} className="w-full h-24 object-cover rounded-lg" alt={t.title} />
                      <div>
                        <p className="text-[10px] font-black text-white uppercase truncate">{t.title}</p>
                        <p className="text-accent-green font-black text-xs">₦{Number(t.price).toLocaleString()}</p>
                      </div>
                   </div>
                 ))}
              </div>
              <p className="text-[9px] text-white/20 font-medium italic">These are examples of items you can list as a seller.</p>
           </div>
        </div>
      )}
      <AnimatePresence>
        {buyingListing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center space-y-6 border-white/20"
            >
              <div className="w-20 h-20 bg-accent-blue/20 rounded-full flex items-center justify-center mx-auto">
                <ShoppingCart className="w-10 h-10 text-accent-blue" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase">Initialize Purchase</h3>
                <p className="text-white/40 text-xs font-medium px-4">You are about to contact the student seller for <span className="text-accent-blue font-bold">{buyingListing.title}</span>.</p>
              </div>
              <div className="flex flex-col gap-2">
                <a 
                  href={`https://wa.me/${buyingListing.contact}?text=Hi, I am interested in buying your ${buyingListing.title} listed on Alite Campus OS for ₦${buyingListing.price.toLocaleString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setBuyingListing(null)}
                  className="w-full py-4 bg-accent-green text-[#0F172A] font-black rounded-2xl flex items-center justify-center gap-2 text-xs uppercase hover:brightness-110 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Proceed to WhatsApp
                </a>
                <button 
                  onClick={() => setBuyingListing(null)}
                  className="w-full py-4 bg-white/5 text-white/40 font-black rounded-2xl text-xs uppercase hover:text-white transition-all"
                >
                  Abort Transmission
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
