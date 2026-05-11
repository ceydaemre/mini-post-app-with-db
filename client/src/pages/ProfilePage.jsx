import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";
import EntryCard from "../components/EntryCard.jsx";
import EditProfileModal from "../components/EditProfileModal.jsx";
import {
  getUserLikes,
  getUserMedia,
  getUserPosts,
  getUserProfile,
  getUserReplies,
} from "../api/userApi.js";

const VALID_TABS = ["posts", "replies", "likes", "media"];

function normalizeEntryItem(rawItem) {
  if (rawItem.entry) {
    return rawItem;
  }

  return {
    entry_type: rawItem.type || "POST",
    entry: rawItem,
  };
}

function getTabFromSearchParams(searchParams) {
  const tab = searchParams.get("tab");

  if (VALID_TABS.includes(tab)) {
    return tab;
  }

  return "posts";
}

function formatJoinedDate(createdAt) {
  if (!createdAt) return "";

  const date = new Date(createdAt);

  return date.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState(getTabFromSearchParams(searchParams));
  const [items, setItems] = useState([]);

  const [profileLoading, setProfileLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [error, setError] = useState("");

  const profileUser = profileData?.profile_user;
  const stats = profileData?.stats || {};
  const viewerState = profileData?.viewer_state || {};

  const isMyProfile =
    viewerState.is_me || String(currentUser?.id) === String(profileUser?.id);

  async function fetchProfile() {
    setProfileLoading(true);
    setError("");

    try {
      const result = await getUserProfile(id);
      setProfileData(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchTabItems(selectedTab) {
    setItemsLoading(true);
    setError("");

    try {
      let result;

      if (selectedTab === "posts") {
        result = await getUserPosts(id);
      }

      if (selectedTab === "replies") {
        result = await getUserReplies(id);
      }

      if (selectedTab === "likes") {
        result = await getUserLikes(id);
      }

      if (selectedTab === "media") {
        result = await getUserMedia(id);
      }

      const rawItems =
        result?.data?.items ||
        result?.data?.entries ||
        result?.data?.posts ||
        result?.data?.replies ||
        result?.data?.likes ||
        result?.data ||
        [];

      setItems(Array.isArray(rawItems) ? rawItems.map(normalizeEntryItem) : []);
    } catch (error) {
      setItems([]);
      setError(error.message);
    } finally {
      setItemsLoading(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    navigate(`/users/${id}?tab=${tab}`, { replace: false });
    fetchTabItems(tab);
  }

  function handleEntryDeleted(entryId) {
    setItems((currentItems) =>
      currentItems.filter((item) => Number(item.entry?.id) !== Number(entryId))
    );
  }

  function handleEntryUpdated(updatedItem) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        Number(item.entry?.id) === Number(updatedItem.entry?.id)
          ? updatedItem
          : item
      )
    );
  }

  function handleProfileUpdated(updatedProfileUser) {
    setProfileData((current) => {
      if (!current) return current;

      return {
        ...current,
        profile_user: updatedProfileUser,
      };
    });

    if (String(currentUser?.id) === String(updatedProfileUser.id)) {
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...currentUser,
          full_name: updatedProfileUser.full_name,
          username: updatedProfileUser.username,
          profile_image_url: updatedProfileUser.profile_image_url,
          banner_image_url: updatedProfileUser.banner_image_url,
          bio: updatedProfileUser.bio,
        })
      );
    }
  }

  useEffect(() => {
    const tabFromUrl = getTabFromSearchParams(searchParams);
    setActiveTab(tabFromUrl);
    fetchProfile();
    fetchTabItems(tabFromUrl);
  }, [id, searchParams]);

  return (
    <MainLayout>
      {error && <div className="error-message">{error}</div>}

      {profileLoading && (
        <section className="empty-state">
          <h3>Profil yükleniyor...</h3>
        </section>
      )}

      {!profileLoading && profileUser && (
        <>
          <section className="profile-header-card">
            <div
              className="profile-banner"
              style={
                profileUser.banner_image_url
                  ? { backgroundImage: `url(${profileUser.banner_image_url})` }
                  : undefined
              }
            />

            <div className="profile-main-row">
              <div className="profile-avatar">
                {profileUser.profile_image_url ? (
                  <img src={profileUser.profile_image_url} alt="profile" />
                ) : (
                  profileUser.full_name?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>

              {isMyProfile && (
                <button
                  className="profile-action-button"
                  onClick={() => setEditModalOpen(true)}
                >
                  Profili Düzenle
                </button>
              )}

              {!isMyProfile && (
                <button className="profile-action-button">
                  {viewerState.is_following ? "Takip Ediliyor" : "Takip Et"}
                </button>
              )}
            </div>

            <div className="profile-info">
              <h2>{profileUser.full_name}</h2>
              <p>@{profileUser.username}</p>

              {profileUser.bio && <span>{profileUser.bio}</span>}

              {profileUser.created_at && (
                <p className="profile-joined-date">
                  {formatJoinedDate(profileUser.created_at)} tarihinde katıldı
                </p>
              )}

              <div className="profile-stats">
                <strong>{stats.posts_count || 0}</strong>
                <span>posts</span>

                <strong>{stats.followers_count || 0}</strong>
                <span>followers</span>

                <strong>{stats.following_count || 0}</strong>
                <span>following</span>
              </div>
            </div>
          </section>

          <section className="profile-tabs">
            <button
              className={activeTab === "posts" ? "active-profile-tab" : ""}
              onClick={() => handleTabChange("posts")}
            >
              Posts
            </button>

            <button
              className={activeTab === "replies" ? "active-profile-tab" : ""}
              onClick={() => handleTabChange("replies")}
            >
              Replies
            </button>

            <button
              className={activeTab === "likes" ? "active-profile-tab" : ""}
              onClick={() => handleTabChange("likes")}
            >
              Likes
            </button>

            <button
              className={activeTab === "media" ? "active-profile-tab" : ""}
              onClick={() => handleTabChange("media")}
            >
              Media
            </button>
          </section>

          {itemsLoading && (
            <section className="empty-state">
              <h3>İçerikler yükleniyor...</h3>
            </section>
          )}

          {!itemsLoading && items.length === 0 && (
            <section className="empty-state">
              <h3>Burada henüz içerik yok</h3>
            </section>
          )}

          {!itemsLoading && items.length > 0 && (
            <section className="timeline-list profile-entry-list">
              {items.map((item) => (
                <EntryCard
                  key={`${item.entry_type}-${item.entry.id}`}
                  item={item}
                  onEntryDeleted={handleEntryDeleted}
                  onEntryUpdated={handleEntryUpdated}
                />
              ))}
            </section>
          )}

          {editModalOpen && (
            <EditProfileModal
              profileUser={profileUser}
              onClose={() => setEditModalOpen(false)}
              onUpdated={handleProfileUpdated}
            />
          )}
        </>
      )}
    </MainLayout>
  );
}

export default ProfilePage;
