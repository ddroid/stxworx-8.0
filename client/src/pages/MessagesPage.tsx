import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, MessageCircle, MoreHorizontal, Plus, Search, Send, X } from 'lucide-react';
import {
  formatAddress,
  formatRelativeTime,
  getConnections,
  getConversationMessages,
  getConversations,
  getCurrentUser,
  searchUsersByUsername,
  sendConversationMessage,
  startConversation,
  toApiAssetUrl,
  toDisplayName,
  type ApiConnection,
  type ApiConversationAttachmentInput,
  type ApiConversation,
  type ApiConversationMessage,
  type ApiMentionableUser,
} from '../lib/api';

type ChatCandidate = NonNullable<ApiConnection['otherUser']>;
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MESSAGE_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip';

function isChatCandidate(user?: ApiConnection['otherUser'] | null): user is ChatCandidate {
  return Boolean(user && typeof user.id === 'number' && user.stxAddress);
}

function matchesUserIdentifier(
  user: Pick<ChatCandidate, 'username' | 'stxAddress'> | null | undefined,
  identifier: string,
) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return user?.username?.trim().toLowerCase() === normalized || user?.stxAddress?.trim().toLowerCase() === normalized;
}

function buildUserSearchText(user?: Partial<ChatCandidate> | null) {
  return [user?.name, user?.username, user?.stxAddress, user?.role]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function dedupeCandidates(users: ChatCandidate[]) {
  const map = new Map<number, ChatCandidate>();
  users.forEach((user) => {
    if (!map.has(user.id)) {
      map.set(user.id, user);
    }
  });

  return Array.from(map.values());
}

function buildConversationPreview(message: Pick<ApiConversationMessage, 'body' | 'attachmentName' | 'attachmentMimeType'>) {
  const body = message.body?.trim();
  if (body) {
    return body;
  }

  const attachmentName = message.attachmentName?.trim();
  if (!attachmentName) {
    return 'No messages yet';
  }

  return message.attachmentMimeType?.startsWith('image/') ? `Image: ${attachmentName}` : `Attachment: ${attachmentName}`;
}

function fileToAttachmentInput(file: File) {
  return new Promise<ApiConversationAttachmentInput>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read the selected file.'));
        return;
      }

      resolve({
        dataUrl: reader.result,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      });
    };

    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export const MessagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiConversationMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [connectionCandidates, setConnectionCandidates] = useState<ChatCandidate[]>([]);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [newChatResults, setNewChatResults] = useState<ChatCandidate[]>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [newChatError, setNewChatError] = useState('');
  const [composerError, setComposerError] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ApiConversationAttachmentInput | null>(null);
  const [startingConversationId, setStartingConversationId] = useState<number | null>(null);
  const handledRequestedUserRef = useRef('');
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const requestedConversationId = useMemo(() => {
    const rawValue = searchParams.get('conversation');
    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const requestedUser = useMemo(() => searchParams.get('user')?.trim() || '', [searchParams]);

  const syncSearchParams = useCallback((conversationId: number | null, userIdentifier?: string | null) => {
    const nextParams = new URLSearchParams(searchParams);

    if (conversationId) {
      nextParams.set('conversation', String(conversationId));
    } else {
      nextParams.delete('conversation');
    }

    if (userIdentifier?.trim()) {
      nextParams.set('user', userIdentifier.trim());
    } else {
      nextParams.delete('user');
    }

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const [me, conversationList, connectionList] = await Promise.all([
        getCurrentUser(),
        getConversations(),
        getConnections().catch(() => [] as ApiConnection[]),
      ]);

      const acceptedConnections = dedupeCandidates(
        connectionList
          .filter((connection) => connection.status === 'accepted')
          .map((connection) => connection.otherUser)
          .filter(isChatCandidate),
      );

      setCurrentUserId(me.user.id);
      setConnectionCandidates(acceptedConnections);
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
    if (requestedUser) {
      setIsNewChatOpen(true);
      setNewChatQuery(requestedUser);
      setNewChatError('');
    }
  }, [requestedUser]);

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

    if (searchParams.get('conversation') !== String(selectedChat) || searchParams.get('user')) {
      syncSearchParams(selectedChat, null);
    }

    loadMessages(selectedChat);
  }, [loadMessages, searchParams, selectedChat, syncSearchParams]);

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

  useEffect(() => {
    const query = newChatQuery.trim();

    if (query.length < 2) {
      setNewChatResults([]);
      setNewChatLoading(false);
      return;
    }

    let cancelled = false;
    setNewChatLoading(true);

    searchUsersByUsername(query, 8)
      .then((rows) => {
        if (cancelled) {
          return;
        }

        setNewChatResults(dedupeCandidates(rows.filter((user) => user.id !== currentUserId)));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to search users for a new conversation:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNewChatLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, newChatQuery]);

  const handleSelectChat = useCallback((chatId: number) => {
    setSelectedChat(chatId);
    setIsNewChatOpen(false);
    setNewChatError('');
    syncSearchParams(chatId, null);
  }, [syncSearchParams]);

  const handleStartConversation = useCallback(async (candidate: ChatCandidate) => {
    setNewChatError('');
    setStartingConversationId(candidate.id);

    try {
      const existingConversation = conversations.find((conversation) => conversation.participant?.id === candidate.id);
      if (existingConversation) {
        setSelectedChat(existingConversation.id);
        setIsNewChatOpen(false);
        syncSearchParams(existingConversation.id, null);
        return existingConversation.id;
      }

      const created = await startConversation(candidate.id);
      const refreshedConversations = await getConversations();
      setConversations(refreshedConversations);
      setSelectedChat(created.id);
      setMessages([]);
      setIsNewChatOpen(false);
      syncSearchParams(created.id, null);
      return created.id;
    } catch (error) {
      setNewChatError(error instanceof Error ? error.message : 'Failed to start a new conversation.');
      return null;
    } finally {
      setStartingConversationId(null);
    }
  }, [conversations, syncSearchParams]);

  useEffect(() => {
    const identifier = requestedUser.trim();
    if (!identifier || loading) {
      if (!identifier) {
        handledRequestedUserRef.current = '';
      }
      return;
    }

    const normalized = identifier.toLowerCase();
    if (handledRequestedUserRef.current === normalized) {
      return;
    }

    let cancelled = false;

    const connectToRequestedUser = async () => {
      const existingConversation = conversations.find((conversation) => matchesUserIdentifier(conversation.participant || null, identifier));
      if (existingConversation) {
        handledRequestedUserRef.current = normalized;
        if (!cancelled) {
          handleSelectChat(existingConversation.id);
        }
        return;
      }

      const connectedUser = connectionCandidates.find((candidate) => matchesUserIdentifier(candidate, identifier));
      if (connectedUser) {
        handledRequestedUserRef.current = normalized;
        if (!cancelled) {
          await handleStartConversation(connectedUser);
        }
        return;
      }

      try {
        const rows = await searchUsersByUsername(identifier, 8);
        if (cancelled) {
          return;
        }

        const resolvedUser = rows.find((user) => matchesUserIdentifier(user, identifier)) || rows[0] || null;
        handledRequestedUserRef.current = normalized;

        if (!resolvedUser) {
          setNewChatError('No user matched that username or wallet address.');
          return;
        }

        await handleStartConversation(resolvedUser);
      } catch (error) {
        handledRequestedUserRef.current = normalized;
        if (!cancelled) {
          setNewChatError(error instanceof Error ? error.message : 'Failed to resolve the requested user.');
        }
      }
    };

    connectToRequestedUser();

    return () => {
      cancelled = true;
    };
  }, [connectionCandidates, conversations, handleSelectChat, handleStartConversation, loading, requestedUser]);

  const handleBackToList = () => {
    setSelectedChat(null);
    syncSearchParams(null, null);
  };

  const handleCloseNewChat = () => {
    setIsNewChatOpen(false);
    setNewChatQuery('');
    setNewChatResults([]);
    setNewChatError('');
    handledRequestedUserRef.current = '';
    syncSearchParams(selectedChat, null);
  };

  const handleAttachmentSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setComposerError('Attachments must be 5MB or smaller.');
      return;
    }

    try {
      const attachment = await fileToAttachmentInput(file);
      setPendingAttachment(attachment);
      setComposerError('');
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Failed to prepare the selected attachment.');
    }
  };

  const handleSend = async () => {
    if (!selectedChat || (!message.trim() && !pendingAttachment)) {
      return;
    }

    setSending(true);
    setComposerError('');
    try {
      const created = await sendConversationMessage(selectedChat, message.trim(), pendingAttachment || undefined);
      setMessages((current) => [...current, created]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedChat
            ? { ...conversation, lastMessage: buildConversationPreview(created), lastMessageAt: created.createdAt }
            : conversation,
        ),
      );
      setMessage('');
      setPendingAttachment(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      setComposerError(error instanceof Error ? error.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

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

  const filteredConnections = useMemo(() => {
    const query = newChatQuery.trim().toLowerCase();
    if (!query) {
      return connectionCandidates.slice(0, 6);
    }

    return connectionCandidates.filter((candidate) => buildUserSearchText(candidate).includes(query));
  }, [connectionCandidates, newChatQuery]);

  const visibleSearchResults = useMemo(() => {
    const visibleConnectionIds = new Set(filteredConnections.map((candidate) => candidate.id));
    return newChatResults.filter((candidate) => !visibleConnectionIds.has(candidate.id));
  }, [filteredConnections, newChatResults]);

  const currentChat = conversations.find((chat) => chat.id === selectedChat) || null;

  const renderAvatar = (
    user: Pick<ChatCandidate, 'avatar' | 'name' | 'username' | 'stxAddress'> | null | undefined,
    className: string,
    fallbackClassName: string,
  ) => {
    const avatarUrl = toApiAssetUrl(user?.avatar);
    const label = toDisplayName(user || null);

    return avatarUrl ? (
      <img src={avatarUrl} alt={label} className={`${className} object-cover`} referrerPolicy="no-referrer" />
    ) : (
      <div className={`${className} ${fallbackClassName}`}>
        {label.slice(0, 1).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 md:pl-[92px] md:pr-8 min-h-screen flex flex-col">
      <div className="w-full max-w-[1680px] mx-auto flex-1 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Link to="/" className="w-10 h-10 bg-surface border border-border rounded-full flex items-center justify-center text-muted hover:text-ink hover:border-ink transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Messages</h1>
            <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Direct chats with your network</p>
          </div>
        </div>

        <div className="flex-1 bg-surface border border-border rounded-[18px] overflow-hidden flex flex-col md:flex-row min-h-[520px] xl:min-h-[660px] shadow-[0_16px_60px_rgba(0,0,0,0.16)]">
          <div className={`w-full md:w-[380px] xl:w-[420px] border-r border-border flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-ink/5 rounded-[15px] px-4 py-2 flex items-center gap-2 flex-1 min-w-0">
                  <Search size={16} className="text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search conversations..."
                    className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewChatOpen((current) => !current);
                    setNewChatError('');
                  }}
                  className={`w-11 h-11 rounded-[15px] border flex items-center justify-center transition-colors ${isNewChatOpen ? 'bg-ink text-bg border-ink' : 'bg-ink/5 border-border text-ink hover:bg-ink hover:text-bg'}`}
                  title="Start a new chat"
                >
                  <Plus size={18} />
                </button>
              </div>

              {isNewChatOpen ? (
                <div className="rounded-[15px] border border-border bg-ink/5 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest">Start a new chat</p>
                      <p className="text-[10px] text-muted">Type a username or pick one of your accepted connections.</p>
                    </div>
                    <button type="button" onClick={handleCloseNewChat} className="text-muted hover:text-ink transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="bg-surface rounded-[12px] px-3 py-2 border border-border flex items-center gap-2">
                    <Search size={14} className="text-muted" />
                    <input
                      type="text"
                      value={newChatQuery}
                      onChange={(event) => setNewChatQuery(event.target.value)}
                      placeholder="Search by username or wallet"
                      className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                    />
                    {newChatLoading ? <Loader2 size={14} className="animate-spin text-muted" /> : null}
                  </div>

                  {newChatError ? <p className="text-xs text-accent-orange font-bold">{newChatError}</p> : null}

                  {filteredConnections.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">Connections</p>
                      <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
                        {filteredConnections.map((candidate) => {
                          const isStarting = startingConversationId === candidate.id;
                          return (
                            <button
                              key={`connection-${candidate.id}`}
                              type="button"
                              onClick={() => handleStartConversation(candidate)}
                              disabled={isStarting}
                              className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 flex items-center gap-3 text-left hover:bg-ink/5 transition-colors disabled:opacity-60"
                            >
                              {renderAvatar(candidate, 'w-10 h-10 rounded-[10px] shrink-0', 'bg-accent-orange/15 text-accent-orange flex items-center justify-center font-black')}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate">{toDisplayName(candidate)}</p>
                                <p className="text-[10px] text-muted uppercase tracking-widest truncate">{candidate.username ? `@${candidate.username}` : formatAddress(candidate.stxAddress)}</p>
                              </div>
                              {isStarting ? <Loader2 size={14} className="animate-spin text-muted shrink-0" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {visibleSearchResults.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">Search results</p>
                      <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
                        {visibleSearchResults.map((candidate) => {
                          const isStarting = startingConversationId === candidate.id;
                          return (
                            <button
                              key={`search-result-${candidate.id}`}
                              type="button"
                              onClick={() => handleStartConversation(candidate)}
                              disabled={isStarting}
                              className="w-full rounded-[12px] border border-border bg-surface px-3 py-2.5 flex items-center gap-3 text-left hover:bg-ink/5 transition-colors disabled:opacity-60"
                            >
                              {renderAvatar(candidate, 'w-10 h-10 rounded-[10px] shrink-0', 'bg-accent-orange/15 text-accent-orange flex items-center justify-center font-black')}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate">{toDisplayName(candidate)}</p>
                                <p className="text-[10px] text-muted uppercase tracking-widest truncate">{candidate.username ? `@${candidate.username}` : formatAddress(candidate.stxAddress)}</p>
                              </div>
                              {isStarting ? <Loader2 size={14} className="animate-spin text-muted shrink-0" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {!newChatLoading && newChatQuery.trim().length > 0 && filteredConnections.length === 0 && visibleSearchResults.length === 0 ? (
                    <p className="text-xs text-muted">No users matched that search.</p>
                  ) : null}
                </div>
              ) : null}
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
                      <div className="relative shrink-0">
                        {renderAvatar(chat.participant || null, 'w-12 h-12 rounded-[12px]', 'bg-accent-orange/15 text-accent-orange flex items-center justify-center font-black')}
                        {chat.unreadCount > 0 ? <span className="absolute top-0 right-0 w-3 h-3 bg-accent-cyan rounded-full border-2 border-surface"></span> : null}
                      </div>
                      <div className="flex-1 overflow-hidden min-w-0">
                        <div className="flex justify-between items-center gap-3 mb-1">
                          <h4 className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-black' : 'font-bold'}`}>{displayName}</h4>
                          <span className="text-[10px] text-muted whitespace-nowrap">{formatRelativeTime(chat.lastMessageAt)}</span>
                        </div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1 truncate">{chat.participant?.role || 'User'}</p>
                        <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-ink font-bold' : 'text-muted'}`}>{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                  );
                })
              )}

              {!loading && visibleConversations.length === 0 ? (
                <div className="p-5 text-sm text-muted">
                  No conversations yet. Use <span className="font-bold text-ink">New Chat</span> to start one.
                </div>
              ) : null}
            </div>
          </div>

          <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {currentChat ? (
              <>
                <div className="p-4 md:p-6 border-b border-border flex items-center justify-between bg-ink/5">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <button className="md:hidden text-muted hover:text-ink" onClick={handleBackToList}>
                      <ChevronLeft size={24} />
                    </button>
                    {renderAvatar(currentChat.participant || null, 'w-11 h-11 rounded-[12px] shrink-0', 'bg-accent-orange/15 text-accent-orange flex items-center justify-center font-black')}
                    <div className="min-w-0">
                      <h3 className="font-bold text-base md:text-lg truncate">{toDisplayName(currentChat.participant || null)}</h3>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest truncate">{currentChat.participant?.username ? `@${currentChat.participant.username}` : currentChat.participant?.role || 'User'}</p>
                    </div>
                  </div>
                  <button className="text-muted hover:text-ink"><MoreHorizontal size={20} /></button>
                </div>

                <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto no-scrollbar space-y-6 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]">
                  <div className="text-center text-[10px] text-muted font-bold uppercase tracking-widest my-4">Today</div>
                  {messages.map((entry) => {
                    const isMine = entry.senderId === currentUserId;
                    const attachmentUrl = toApiAssetUrl(entry.attachmentUrl);
                    const isImageAttachment = Boolean(attachmentUrl && entry.attachmentMimeType?.startsWith('image/'));
                    return (
                      <div key={entry.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] lg:max-w-[72%] p-4 rounded-[16px] text-sm ${isMine ? 'bg-ink text-bg rounded-tr-none' : 'bg-ink/5 text-ink rounded-tl-none border border-border'}`}>
                          {attachmentUrl ? (
                            isImageAttachment ? (
                              <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block mb-3">
                                <img src={attachmentUrl} alt={entry.attachmentName || 'Uploaded image'} className="max-h-72 w-auto rounded-[12px] object-cover" referrerPolicy="no-referrer" />
                              </a>
                            ) : (
                              <a href={attachmentUrl} target="_blank" rel="noreferrer" className={`mb-3 flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2 ${isMine ? 'border-bg/15 bg-bg/10 text-bg' : 'border-border bg-surface text-ink'}`}>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{entry.attachmentName || 'Attachment'}</p>
                                  <p className={`text-[10px] truncate ${isMine ? 'text-bg/70' : 'text-muted'}`}>{entry.attachmentMimeType || 'File'}</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0">Open</span>
                              </a>
                            )
                          ) : null}
                          {entry.body ? <p className="whitespace-pre-wrap break-words">{entry.body}</p> : null}
                          <p className={`text-[10px] mt-2 ${isMine ? 'text-bg/70' : 'text-muted'}`}>{formatRelativeTime(entry.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 ? (
                    <div className="text-sm text-muted">No messages yet. Start the conversation below.</div>
                  ) : null}
                </div>

                <div className="p-4 border-t border-border bg-surface/90">
                  <input ref={attachmentInputRef} type="file" accept={MESSAGE_ATTACHMENT_ACCEPT} className="hidden" onChange={handleAttachmentSelect} />
                  {pendingAttachment ? (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-ink/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{pendingAttachment.fileName}</p>
                        <p className="text-[10px] text-muted truncate">{pendingAttachment.mimeType || 'Attachment'} · {(pendingAttachment.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={() => setPendingAttachment(null)} className="text-muted hover:text-ink transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  {composerError ? <p className="mb-3 text-xs text-accent-orange font-bold">{composerError}</p> : null}
                  <div className="flex items-center gap-2 bg-ink/5 border border-border rounded-[15px] p-2">
                    <button type="button" onClick={() => attachmentInputRef.current?.click()} className="p-2 text-muted hover:text-ink transition-colors" title="Attach a document">
                      <Plus size={20} />
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
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
                      disabled={sending || (!message.trim() && !pendingAttachment)}
                      className="w-10 h-10 bg-ink text-bg rounded-[15px] flex items-center justify-center hover:scale-105 transition-transform shrink-0 disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center">
                <MessageCircle size={54} className="mb-4 opacity-20" />
                <h3 className="text-2xl font-black mb-2">Your Messages</h3>
                <p className="text-sm max-w-md">Select a conversation from the list or open a new chat by searching for a username or choosing one of your connections.</p>
                <button type="button" onClick={() => setIsNewChatOpen(true)} className="btn-primary mt-6">
                  Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
