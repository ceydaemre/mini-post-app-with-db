import { Link, useNavigate } from "react-router-dom";
import postitLogo from "../assets/postit-logo.png";

function MainLayout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

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
            <Link to="/notifications">Notifications</Link>
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
    </div>
  );
}

export default MainLayout;