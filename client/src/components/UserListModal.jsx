import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

function UserAvatar({ user }) {
  return (
    <div className="user-list-modal-avatar">
      {user?.profile_image_url ? (
        <img src={user.profile_image_url} alt={user.full_name || "avatar"} />
      ) : (
        user?.full_name?.charAt(0)?.toUpperCase() || "?"
      )}
    </div>
  );
}

function UserListModal({
  title,
  users,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onClose,
}) {
  const navigate = useNavigate();

  function handleUserClick(userId) {
    if (!userId) return;

    onClose();
    navigate(`/users/${userId}`);
  }

  return (
    <div className="user-list-modal-backdrop" onClick={onClose}>
      <section
        className="user-list-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="user-list-modal-header">
          <h2>{title}</h2>

          <button
            type="button"
            className="user-list-modal-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </header>

        {error && <div className="error-message user-list-modal-error">{error}</div>}

        {loading && (
          <div className="user-list-modal-empty">Yükleniyor...</div>
        )}

        {!loading && users.length === 0 && (
          <div className="user-list-modal-empty">Henüz kullanıcı yok.</div>
        )}

        {!loading && users.length > 0 && (
          <div className="user-list-modal-items">
            {users.map((user) => (
              <button
                type="button"
                className="user-list-modal-item"
                key={user.id}
                onClick={() => handleUserClick(user.id)}
              >
                <UserAvatar user={user} />

                <div className="user-list-modal-user-info">
                  <strong>{user.full_name}</strong>
                  <span>@{user.username}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            className="user-list-modal-load-more"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Yükleniyor..." : "Daha fazla yükle"}
          </button>
        )}
      </section>
    </div>
  );
}

export default UserListModal;
