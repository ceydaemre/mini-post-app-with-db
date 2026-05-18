import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getUnreadNotificationsCount } from "../api/notificationApi.js";
import MessagesDock from "../components/MessagesDock.jsx";
import postitLogo from "../assets/postit-logo.png";

function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
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
    if (location.pathname === "/notifications") {
      setUnreadNotificationsCount(0);
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
            <Link to="/home">Home</Link>
            <Link to="/search">Search</Link>
            <Link to="/notifications" className="sidebar-nav-notification-link">
              <span>Notifications</span>

              {unreadNotificationsCount > 0 && (
                <span className="sidebar-notification-badge">
                  {unreadNotificationsCount > 99
                    ? "99+"
                    : unreadNotificationsCount}
                </span>
              )}
            </Link>
            <Link to="/messages">Messages</Link>
            {user && <Link to={`/users/${user.id}`}>Profile</Link>}
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