import { Link, NavLink, Outlet } from "react-router-dom";
import styles from "./App.module.css";

export function AppLayout() {
  return (
    <div className={styles.app}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/" aria-label="The Block inventory">
            <span className={styles.brandMark} aria-hidden="true">
              TB
            </span>
            <span>
              <strong>THE BLOCK</strong>
              <small>Vehicle auctions</small>
            </span>
          </Link>
          <nav className={styles.primaryNav} aria-label="Primary navigation">
            <NavLink className={styles.navLink} to="/" end>
              Inventory
            </NavLink>
            <NavLink className={styles.navLink} to="/my-bids">
              My Bids
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>The Block</strong>
          <span>Frontend auction marketplace prototype</span>
        </div>
        <p>Vehicle and auction details are based on the supplied dataset.</p>
      </footer>
    </div>
  );
}

export function RouteNotFound() {
  return (
    <section className={styles.notFound} aria-labelledby="page-not-found">
      <p>404</p>
      <h1 id="page-not-found">Page not found</h1>
      <span>The page you requested does not exist.</span>
      <Link to="/">Return to inventory</Link>
    </section>
  );
}
