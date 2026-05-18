import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";

import MainLayout from "../layouts/MainLayout.jsx";
import {
  getConversationMessages,
  getConversations,
  markConversationMessagesAsRead,
  sendMessage,
} from "../api/messageApi.js";
import { searchUsers } from "../api/searchApi.js";
import { getUserProfile } from "../api/userApi.js";

const CONVERSATIONS_LIMIT = 10;
const MESSAGES_LIMIT = 20;

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function formatMessageDate(createdAt) {
  if (!createdAt) return "";

  return new Date(createdAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserAvatar({ user, className = "" }) {
  return (
    <div className={`message-user-avatar ${className}`}>
      {user?.profile_image_url ? (
        <img src={user.profile_image_url} alt={user.full_name || "avatar"} />
      ) : (
        user?.full_name?.charAt(0)?.toUpperCase() || "?"
      )}
    </div>
  );
}

function ConversationItem({ conversation, active, onClick, onProfileClick }) {
  const otherUser = conversation.other_user;
  const lastMessage = conversation.last_message;
  const preview = lastMessage?.content || "Henüz mesaj yok.";
  const dateText = formatMessageDate(conversation.updated_at);

  function handleProfileClick(event) {
    event.stopPropagation();
    onProfileClick(otherUser?.id);
  }

  return (
    <button
      type="button"
      className={`conversation-item ${active ? "active-conversation-item" : ""}`}
      onClick={onClick}
    >
      <span
        role="button"
        tabIndex={0}
        className="message-profile-link"
        onClick={handleProfileClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleProfileClick(event);
          }
        }}
      >
        <UserAvatar user={otherUser} />
      </span>

      <div className="conversation-item-content">
        <div className="conversation-item-top">
          <strong
            role="button"
            tabIndex={0}
            className="message-profile-text-link"
            onClick={handleProfileClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleProfileClick(event);
              }
            }}
          >
            {otherUser?.full_name}
          </strong>
          {dateText && <span>{dateText}</span>}
        </div>

        <p
          role="button"
          tabIndex={0}
          className="message-profile-text-link"
          onClick={handleProfileClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleProfileClick(event);
            }
          }}
        >
          @{otherUser?.username}
        </p>
        <small>{preview}</small>
      </div>

      {conversation.unread_count > 0 && (
        <span className="conversation-unread-badge">
          {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
        </span>
      )}
    </button>
  );
}

function MessageBubble({ message, isMine }) {
  return (
    <div className={`message-row ${isMine ? "my-message-row" : "other-message-row"}`}>
      <div className={`message-bubble ${isMine ? "my-message-bubble" : ""}`}>
        <p>{message.content}</p>
        <span>{formatMessageDate(message.created_at)}</span>
      </div>
    </div>
  );
}

