import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getUnreadNotificationsCount } from "../api/notificationApi.js";
import { getUnreadMessagesCount } from "../api/messageApi.js";
import MessagesDock from "../components/MessagesDock.jsx";
import postitLogo from "../assets/postit-logo.png";

function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  function getNavLinkClass(path) {
    return location.pathname === path ? "active-sidebar-link" : "";
  }

  function getSectionNavLinkClass(pathPrefix) {
    return location.pathname.startsWith(pathPrefix) ? "active-sidebar-link" : "";
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchUnreadNotificationsCount() {
      if (!user) return;

      try {
        const result = await getUnreadNotificationsCount();

        if (!isMounted) return;

        setUnreadNotificationsCount(result?.data?.unread_count || 0);
      } catch {
        if (!isMounted) return;

        setUnreadNotificationsCount(0);
      }
    }

    fetchUnreadNotificationsCount();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    async function fetchUnreadMessagesCount() {
      if (!user) return;

      try {
        const result = await getUnreadMessagesCount();

        if (!isMounted) return;

        setUnreadMessagesCount(result?.data?.unread_count || 0);
      } catch {
        if (!isMounted) return;

        setUnreadMessagesCount(0);
      }
    }

    fetchUnreadMessagesCount();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (location.pathname === "/notifications") {
      setUnreadNotificationsCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/messages")) {
      setUnreadMessagesCount(0);
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <Link to="/home" className="sidebar-logo-link">
            <img src={postitLogo} alt="Postit" className="sidebar-logo-image" />
          </Link>

          <nav className="sidebar-nav">
            <Link to="/home" className={getNavLinkClass("/home")}>Home</Link>
            <Link to="/search" className={getNavLinkClass("/search")}>Search</Link>
            <Link
              to="/notifications"
              className={`sidebar-nav-notification-link ${getSectionNavLinkClass("/notifications")}`}
            >
              <span>Notifications</span>

              {unreadNotificationsCount > 0 && (
                <span className="sidebar-notification-badge">
                  {unreadNotificationsCount > 99
                    ? "99+"
                    : unreadNotificationsCount}
                </span>
              )}
            </Link>
            <Link
              to="/messages"
              className={`sidebar-nav-notification-link ${getSectionNavLinkClass("/messages")}`}
            >
              <span>Messages</span>

              {unreadMessagesCount > 0 && (
                <span className="sidebar-notification-badge">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </Link>
            {user && (
              <Link
                to={`/users/${user.id}`}
                className={getSectionNavLinkClass("/users")}
              >
                Profile
              </Link>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <strong>{user.full_name}</strong>
              <span>@{user.username}</span>
            </div>
          )}

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <MessagesDock />
    </div>
  );
}

export default MainLayout;