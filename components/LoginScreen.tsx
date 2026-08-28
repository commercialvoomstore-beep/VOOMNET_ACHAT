/* ============================= ÉCRAN DE CONNEXION ============================= */
export default function LoginScreen() {
  return (
    <div id="login-screen">
      <div className="login-card">
        <div className="login-logo">V</div>
        <div className="login-title">VOOMNET</div>
        <div className="login-sub">GESTION DES ACHATS</div>
        <form id="login-form" autoComplete="off">
          <div className="field" style={{ marginBottom: 13 }}>
            <label htmlFor="login-id">Identifiant</label>
            <input id="login-id" type="text" placeholder="ex : demandeur" required />
          </div>
          <div className="field">
            <label htmlFor="login-pw">Mot de passe</label>
            <input id="login-pw" type="password" placeholder="••••••••" required />
          </div>
          <button
            type="submit"
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
          >
            🔐 Se connecter
          </button>
        </form>
        <div className="demo-box">
          <p>Comptes de démonstration</p>
          <button className="demo-chip" data-act="fill-login" data-u="admin" data-p="admin123">
            <span>🔑 Administrateur</span>
            <code>admin / admin123</code>
          </button>
          <button className="demo-chip" data-act="fill-login" data-u="demandeur" data-p="demo123">
            <span>📝 Demandeur</span>
            <code>demandeur / demo123</code>
          </button>
          <button className="demo-chip" data-act="fill-login" data-u="responsable" data-p="demo123">
            <span>✅ Responsable</span>
            <code>responsable / demo123</code>
          </button>
        </div>
      </div>
    </div>
  );
}
