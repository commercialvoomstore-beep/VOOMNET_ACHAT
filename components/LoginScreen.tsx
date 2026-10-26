/* ============================= ÉCRAN DE CONNEXION ============================= */
const showDemoAccounts =
  process.env.NEXT_PUBLIC_DEMO_MODE === "1"
    ? true
    : process.env.NEXT_PUBLIC_DEMO_MODE === "0"
      ? false
      : process.env.NODE_ENV !== "production";

export default function LoginScreen() {
  return (
    <div id="login-screen">
      <div className="login-card">
        <img src="/voomnet-logo.png" alt="VOOMNET TECHNOLOGY" className="login-logo-img" />
        <div className="login-sub">PORTAIL DE GESTION DES DEMANDES D'ACHATS</div>
        <form id="login-form" autoComplete="off">
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="login-id">Identifiant</label>
            <input id="login-id" type="text" placeholder="Saisissez votre identifiant" required />
          </div>
          <div className="field">
            <label htmlFor="login-pw">Mot de passe</label>
            <input id="login-pw" type="password" placeholder="••••••••" required />
          </div>
          <button
            type="submit"
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
          >
            Se connecter
          </button>
        </form>
        {showDemoAccounts && (
          <div className="demo-box">
            <p>Comptes de démonstration</p>
            <button className="demo-chip" data-act="fill-login" data-u="admin" data-p="admin123">
              <span>Administrateur</span>
              <code>admin / admin123</code>
            </button>
            <button className="demo-chip" data-act="fill-login" data-u="demandeur" data-p="demo123">
              <span>Demandeur</span>
              <code>demandeur / demo123</code>
            </button>
            <button className="demo-chip" data-act="fill-login" data-u="responsable" data-p="demo123">
              <span>Responsable</span>
              <code>responsable / demo123</code>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
