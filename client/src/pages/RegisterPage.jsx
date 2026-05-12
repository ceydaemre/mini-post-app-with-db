import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      await registerUser({
        full_name: fullName,
        username,
        email,
        password,
      });

      navigate("/login");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Postit.</h1>
        <h2>Kaydol</h2>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Ad Soyad
            <input
              type="text"
              placeholder="Adını gir"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <label>
            Kullanıcı Adı
            <input
              type="text"
              placeholder="Kullanıcı adını gir"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              placeholder="Email adresini gir"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              placeholder="Şifreni gir"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Kaydediliyor..." : "Kaydol"}
          </button>
        </form>

        <p>
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
