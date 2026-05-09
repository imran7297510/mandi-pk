import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, onSnapshot, setDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Chat, Message, Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { Send, Image as ImageIcon, MessageCircle, ChevronLeft } from 'lucide-react';
import { formatPKR } from '../lib/utils';
import { Link } from 'react-router-dom';

export function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<(Chat & { listingTitle?: string; listingImage?: string; otherPartyName?: string })[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOffer, setIsOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Fetch user's chats
    const fetchChats = async () => {
      try {
        const qBuyer = query(collection(db, 'chats'), where('buyerId', '==', user.uid));
        const qSeller = query(collection(db, 'chats'), where('sellerId', '==', user.uid));
        
        const [buyerSnap, sellerSnap] = await Promise.all([getDocs(qBuyer), getDocs(qSeller)]);
        const allChats = [...buyerSnap.docs, ...sellerSnap.docs].map(d => ({id: d.id, ...d.data()} as Chat));
        
        // Sort by updatedAt
        allChats.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

        // Get additional info (Listing title)
        const enrichedChats = await Promise.all(allChats.map(async (c) => {
          try {
            const listSnap = await getDocs(query(collection(db, 'listings'), where('__name__', '==', c.listingId)));
            const listing = listSnap.docs[0]?.data() as Listing | undefined;
            return {
              ...c,
              listingTitle: listing?.title || 'Unknown Listing',
              listingImage: listing?.images?.[0] || '',
              otherPartyName: c.buyerId === user.uid ? listing?.sellerName || 'Seller' : 'Buyer'
            };
          } catch {
            return c;
          }
        }));
        
        setChats(enrichedChats);
        if (enrichedChats.length > 0 && !activeChatId) {
          setActiveChatId(enrichedChats[0].id);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'chats');
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!activeChatId || !user) return;
    
    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${activeChatId}/messages`);
    });
    
    return unsubscribe;
  }, [activeChatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && (!isOffer || !offerAmount)) return;
    if (!user || !activeChatId) return;

    try {
      const msgRef = doc(collection(db, 'chats', activeChatId, 'messages'));
      const msgData: any = {
        senderId: user.uid,
        text: newMessage.trim(),
        isOffer,
        createdAt: serverTimestamp()
      };
      
      if (isOffer && offerAmount) {
        msgData.offerAmount = Number(offerAmount);
        msgData.text = `Offered ${formatPKR(Number(offerAmount))}`;
      }
      
      await setDoc(msgRef, msgData);
      
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: msgData.text,
        updatedAt: serverTimestamp()
      });
      
      setNewMessage('');
      setIsOffer(false);
      setOfferAmount('');
    } catch (e) {
      console.error(e);
      alert('Failed to send message.');
    }
  };

  if (!user) return <div className="p-20 text-center">Please log in to view messages.</div>;
  if (loading) return <div className="p-20 text-center">Loading chats...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)]">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 h-full flex overflow-hidden relative">
        
        {/* Chat List */}
        <div className={`w-full md:w-1/3 border-r border-stone-200 flex flex-col overflow-y-auto ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-stone-200 bg-stone-50">
            <h2 className="font-bold text-lg text-stone-900">Your Conversations</h2>
          </div>
          {chats.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">No messages yet.</div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => {
                  setActiveChatId(chat.id);
                  setShowMobileChat(true);
                }}
                className={`p-4 border-b border-stone-100 cursor-pointer hover:bg-stone-50 transition-colors flex gap-3 ${activeChatId === chat.id ? 'bg-amber-50 border-amber-100' : ''}`}
              >
                <div className="w-12 h-12 rounded bg-stone-200 flex-shrink-0 overflow-hidden">
                  {chat.listingImage ? <img src={chat.listingImage} className="w-full h-full object-cover" alt="" /> : null}
                </div>
                <div className="flex-grow overflow-hidden">
                  <div className="font-bold text-stone-900 truncate">{chat.listingTitle}</div>
                  <div className="text-xs font-semibold text-stone-500 mb-1">{chat.otherPartyName}</div>
                  <div className="text-sm text-stone-600 truncate">{chat.lastMessage || 'Start a conversation'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div className={`w-full md:w-2/3 flex flex-col h-full bg-stone-50 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-stone-200 bg-white flex items-center gap-3">
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 -ml-2 text-stone-500 hover:text-stone-900"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex-grow">
                  <div className="font-bold text-lg text-stone-900 truncate">
                    {chats.find(c => c.id === activeChatId)?.listingTitle}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">{chats.find(c => c.id === activeChatId)?.otherPartyName}</span>
                    <span className="w-1 h-1 bg-stone-300 rounded-full" />
                    <Link to={`/listings/${chats.find(c => c.id === activeChatId)?.listingId}`} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-widest">
                      View Listing
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Messages display */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-stone-500 mt-10">No messages yet. Say hi or send an offer!</div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMine ? 'bg-amber-500 text-stone-900 rounded-br-none' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'}`}>
                          {msg.isOffer ? (
                            <div className="font-bold flex items-center gap-2">
                              💰 Offer: {formatPKR(msg.offerAmount || 0)}
                            </div>
                          ) : (
                            <div>{msg.text}</div>
                          )}
                          <div className={`text-[10px] mt-1 ${isMine ? 'text-stone-700 text-right' : 'text-stone-400'}`}>
                            {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              <div className="p-4 bg-white border-t border-stone-200">
                {isOffer && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded">Make Offer:</span>
                    <input 
                      type="number" 
                      placeholder="Amount (Rs)"
                      className="border border-stone-300 rounded px-3 py-1 text-sm focus:outline-none focus:border-amber-500"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                    />
                    <button onClick={() => setIsOffer(false)} className="text-sm text-red-500 ml-auto font-medium">Cancel Offer</button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsOffer(!isOffer)}
                    className={`p-3 rounded-full flex-shrink-0 transition-colors ${isOffer ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                    title="Make an Offer"
                  >
                    💰
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow border border-stone-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={isOffer}
                  />
                  <button 
                    type="submit" 
                    className="p-4 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-2xl flex-shrink-0 transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center p-8 text-stone-500 flex-col">
              <MessageCircle className="w-16 h-16 text-stone-300 mb-4" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
