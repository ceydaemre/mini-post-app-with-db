import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";
import EntryCard from "../components/EntryCard.jsx";
import { searchEntries, searchUsers } from "../api/searchApi.js";

const VALID_SEARCH_TABS = ["users", "entries"];
const SEARCH_LIMIT = 10;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

function getTabFromSearchParams(searchParams) {
  const tab = searchParams.get("tab");

  if (VALID_SEARCH_TABS.includes(tab)) {
    return tab;
  }

  return "users";
}

function SearchUserCard({ user }) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/users/${user.id}`);
  }

  return (
    <button type="button" className="search-user-card" onClick={handleClick}>
      <div className="search-user-avatar">
        {user.profile_image_url ? (
          <img src={user.profile_image_url} alt={user.full_name || "avatar"} />
        ) : (
          user.full_name?.charAt(0)?.toUpperCase() || "?"
        )}
      </div>

      <div className="search-user-info">
        <strong>{user.full_name}</strong>
        <span>@{user.username}</span>

        {user.is_me && <small>Sen</small>}
        {!user.is_me && user.is_following && <small>Takip ediliyor</small>}
      </div>
    </button>
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
        <input
          className="search-input"
          type="search"
          placeholder="Kullanıcı veya entry ara"
          value={searchText}
          onChange={handleInputChange}
        />

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
          <section className="empty-state search-empty-state">
            <h3>Aramak için bir şeyler yaz.</h3>
          </section>
        )}

        {normalizedQuery && !canSearch && (
          <section className="empty-state search-empty-state">
            <h3>Arama için en az 2 karakter yaz.</h3>
          </section>
        )}

        {error && <div className="error-message">{error}</div>}

        {loading && (
          <section className="empty-state search-empty-state">
            <h3>Aranıyor...</h3>
          </section>
        )}

        {!loading && canSearch && items.length === 0 && !error && (
          <section className="empty-state search-empty-state">
            <h3>Sonuç bulunamadı.</h3>
          </section>
        )}

        {!loading && activeTab === "users" && items.length > 0 && (
          <section className="search-user-list">
            {items.map((user) => (
              <SearchUserCard key={user.id} user={user} />
            ))}
          </section>
        )}

        {!loading && activeTab === "entries" && items.length > 0 && (
          <section className="timeline-list search-entry-list">
            {items.map((item) => (
              <EntryCard
                key={`${item.entry_type}-${item.entry.id}`}
                item={item}
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
      </section>
    </MainLayout>
  );
}

export default SearchPage;
