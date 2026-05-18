import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Plus, Search, X } from "lucide-react";

import postitLogo from "../assets/postit-logo.png";
import {
  getConversationMessages,
  getConversations,
  getUnreadMessagesCount,
  markConversationMessagesAsRead,
  sendMessage,
} from "../api/messageApi.js";
import { searchUsers } from "../api/searchApi.js";

const DOCK_CONVERSATIONS_LIMIT = 8;
const DOCK_MESSAGES_LIMIT = 20;

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function formatDockDate(createdAt) {
  if (!createdAt) return "";

  return new Date(createdAt).toLocaleString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DockAvatar({ user }) {
  return (
    <div className="messages-dock-avatar">
      {user?.profile_image_url ? (
        <img src={user.profile_image_url} alt={user.full_name || "avatar"} />
      ) : (
        user?.full_name?.charAt(0)?.toUpperCase() || "?"
      )}
    </div>
  );
}

function MessagesDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("list");

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [draftUser, setDraftUser] = useState(null);
  const [messages, setMessages] = useState([]);

  const [messageText, setMessageText] = useState("");
  const dockThreadRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const shouldHideDock = location.pathname.startsWith("/messages");

  async function fetchUnreadMessagesCount() {
    if (!currentUser?.id) return;

    try {
      const result = await getUnreadMessagesCount();
      setUnreadMessagesCount(result?.data?.unread_count || 0);
    } catch {
      setUnreadMessagesCount(0);
    }
  }

  async function fetchConversations() {
    setLoadingConversations(true);
    setError("");

    try {
      const result = await getConversations({
        limit: DOCK_CONVERSATIONS_LIMIT,
        offset: 0,
      });

      const nextItems = Array.isArray(result?.data?.items)
        ? result.data.items
        : [];

      setConversations(nextItems);
    } catch (error) {
      setConversations([]);
      setError(error.message);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function openConversation(conversation) {
    setSelectedConversation(conversation);
    setDraftUser(null);
    setMode("detail");
    setMessageText("");
    setLoadingMessages(true);
    setError("");

    try {
      const result = await getConversationMessages(conversation.conversation_id, {
        limit: DOCK_MESSAGES_LIMIT,
        offset: 0,
      });

      const nextMessages = Array.isArray(result?.data?.items)
        ? result.data.items
        : [];

      setMessages(nextMessages);

      await markConversationMessagesAsRead(conversation.conversation_id);
      fetchUnreadMessagesCount();

      setConversations((currentItems) =>
        currentItems.map((item) =>
          Number(item.conversation_id) === Number(conversation.conversation_id)
            ? {
                ...item,
                unread_count: 0,
              }
            : item
        )
      );
    } catch (error) {
      setMessages([]);
      setError(error.message);
    } finally {
      setLoadingMessages(false);
    }
  }

  function openNewMessageMode() {
    setMode("new");
    setSelectedConversation(null);
    setDraftUser(null);
    setMessages([]);
    setMessageText("");
    setSearchText("");
    setSearchResults([]);
    setError("");
  }

  function returnToConversationList() {
    setMode("list");
    setSelectedConversation(null);
    setDraftUser(null);
    setMessages([]);
    setMessageText("");
    setSearchText("");
    setSearchResults([]);
    setError("");
    fetchConversations();
  }

  function selectDraftUser(user) {
    const existingConversation = conversations.find(
      (conversation) =>
        Number(conversation.other_user?.id) === Number(user?.id)
    );

    if (existingConversation) {
      openConversation(existingConversation);
      return;
    }

    setDraftUser(user);
    setSelectedConversation(null);
    setMessages([]);
    setMessageText("");
    setMode("detail");
    setError("");
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const normalizedMessage = messageText.trim();
    const receiverId =
      draftUser?.id || selectedConversation?.other_user?.id;

    if (!normalizedMessage || !receiverId || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await sendMessage(receiverId, normalizedMessage);
      const createdMessage = result?.data?.message;
      const conversationId = result?.data?.conversation?.id;

      if (createdMessage) {
        setMessages((currentMessages) => [createdMessage, ...currentMessages]);
      }

      setMessageText("");
      await fetchConversations();
      fetchUnreadMessagesCount();

      if (draftUser && conversationId) {
        const newConversation = {
          conversation_id: conversationId,
          other_user: draftUser,
          last_message: createdMessage,
          unread_count: 0,
          updated_at: createdMessage?.created_at,
        };

        setSelectedConversation(newConversation);
        setDraftUser(null);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  }

  function handleOpenFullMessages() {
    setOpen(false);

    if (selectedConversation?.conversation_id) {
      navigate(`/messages/${selectedConversation.conversation_id}`);
      return;
    }

    if (draftUser?.id) {
      navigate(`/messages/new/${draftUser.id}`);
      return;
    }

    navigate("/messages");
  }

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open]);

  useEffect(() => {
    if (shouldHideDock) {
      setUnreadMessagesCount(0);
      return;
    }

    fetchUnreadMessagesCount();
  }, [shouldHideDock, currentUser?.id]);

  useEffect(() => {
    if (!open || mode !== "new") return;

    const normalizedQuery = searchText.trim().replace(/^@+/, "");

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;

    async function fetchUsers() {
      setSearchLoading(true);

      try {
        const result = await searchUsers({
          query: normalizedQuery,
          limit: 5,
          offset: 0,
        });

        const users = Array.isArray(result?.data?.items)
          ? result.data.items
          : Array.isArray(result?.data?.users)
            ? result.data.users
            : Array.isArray(result?.data)
              ? result.data
              : [];

        if (isMounted) {
          setSearchResults(users.filter((user) => !user.is_me));
        }
      } catch {
        if (isMounted) {
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setSearchLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(fetchUsers, 350);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchText, open, mode]);

  useEffect(() => {
    if (!dockThreadRef.current) return;

    dockThreadRef.current.scrollTop = dockThreadRef.current.scrollHeight;
  }, [messages.length, mode, selectedConversation?.conversation_id, draftUser?.id]);

  if (shouldHideDock) return null;

  const activeUser =
    draftUser || selectedConversation?.other_user || null;

  return (
    <div className="messages-dock">
      {open && (
        <section className="messages-dock-panel">
          <header className="messages-dock-header">
            <div className="messages-dock-header-main">
              {mode !== "list" && (
                <button
                  type="button"
                  className="messages-dock-back-button"
                  onClick={returnToConversationList}
                  aria-label="Sohbet listesine dön"
                >
                  <ArrowLeft size={17} />
                </button>
              )}

              {mode === "detail" ? (
                <button
                  type="button"
                  className="messages-dock-user-header"
                  onClick={() => activeUser?.id && navigate(`/users/${activeUser.id}`)}
                >
                  <DockAvatar user={activeUser} />

                  <span>
                    <strong>{activeUser?.full_name || "Messages"}</strong>
                    {activeUser?.username && <small>@{activeUser.username}</small>}
                  </span>
                </button>
              ) : (
                <div className="messages-dock-title">
                  <MessageCircle size={18} />
                  <strong>{mode === "new" ? "Yeni mesaj" : "Messages"}</strong>
                </div>
              )}
            </div>

            <div className="messages-dock-header-actions">
              {mode === "list" && (
                <button type="button" onClick={openNewMessageMode}>
                  <Plus size={17} />
                </button>
              )}

              <button type="button" onClick={() => setOpen(false)}>
                <X size={17} />
              </button>
            </div>
          </header>

          {error && <p className="messages-dock-error">{error}</p>}

          {mode === "list" && (
            <div className="messages-dock-body">
              {loadingConversations && (
                <p className="messages-dock-empty">Konuşmalar yükleniyor...</p>
              )}

              {!loadingConversations && conversations.length === 0 && (
                <p className="messages-dock-empty">
                  Henüz konuşma yok. Yeni mesaj başlatabilirsin.
                </p>
              )}

              {conversations.map((conversation) => (
                <button
                  type="button"
                  className="messages-dock-conversation"
                  key={conversation.conversation_id}
                  onClick={() => openConversation(conversation)}
                >
                  <DockAvatar user={conversation.other_user} />

                  <span>
                    <strong>{conversation.other_user?.full_name}</strong>
                    <small>
                      {conversation.last_message?.content || "Henüz mesaj yok."}
                    </small>
                  </span>

                  {conversation.unread_count > 0 && (
                    <em>{conversation.unread_count > 99 ? "99+" : conversation.unread_count}</em>
                  )}
                </button>
              ))}
            </div>
          )}

          {mode === "new" && (
            <div className="messages-dock-body">
              <div className="messages-dock-search">
                <Search size={16} />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Kullanıcı adı veya isim ara..."
                  autoFocus
                />
              </div>

              {searchText.trim().length < 2 && (
                <p className="messages-dock-empty">
                  Sohbet başlatmak için en az 2 karakter yaz.
                </p>
              )}

              {searchLoading && (
                <p className="messages-dock-empty">Kullanıcılar aranıyor...</p>
              )}

              {!searchLoading &&
                searchText.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <p className="messages-dock-empty">Kullanıcı bulunamadı.</p>
                )}

              {searchResults.map((user) => (
                <button
                  type="button"
                  className="messages-dock-conversation"
                  key={user.id}
                  onClick={() => selectDraftUser(user)}
                >
                  <DockAvatar user={user} />

                  <span>
                    <strong>{user.full_name}</strong>
                    <small>@{user.username}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {mode === "detail" && (
            <>
              <div className="messages-dock-thread" ref={dockThreadRef}>
                {loadingMessages && (
                  <p className="messages-dock-empty">Mesajlar yükleniyor...</p>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <p className="messages-dock-empty">
                    İlk mesajı göndererek konuşmayı başlat.
                  </p>
                )}

                {messages
                  .slice()
                  .reverse()
                  .map((message) => {
                    const isMine =
                      Number(message.sender_id) === Number(currentUser?.id);

                    return (
                      <div
                        className={`messages-dock-message-row ${
                          isMine ? "mine" : ""
                        }`}
                        key={message.id}
                      >
                        <div className="messages-dock-message">
                          <p>{message.content}</p>
                          <small>{formatDockDate(message.created_at)}</small>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <form className="messages-dock-compose" onSubmit={handleSendMessage}>
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Mesaj yaz..."
                  maxLength={1000}
                />

                <button type="submit" disabled={!messageText.trim() || sending}>
                  Gönder
                </button>
              </form>

              <button
                type="button"
                className="messages-dock-full-link"
                onClick={handleOpenFullMessages}
              >
                Tam ekranda aç
              </button>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        className="messages-dock-launcher"
        onClick={() => setOpen((current) => !current)}
        aria-label="Mesajları aç"
      >
        <span className="messages-dock-launcher-logo">
          <img src={postitLogo} alt="Messages" />
        </span>

        {unreadMessagesCount > 0 && (
          <span className="messages-dock-launcher-badge">
            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default MessagesDock;
