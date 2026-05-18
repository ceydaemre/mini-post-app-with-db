import { useNavigate } from "react-router-dom";

function formatNotificationDate(createdAt) {
  if (!createdAt) return "";

  return new Date(createdAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationMessage(type) {
  if (type === "FOLLOW") return "seni takip etti.";
  if (type === "LIKE") return "entry’ni beğendi.";
  if (type === "COMMENT") return "entry’ne yorum yaptı.";
  if (type === "REPOST") return "entry’ni repostladı.";
  if (type === "QUOTE") return "entry’ni quote’ladı.";

  return "sana bildirim gönderdi.";
}

function NotificationAvatar({ actor }) {
  return (
    <div className="notification-avatar">
      {actor?.profile_image_url ? (
        <img src={actor.profile_image_url} alt={actor.full_name || "avatar"} />
      ) : (
        actor?.full_name?.charAt(0)?.toUpperCase() || "?"
      )}
    </div>
  );
}

function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  const actor = notification.actor;
  const dateText = formatNotificationDate(notification.created_at);

  function handleClick() {
    if (!notification.is_read && onRead) {
      onRead(notification.id);
    }

    if (notification.type === "FOLLOW" && actor?.id) {
      navigate(`/users/${actor.id}`);
      return;
    }

    if (notification.entry_id) {
      navigate(`/entries/${notification.entry_id}`);
    }
  }

  return (
    <article
      className={`notification-item ${
        notification.is_read ? "" : "unread-notification-item"
      }`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <NotificationAvatar actor={actor} />

      <div className="notification-content">
        <p className="notification-message">
          <strong>{actor?.full_name}</strong>{" "}
          <span>{getNotificationMessage(notification.type)}</span>
        </p>

        {actor?.username && (
          <p className="notification-username">@{actor.username}</p>
        )}

        {notification.entry?.content_preview && (
          <p className="notification-entry-preview">
            “{notification.entry.content_preview}
            {notification.entry.content_preview.length >= 120 ? "..." : ""}”
          </p>
        )}

        {dateText && <p className="notification-date">{dateText}</p>}
      </div>

      {!notification.is_read && <span className="notification-unread-dot" />}
    </article>
  );
}

export default NotificationItem;
