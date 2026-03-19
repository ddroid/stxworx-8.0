import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, MessageCircle, MoreHorizontal, Plus, Search, Send } from 'lucide-react';
import {
  formatAddress,
  formatRelativeTime,
  getConversationMessages,
  getConversations,
  getCurrentUser,
  sendConversationMessage,
  toDisplayName,
  type ApiConversation,
  type ApiConversationMessage,
} from '../lib/api';

export const MessagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiConversationMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const requestedConversationId = useMemo(() => {
    const rawValue = searchParams.get('conversation');
    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const [me, conversationList] = await Promise.all([
        getCurrentUser(),
        getConversations(),
      ]);

      setCurrentUserId(me.user.id);
      setConversations(conversationList);
      setSelectedChat((current) => {
        if (requestedConversationId && conversationList.some((conversation) => conversation.id === requestedConversationId)) {
          return requestedConversationId;
        }

        if (current && conversationList.some((conversation) => conversation.id === current)) {
          return current;
        }

        return conversationList[0]?.id || null;
      });
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [requestedConversationId]);

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const response = await getConversationMessages(conversationId);
      setMessages(response);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (requestedConversationId && requestedConversationId !== selectedChat) {
      setSelectedChat(requestedConversationId);
    }
  }, [requestedConversationId, selectedChat]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    if (searchParams.get('conversation') !== String(selectedChat)) {
      setSearchParams({ conversation: String(selectedChat) }, { replace: true });
    }

    loadMessages(selectedChat);
  }, [loadMessages, searchParams, selectedChat, setSearchParams]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadConversations();
        if (selectedChat) {
          loadMessages(selectedChat);
        }
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadConversations, loadMessages, selectedChat]);

  const visibleConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const text = [
        toDisplayName(conversation.participant || null),
        formatAddress(conversation.participant?.stxAddress),
        conversation.participant?.role,
        conversation.lastMessage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [conversations, searchQuery]);

  const currentChat = conversations.find((chat) => chat.id === selectedChat) || null;

  const handleSelectChat = (chatId: number) => {
    setSelectedChat(chatId);
    setSearchParams({ conversation: String(chatId) }, { replace: true });
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setSearchParams({}, { replace: true });
  };

  const handleSend = async () => {
    if (!selectedChat || !message.trim()) {
      return;
    }

    setSending(true);
    try {
      const created = await sendConversationMessage(selectedChat, message.trim());
      setMessages((current) => [...current, created]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedChat
            ? { ...conversation, lastMessage: created.body, lastMessageAt: created.createdAt }
            : conversation,
        ),
      );
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px] h-screen flex flex-col">
      <div className="container-custom flex-1 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="w-10 h-10 bg-surface border border-border rounded-full flex items-center justify-center text-muted hover:text-ink hover:border-ink transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-5xl font-black tracking-tighter">Messages</h1>
        </div>
        
        <div className="flex-1 bg-surface border border-border rounded-[15px] overflow-hidden flex flex-col md:flex-row min-h-[500px]">
          <div className={`w-full md:w-80 border-r border-border flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-border">
              <div className="bg-ink/5 rounded-[15px] px-4 py-2 flex items-center gap-2">
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search messages..."
                  className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="p-4 text-sm text-muted">Loading conversations...</div>
              ) : (
                visibleConversations.map((chat) => {
                  const displayName = toDisplayName(chat.participant || null);
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSelectChat(chat.id)}
                      className={`p-4 border-b border-border/50 cursor-pointer transition-colors flex items-start gap-4 ${selectedChat === chat.id ? 'bg-ink/5' : 'hover:bg-ink/5'}`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-[10px] bg-accent-orange/15 text-accent-orange flex items-center justify-center font-black">
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                        {chat.unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-accent-cyan rounded-full border-2 border-surface"></span>}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-black' : 'font-bold'}`}>{displayName}</h4>
                          <span className="text-[10px] text-muted whitespace-nowrap">{formatRelativeTime(chat.lastMessageAt)}</span>
                        </div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">{chat.participant?.role || 'User'}</p>
                        <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-ink font-bold' : 'text-muted'}`}>{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {!loading && visibleConversations.length === 0 && (
                <div className="p-4 text-sm text-muted">
                  No conversations yet.
                </div>
              )}
            </div>
          </div>

          <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {currentChat ? (
              <>
                <div className="p-6 border-b border-border flex items-center justify-between bg-ink/5">
                  <div className="flex items-center gap-4">
                    <button className="md:hidden text-muted hover:text-ink" onClick={handleBackToList}>
                      <ChevronLeft size={24} />
                    </button>
                    <div className="w-10 h-10 rounded-[10px] bg-accent-orange/15 text-accent-orange flex items-center justify-center font-black">
                      {toDisplayName(currentChat.participant || null).slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{toDisplayName(currentChat.participant || null)}</h3>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{currentChat.participant?.role || 'User'}</p>
                    </div>
                  </div>
                  <button className="text-muted hover:text-ink"><MoreHorizontal size={20} /></button>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
                  <div className="text-center text-[10px] text-muted font-bold uppercase tracking-widest my-4">Today</div>
                  {messages.map((entry) => {
                    const isMine = entry.senderId === currentUserId;
                    return (
                      <div key={entry.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-[15px] text-sm ${isMine ? 'bg-ink text-bg rounded-tr-none' : 'bg-ink/5 text-ink rounded-tl-none border border-border'}`}>
                          <p>{entry.body}</p>
                          <p className={`text-[10px] mt-2 ${isMine ? 'text-bg/70' : 'text-muted'}`}>{formatRelativeTime(entry.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-sm text-muted">No messages yet. Start the conversation below.</div>
                  )}
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-2 bg-ink/5 border border-border rounded-[15px] p-2">
                    <button className="p-2 text-muted hover:text-ink transition-colors"><Plus size={20} /></button>
                    <input 
                      type="text" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..." 
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none px-2" 
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSend();
                        }
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="w-10 h-10 bg-ink text-bg rounded-[15px] flex items-center justify-center hover:scale-105 transition-transform shrink-0 disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted p-6 text-center">
                <MessageCircle size={48} className="mb-4 opacity-20" />
                <h3 className="text-xl font-black mb-2">Your Messages</h3>
                <p className="text-sm">Select a conversation from the list to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
