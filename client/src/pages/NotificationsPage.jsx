import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout.jsx";
import NotificationItem from "../components/NotificationItem.jsx";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notificationApi.js";

const NOTIFICATIONS_LIMIT = 10;

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function fetchNotifications({ offset = 0, append = false } = {}) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getNotifications({
        limit: NOTIFICATIONS_LIMIT,
        offset,
      });

      const nextItems = Array.isArray(result?.data?.items)
        ? result.data.items
        : [];

      setNotifications((currentItems) =>
        append ? [...currentItems, ...nextItems] : nextItems
      );

      setHasMore(Boolean(result?.data?.pagination?.has_more));
      setNextOffset(result?.data?.pagination?.next_offset || 0);

      if (!append && nextItems.some((item) => !item.is_read)) {
        await markAllNotificationsAsRead();
      }
    } catch (error) {
      if (!append) {
        setNotifications([]);
      }

      setHasMore(false);
      setNextOffset(0);
      setError(error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleReadNotification(notificationId) {
    setNotifications((currentItems) =>
      currentItems.map((item) =>
        Number(item.id) === Number(notificationId)
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    );

    try {
      await markNotificationAsRead(notificationId);
    } catch {
      setNotifications((currentItems) =>
        currentItems.map((item) =>
          Number(item.id) === Number(notificationId)
            ? {
                ...item,
                is_read: false,
              }
            : item
        )
      );
    }
  }

  function handleLoadMore() {
    if (loading || loadingMore || !hasMore) return;

    fetchNotifications({
      offset: nextOffset,
      append: true,
    });
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <MainLayout>
      <section className="page-header">
        <h2>Notifications</h2>
      </section>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <section className="empty-state">
          <h3>Bildirimler yükleniyor...</h3>
        </section>
      )}

      {!loading && notifications.length === 0 && !error && (
        <section className="empty-state">
          <h3>Henüz bildirim yok.</h3>
          <p>Etkileşim aldığında burada görünecek.</p>
        </section>
      )}

      {!loading && notifications.length > 0 && (
        <section className="notifications-list">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={handleReadNotification}
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
    </MainLayout>
  );
}

export default NotificationsPage;
