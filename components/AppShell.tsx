/* ============================= APPLICATION (structure) =============================
   Le squelette est rendu par React ; le contenu des écrans (#page-content),
   des modales (#modal-root), des toasts (#toast-root) et du menu (#sidebar-nav)
   est produit par le moteur applicatif (lib/voomnet.js), exactement comme
   dans la version « index.html ». */
export default function AppShell() {
  return (
    <div id="app" className="hidden">
      <aside id="sidebar">
        <div className="sidebar-logo">
          <img src="/voomnet-logo.png" alt="VOOMNET TECHNOLOGY" className="sidebar-logo-img" />
          <div>
            <span>GESTION DES ACHATS</span>
          </div>
        </div>
        <nav id="sidebar-nav"></nav>
        <div className="sidebar-user">
          <div className="avatar" id="su-avatar"></div>
          <div style={{ minWidth: 0 }}>
            <div className="nm" id="su-name"></div>
            <div className="rl" id="su-role"></div>
          </div>
          <button data-act="logout" title="Se déconnecter">
            ⏻
          </button>
        </div>
      </aside>
      <div className="main">
        <header id="topbar">
          <button id="hamburger" data-act="toggle-sidebar">
            ☰
          </button>
          <h1 id="page-title">Tableau de bord</h1>
          <div className="bell-wrap">
            <button className="icon-btn" data-act="notif-toggle" title="Notifications">
              🔔<span className="bell-badge" id="bell-badge" style={{ display: "none" }}>0</span>
            </button>
            <div className="notif-panel hidden" id="notif-panel"></div>
          </div>
          <div className="user-chip">
            <div
              className="avatar"
              style={{ width: 30, height: 30, fontSize: 11 }}
              id="tu-avatar"
            ></div>
            <div>
              <div className="nm" id="tu-name"></div>
              <div className="rl" id="tu-role"></div>
            </div>
          </div>
        </header>
        <main id="page-content"></main>
      </div>
    </div>
  );
}