function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId, userId } = useParams();
  const currentUser = getCurrentUser();

  const [conversations, setConversations] = useState([]);
  const [conversationsHasMore, setConversationsHasMore] = useState(false);
  const [conversationsNextOffset, setConversationsNextOffset] = useState(0);

  const [conversationDetail, setConversationDetail] = useState(null);
  const [draftUser, setDraftUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [messagesNextOffset, setMessagesNextOffset] = useState(0);

  const [conversationLoading, setConversationLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesLoadingMore, setMessagesLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [newMessageSearchOpen, setNewMessageSearchOpen] = useState(false);
  const [newMessageSearchText, setNewMessageSearchText] = useState("");
  const [newMessageSearchResults, setNewMessageSearchResults] = useState([]);
  const [newMessageSearchLoading, setNewMessageSearchLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedConversationId = conversationId ? Number(conversationId) : null;
  const draftReceiverId = userId ? Number(userId) : null;
  const isDraftConversation = Boolean(draftReceiverId) && !selectedConversationId;

  const selectedConversationFromList = useMemo(() => {
    if (!selectedConversationId) return null;

    return conversations.find(
      (conversation) =>
        Number(conversation.conversation_id) === Number(selectedConversationId)
    );
  }, [conversations, selectedConversationId]);

  async function fetchConversations({ offset = 0, append = false } = {}) {
    setConversationLoading(!append);
    setError("");

    try {
      const result = await getConversations({
        limit: CONVERSATIONS_LIMIT,
        offset,
      });

      const nextItems = Array.isArray(result?.data?.items)
        ? result.data.items
        : [];

      setConversations((currentItems) =>
        append ? [...currentItems, ...nextItems] : nextItems
      );

      setConversationsHasMore(Boolean(result?.data?.pagination?.has_more));
      setConversationsNextOffset(result?.data?.pagination?.next_offset || 0);
    } catch (error) {
      if (!append) {
        setConversations([]);
      }

      setConversationsHasMore(false);
      setConversationsNextOffset(0);
      setError(error.message);
    } finally {
      setConversationLoading(false);
    }
  }

  async function fetchDraftUser() {
    if (!draftReceiverId) return;

    setMessagesLoading(true);
    setError("");

    try {
      const result = await getUserProfile(draftReceiverId);
      const profileUser = result?.data?.profile_user;

      setDraftUser(profileUser || null);
      setConversationDetail(
        profileUser
          ? {
              id: null,
              other_user: profileUser,
            }
          : null
      );
      setMessages([]);
      setMessagesHasMore(false);
      setMessagesNextOffset(0);
    } catch (error) {
      setDraftUser(null);
      setConversationDetail(null);
      setError(error.message);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function fetchMessages({ offset = 0, append = false } = {}) {
    if (!selectedConversationId) return;

    if (append) {
      setMessagesLoadingMore(true);
    } else {
      setMessagesLoading(true);
    }

    setError("");

    try {
      const result = await getConversationMessages(selectedConversationId, {
        limit: MESSAGES_LIMIT,
        offset,
      });

      const nextItems = Array.isArray(result?.data?.items)
        ? result.data.items
        : [];

      setConversationDetail(result?.data?.conversation || null);

      setMessages((currentItems) =>
        append ? [...currentItems, ...nextItems] : nextItems
      );

      setMessagesHasMore(Boolean(result?.data?.pagination?.has_more));
      setMessagesNextOffset(result?.data?.pagination?.next_offset || 0);

      await markConversationMessagesAsRead(selectedConversationId);

      setConversations((currentItems) =>
        currentItems.map((conversation) =>
          Number(conversation.conversation_id) === Number(selectedConversationId)
            ? {
                ...conversation,
                unread_count: 0,
              }
            : conversation
        )
      );
    } catch (error) {
      if (!append) {
        setMessages([]);
        setConversationDetail(null);
      }

      setMessagesHasMore(false);
      setMessagesNextOffset(0);
      setError(error.message);
    } finally {
      setMessagesLoading(false);
      setMessagesLoadingMore(false);
    }
  }

  function handleConversationClick(nextConversationId) {
    navigate(`/messages/${nextConversationId}`);
  }

  function handleProfileClick(userId) {
    if (!userId) return;

    navigate(`/users/${userId}`);
  }

  function handleLoadMoreConversations() {
    if (conversationLoading || !conversationsHasMore) return;

    fetchConversations({
      offset: conversationsNextOffset,
      append: true,
    });
  }

  function handleOpenNewMessageSearch() {
    setNewMessageSearchOpen(true);
    setNewMessageSearchText("");
    setNewMessageSearchResults([]);
    setError("");
  }

  function handleCloseNewMessageSearch() {
    setNewMessageSearchOpen(false);
    setNewMessageSearchText("");
    setNewMessageSearchResults([]);
  }

  function handleSelectNewMessageUser(user) {
    const existingConversation = conversations.find(
      (conversation) =>
        Number(conversation.other_user?.id) === Number(user?.id)
    );

    handleCloseNewMessageSearch();

    if (existingConversation) {
      navigate(`/messages/${existingConversation.conversation_id}`);
      return;
    }

    navigate(`/messages/new/${user.id}`);
  }

  function handleLoadMoreMessages() {
    if (messagesLoading || messagesLoadingMore || !messagesHasMore) return;

    fetchMessages({
      offset: messagesNextOffset,
      append: true,
    });
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const normalizedMessage = messageText.trim();
    const receiverId =
      draftUser?.id ||
      conversationDetail?.other_user?.id ||
      selectedConversationFromList?.other_user?.id;

    if (!normalizedMessage || !receiverId || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await sendMessage(receiverId, normalizedMessage);
      const createdMessage = result?.data?.message;

      if (createdMessage) {
        setMessages((currentMessages) => [createdMessage, ...currentMessages]);
      }

      setMessageText("");

      const conversationIdFromApi = result?.data?.conversation?.id;

      await fetchConversations();

      if (isDraftConversation && conversationIdFromApi) {
        navigate(`/messages/${conversationIdFromApi}`);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!newMessageSearchOpen) return;

    const normalizedQuery = newMessageSearchText.trim().replace(/^@+/, "");

    if (normalizedQuery.length < 2) {
      setNewMessageSearchResults([]);
      setNewMessageSearchLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchUsers() {
      setNewMessageSearchLoading(true);

      try {
        const result = await searchUsers({
          query: normalizedQuery,
          limit: 6,
          offset: 0,
        });

        const users = Array.isArray(result?.data?.items)
          ? result.data.items
          : Array.isArray(result?.data?.users)
            ? result.data.users
            : Array.isArray(result?.data)
              ? result.data
              : [];

        if (!isMounted) return;

        setNewMessageSearchResults(users.filter((user) => !user.is_me));
      } catch {
        if (!isMounted) return;

        setNewMessageSearchResults([]);
      } finally {
        if (isMounted) {
          setNewMessageSearchLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(fetchUsers, 350);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [newMessageSearchText, newMessageSearchOpen]);

  useEffect(() => {
    setMessages([]);
    setConversationDetail(null);
    setDraftUser(null);
    setMessagesHasMore(false);
    setMessagesNextOffset(0);

    if (selectedConversationId) {
      fetchMessages();
      return;
    }

    if (isDraftConversation) {
      fetchDraftUser();
    }
  }, [selectedConversationId, draftReceiverId]);

  const otherUser =
    draftUser ||
    conversationDetail?.other_user ||
    selectedConversationFromList?.other_user;

  return (
    <MainLayout>
      <section className="page-header">
        <h2>Messages</h2>
      </section>

      {error && <div className="error-message">{error}</div>}

      <section className="messages-layout">
        <aside className="conversations-panel">
          <div className="messages-panel-header messages-panel-header-with-action">
            <h3>Konuşmalar</h3>

            <button
              type="button"
              className="messages-new-chat-button"
              onClick={newMessageSearchOpen ? handleCloseNewMessageSearch : handleOpenNewMessageSearch}
              aria-label={newMessageSearchOpen ? "Yeni sohbet aramasını kapat" : "Yeni sohbet başlat"}
            >
              {newMessageSearchOpen ? <X size={17} /> : <Plus size={17} />}
            </button>
          </div>

          {newMessageSearchOpen && (
            <section className="messages-new-chat-panel">
              <div className="messages-new-chat-search">
                <Search size={16} />

                <input
                  value={newMessageSearchText}
                  onChange={(event) => setNewMessageSearchText(event.target.value)}
                  placeholder="Kullanıcı adı veya isim ara..."
                  autoFocus
                />
              </div>

              {newMessageSearchText.trim().length < 2 && (
                <p className="messages-new-chat-hint">
                  Yeni sohbet başlatmak için en az 2 karakter yaz.
                </p>
              )}

              {newMessageSearchLoading && (
                <p className="messages-new-chat-hint">Kullanıcılar aranıyor...</p>
              )}

              {!newMessageSearchLoading &&
                newMessageSearchText.trim().length >= 2 &&
                newMessageSearchResults.length === 0 && (
                  <p className="messages-new-chat-hint">Kullanıcı bulunamadı.</p>
                )}

              {newMessageSearchResults.length > 0 && (
                <div className="messages-new-chat-results">
                  {newMessageSearchResults.map((user) => {
                    const existingConversation = conversations.find(
                      (conversation) =>
                        Number(conversation.other_user?.id) === Number(user.id)
                    );

                    return (
                      <button
                        type="button"
                        className="messages-new-chat-result"
                        key={user.id}
                        onClick={() => handleSelectNewMessageUser(user)}
                      >
                        <UserAvatar user={user} />

                        <span>
                          <strong>{user.full_name}</strong>
                          <small>@{user.username}</small>
                        </span>

                        {existingConversation && <em>Mevcut sohbet</em>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {conversationLoading && conversations.length === 0 && (
            <section className="empty-state messages-empty-state">
              <h3>Konuşmalar yükleniyor...</h3>
            </section>
          )}

          {!conversationLoading && conversations.length === 0 && (
            <section className="empty-state messages-empty-state">
              <h3>Henüz konuşma yok.</h3>
              <p>Bir kullanıcıya mesaj gönderdiğinde burada görünecek.</p>
            </section>
          )}

          {conversations.length > 0 && (
            <div className="conversation-list">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.conversation_id}
                  conversation={conversation}
                  active={
                    Number(conversation.conversation_id) ===
                    Number(selectedConversationId)
                  }
                  onClick={() =>
                    handleConversationClick(conversation.conversation_id)
                  }
                  onProfileClick={handleProfileClick}
                />
              ))}
            </div>
          )}

          {conversationsHasMore && (
            <button
              type="button"
              className="load-more-button messages-load-more-button"
              onClick={handleLoadMoreConversations}
              disabled={conversationLoading}
            >
              Daha fazla yükle
            </button>
          )}
        </aside>

        <section className="messages-detail-panel">
          {!selectedConversationId && !isDraftConversation && (
            <section className="empty-state messages-empty-state">
              <h3>Bir konuşma seç.</h3>
              <p>Mesajları görüntülemek için soldan bir konuşma seç.</p>
            </section>
          )}

          {(selectedConversationId || isDraftConversation) && (
            <>
              <header className="message-detail-header">
                {otherUser && (
                  <button
                    type="button"
                    className="message-header-profile-button"
                    onClick={() => handleProfileClick(otherUser.id)}
                  >
                    <UserAvatar user={otherUser} />
                  </button>
                )}

                <button
                  type="button"
                  className="message-detail-user-info message-header-profile-button"
                  onClick={() => handleProfileClick(otherUser?.id)}
                >
                  <strong>{otherUser?.full_name || "Konuşma"}</strong>
                  {otherUser?.username && <span>@{otherUser.username}</span>}
                </button>
              </header>

              {messagesLoading && messages.length === 0 && (
                <section className="empty-state messages-empty-state">
                  <h3>Mesajlar yükleniyor...</h3>
                </section>
              )}

              {!messagesLoading && messages.length === 0 && (
                <section className="empty-state messages-empty-state">
                  <h3>
                    {isDraftConversation
                      ? `${otherUser?.full_name || "Bu kullanıcı"} ile yeni mesaj`
                      : "Henüz mesaj yok."}
                  </h3>
                  <p>İlk mesajı göndererek konuşmayı başlat.</p>
                </section>
              )}

              {messagesHasMore && (
                <button
                  type="button"
                  className="load-more-button messages-load-more-button"
                  onClick={handleLoadMoreMessages}
                  disabled={messagesLoadingMore}
                >
                  {messagesLoadingMore ? "Yükleniyor..." : "Daha eski mesajları yükle"}
                </button>
              )}

              {messages.length > 0 && (
                <div className="messages-thread">
                  {messages
                    .slice()
                    .reverse()
                    .map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isMine={
                          Number(message.sender_id) === Number(currentUser?.id)
                        }
                      />
                    ))}
                </div>
              )}

              <form className="message-compose-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Mesaj yaz..."
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  maxLength={1000}
                />

                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? "Gönderiliyor..." : "Gönder"}
                </button>
              </form>
            </>
          )}
        </section>
      </section>
    </MainLayout>
  );
}

export default MessagesPage;
