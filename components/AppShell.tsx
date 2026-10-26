/* ============================= APPLICATION (structure ERP sobre) ============================= */
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
          <button data-act="logout" title="Se déconnecter" aria-label="Se déconnecter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>
      <div className="main">
        <header id="topbar">
          <button id="hamburger" data-act="toggle-sidebar" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 id="page-title">Tableau de bord</h1>
          <div className="bell-wrap">
            <button className="icon-btn" id="btn-son" data-act="toggle-son" title="Sons de notification">
              🔊
            </button>
            <button className="icon-btn" data-act="notif-toggle" title="Notifications" aria-label="Notifications">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="bell-badge" id="bell-badge" style={{ display: "none" }}>0</span>
            </button>
            <div className="notif-panel hidden" id="notif-panel"></div>
          </div>
          <div className="user-chip">
            <div
              className="avatar"
              style={{ width: 28, height: 28, fontSize: 11 }}
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
