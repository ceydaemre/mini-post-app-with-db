import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";
import EntryCard from "../components/EntryCard.jsx";
import DeleteEntryConfirmModal from "../components/DeleteEntryConfirmModal.jsx";
import { searchEntries, searchUsers } from "../api/searchApi.js";
import { toggleFollow } from "../api/userApi.js";

const VALID_SEARCH_TABS = ["users", "entries"];
const SEARCH_LIMIT = 10;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;
const RECENT_SEARCHES_STORAGE_KEY = "mini_post_recent_searches";
const RECENT_SEARCHES_LIMIT = 5;

function getTabFromSearchParams(searchParams) {
  const tab = searchParams.get("tab");

  if (VALID_SEARCH_TABS.includes(tab)) {
    return tab;
  }

  return "users";
}

function getRecentSearchesFromStorage() {
  try {
    const rawValue = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function saveRecentSearchesToStorage(searches) {
  localStorage.setItem(
    RECENT_SEARCHES_STORAGE_KEY,
    JSON.stringify(searches)
  );
}

function normalizeRecentSearchQuery(query) {
  return query.trim().replace(/\s+/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }) {
  if (!text) return null;

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < MIN_SEARCH_LENGTH) {
    return text;
  }

  const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi");
  const parts = String(text).split(regex);

  return parts.map((part, index) =>
    part.toLocaleLowerCase("tr-TR") ===
    normalizedQuery.toLocaleLowerCase("tr-TR") ? (
      <mark className="search-highlight" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function SearchUserCard({ user, highlightQuery, followLoading, onFollowClick }) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/users/${user.id}`);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  }

  return (
    <article
      className="search-user-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="search-user-avatar">
        {user.profile_image_url ? (
          <img src={user.profile_image_url} alt={user.full_name || "avatar"} />
        ) : (
          user.full_name?.charAt(0)?.toUpperCase() || "?"
        )}
      </div>

      <div className="search-user-info">
        <strong>
          <HighlightText text={user.full_name} query={highlightQuery} />
        </strong>
        <span>
          @<HighlightText text={user.username} query={highlightQuery} />
        </span>

        {user.is_me && <small>Sen</small>}
      </div>

      {!user.is_me && (
        <button
          type="button"
          className={`search-user-follow-button ${
            user.is_following ? "following" : ""
          }`}
          onClick={(event) => onFollowClick(event, user)}
          disabled={followLoading}
        >
          {followLoading
            ? "İşleniyor..."
            : user.is_following
              ? "Takip Ediliyor"
              : "Takip Et"}
        </button>
      )}
    </article>
  );
}

function SearchUserSkeletonList() {
  return (
    <section className="search-user-list">
      {[1, 2, 3].map((item) => (
        <div className="search-user-card search-user-skeleton" key={item}>
          <div className="search-user-avatar search-skeleton-block" />

          <div className="search-user-info">
            <div className="search-skeleton-line search-skeleton-line-name" />
            <div className="search-skeleton-line search-skeleton-line-username" />
          </div>
        </div>
      ))}
    </section>
  );
}

function SearchEntrySkeletonList() {
  return (
    <section className="search-entry-skeleton-list">
      {[1, 2].map((item) => (
        <div className="search-entry-skeleton-card" key={item}>
          <div className="search-entry-skeleton-header">
            <div className="search-user-avatar search-skeleton-block" />

            <div className="search-user-info">
              <div className="search-skeleton-line search-skeleton-line-name" />
              <div className="search-skeleton-line search-skeleton-line-username" />
            </div>
          </div>

          <div className="search-skeleton-line search-skeleton-line-content" />
          <div className="search-skeleton-line search-skeleton-line-content short" />
        </div>
      ))}
    </section>
  );
}

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryFromUrl = searchParams.get("q") || "";
  const tabFromUrl = getTabFromSearchParams(searchParams);

  const [searchText, setSearchText] = useState(queryFromUrl);
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchFollowLoadingUserId, setSearchFollowLoadingUserId] = useState(null);
  const [userToUnfollow, setUserToUnfollow] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() =>
    getRecentSearchesFromStorage()
  );

  const normalizedQuery = searchText.trim();
  const canSearch = normalizedQuery.length >= MIN_SEARCH_LENGTH;

  function updateSearchParams(nextQuery, nextTab) {
    const params = new URLSearchParams();

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    params.set("tab", nextTab);

    setSearchParams(params, { replace: true });
  }

  function saveRecentSearch(query) {
    const normalizedRecentQuery = normalizeRecentSearchQuery(query);

    if (normalizedRecentQuery.length < MIN_SEARCH_LENGTH) return;

    setRecentSearches((currentSearches) => {
      const nextSearches = [
        normalizedRecentQuery,
        ...currentSearches.filter(
          (item) =>
            item.toLocaleLowerCase("tr-TR") !==
            normalizedRecentQuery.toLocaleLowerCase("tr-TR")
        ),
      ].slice(0, RECENT_SEARCHES_LIMIT);

      saveRecentSearchesToStorage(nextSearches);

      return nextSearches;
    });
  }

  function handleRecentSearchClick(query) {
    setSearchText(query);
    setItems([]);
    setHasMore(false);
    setNextOffset(0);
    setError("");
    updateSearchParams(query, activeTab);
  }

  function handleRemoveRecentSearch(event, query) {
    event.stopPropagation();

    setRecentSearches((currentSearches) => {
      const nextSearches = currentSearches.filter((item) => item !== query);

      saveRecentSearchesToStorage(nextSearches);

      return nextSearches;
    });
  }

  function handleClearRecentSearches() {
    setRecentSearches([]);
    saveRecentSearchesToStorage([]);
  }

  async function fetchSearchResults({
    query,
    tab,
    offset = 0,
    append = false,
  }) {
    if (query.trim().length < MIN_SEARCH_LENGTH) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const requestPayload = {
        query: query.trim(),
        limit: SEARCH_LIMIT,
        offset,
      };

      const result =
        tab === "users"
          ? await searchUsers(requestPayload)
          : await searchEntries(requestPayload);

      if (!append) {
        saveRecentSearch(query);
      }

      const rawItems = result?.data?.items || [];
      const nextItems = Array.isArray(rawItems) ? rawItems : [];

      setItems((currentItems) =>
        append ? [...currentItems, ...nextItems] : nextItems
      );

      setHasMore(Boolean(result?.data?.pagination?.has_more));
      setNextOffset(result?.data?.pagination?.next_offset || 0);
    } catch (error) {
      if (!append) {
        setItems([]);
      }

      setHasMore(false);
      setNextOffset(0);
      setError(error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleInputChange(event) {
    const nextValue = event.target.value;

    setSearchText(nextValue);
    setItems([]);
    setHasMore(false);
    setNextOffset(0);
    setError("");
    updateSearchParams(nextValue, activeTab);
  }

  function handleClearSearch() {
    setSearchText("");
    setItems([]);
    setHasMore(false);
    setNextOffset(0);
    setError("");
    updateSearchParams("", activeTab);
  }

  function handleTabChange(tab) {
    if (tab === activeTab) return;

    setActiveTab(tab);
    setItems([]);
    setHasMore(false);
    setNextOffset(0);
    setError("");
    updateSearchParams(searchText, tab);
  }

  function handleLoadMore() {
    if (loading || loadingMore || !hasMore || !canSearch) return;

    fetchSearchResults({
      query: normalizedQuery,
      tab: activeTab,
      offset: nextOffset,
      append: true,
    });
  }

  function updateSearchUserFollowState(userId, isFollowing) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        Number(item.id) === Number(userId)
          ? {
              ...item,
              is_following: isFollowing,
            }
          : item
      )
    );
  }

  async function applySearchUserFollowToggle(user, nextIsFollowing) {
    if (!user?.id || searchFollowLoadingUserId) return false;

    const previousIsFollowing = Boolean(user.is_following);

    setSearchFollowLoadingUserId(user.id);
    setError("");
    updateSearchUserFollowState(user.id, nextIsFollowing);

    try {
      const result = await toggleFollow(user.id);
      const isFollowingFromApi = Boolean(result?.data?.is_following);

      updateSearchUserFollowState(user.id, isFollowingFromApi);

      return true;
    } catch (error) {
      updateSearchUserFollowState(user.id, previousIsFollowing);
      setError(error.message);

      return false;
    } finally {
      setSearchFollowLoadingUserId(null);
    }
  }

  function handleSearchUserFollowClick(event, user) {
    event.stopPropagation();

    if (searchFollowLoadingUserId || !user?.id) return;

    if (user.is_following) {
      setUserToUnfollow(user);
      return;
    }

    applySearchUserFollowToggle(user, true);
  }

  async function handleConfirmSearchUnfollow() {
    if (!userToUnfollow) return;

    const isSuccessful = await applySearchUserFollowToggle(userToUnfollow, false);

    if (isSuccessful) {
      setUserToUnfollow(null);
    }
  }

  useEffect(() => {
    setSearchText(queryFromUrl);
    setActiveTab(tabFromUrl);
  }, [queryFromUrl, tabFromUrl]);

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      setHasMore(false);
      setNextOffset(0);
      setError("");
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSearchResults({
        query: normalizedQuery,
        tab: activeTab,
        offset: 0,
        append: false,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [normalizedQuery, activeTab]);

  return (
    <MainLayout>
      <section className="page-header">
        <h2>Search</h2>
      </section>

      <section className="search-page-shell">
        <div className="search-input-wrapper">
          <input
            className="search-input"
            type="search"
            placeholder="Kullanıcı veya entry ara"
            value={searchText}
            onChange={handleInputChange}
          />

          {searchText && (
            <button
              type="button"
              className="search-clear-button"
              onClick={handleClearSearch}
              aria-label="Aramayı temizle"
            >
              ×
            </button>
          )}
        </div>

        {!normalizedQuery && recentSearches.length > 0 && (
          <section className="recent-searches-card">
            <div className="recent-searches-header">
              <h3>Son aramalar</h3>

              <button type="button" onClick={handleClearRecentSearches}>
                Tümünü temizle
              </button>
            </div>

            <div className="recent-searches-list">
              {recentSearches.map((query) => (
                <button
                  type="button"
                  className="recent-search-item"
                  key={query}
                  onClick={() => handleRecentSearchClick(query)}
                >
                  <span>{query}</span>

                  <span
                    role="button"
                    tabIndex={0}
                    className="recent-search-remove"
                    onClick={(event) => handleRemoveRecentSearch(event, query)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        handleRemoveRecentSearch(event, query);
                      }
                    }}
                    aria-label={`${query} aramasını sil`}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="search-tabs">
          <button
            type="button"
            className={activeTab === "users" ? "active-search-tab" : ""}
            onClick={() => handleTabChange("users")}
          >
            Users
          </button>

          <button
            type="button"
            className={activeTab === "entries" ? "active-search-tab" : ""}
            onClick={() => handleTabChange("entries")}
          >
            Entries
          </button>
        </div>

        {!normalizedQuery && (
          <>
            <section className="empty-state search-empty-state">
              <h3>Kullanıcı, entry veya konu ara.</h3>
              <p>Aramaya başlamak için en az 2 karakter yaz.</p>
            </section>
          </>
        )}

        {normalizedQuery && !canSearch && (
          <section className="empty-state search-empty-state">
            <h3>Arama için en az 2 karakter yaz.</h3>
          </section>
        )}

        {error && <div className="error-message">{error}</div>}

        {loading && activeTab === "users" && <SearchUserSkeletonList />}

        {loading && activeTab === "entries" && <SearchEntrySkeletonList />}

        {!loading && canSearch && items.length === 0 && !error && (
          <section className="empty-state search-empty-state">
            <h3>"{normalizedQuery}" için sonuç bulunamadı.</h3>
            <p>Farklı bir kelime veya kullanıcı adı dene.</p>
          </section>
        )}

        {!loading && activeTab === "users" && items.length > 0 && (
          <section className="search-user-list">
            {items.map((user) => (
              <SearchUserCard
                key={user.id}
                user={user}
                highlightQuery={normalizedQuery}
                followLoading={
                  Number(searchFollowLoadingUserId) === Number(user.id)
                }
                onFollowClick={handleSearchUserFollowClick}
              />
            ))}
          </section>
        )}

        {!loading && activeTab === "entries" && items.length > 0 && (
          <section className="timeline-list search-entry-list">
            {items.map((item) => (
              <EntryCard
                key={`${item.entry_type}-${item.entry.id}`}
                item={item}
                highlightQuery={normalizedQuery}
              />
            ))}
          </section>
        )}

        {hasMore && (
          <button
            type="button"
            className="load-more-button"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Yükleniyor..." : "Daha fazla yükle"}
          </button>
        )}

        {userToUnfollow && (
          <DeleteEntryConfirmModal
            deleting={
              Number(searchFollowLoadingUserId) === Number(userToUnfollow.id)
            }
            title="Takipten çıkılsın mı?"
            description="Bu kullanıcıyı takipten çıkmak istediğine emin misin?"
            confirmText="Takipten çık"
            loadingText="Çıkılıyor..."
            onCancel={() => setUserToUnfollow(null)}
            onConfirm={handleConfirmSearchUnfollow}
          />
        )}
      </section>
    </MainLayout>
  );
}

export default SearchPage;
