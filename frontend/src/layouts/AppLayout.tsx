import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import {
  ActivityIcon,
  ChartIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
  IssueIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
} from '../components/icons';
import { useAuth } from '../features/auth/auth-context';
import { useProjects } from '../features/projects/hooks';
import { useToast } from '../components/toast-context';
import { initials } from '../utils/format';
import { Wordmark } from './Wordmark';

const NAV_ITEMS = [
  { label: 'Overview', action: 'overview', icon: HomeIcon },
  { label: 'My Work', action: 'my-work', icon: UsersIcon },
  { label: 'Projects', action: 'projects', icon: FolderIcon },
  { label: 'Issues', action: 'issues', icon: IssueIcon },
  { label: 'Reports', action: 'reports', icon: ChartIcon },
  { label: 'Activity', action: 'activity', icon: ActivityIcon },
] as const;

function ProjectAvatar({
  label,
  active = false,
  colour,
}: {
  label: string;
  active?: boolean;
  colour?: string;
}) {
  return (
    <span
      className="project-avatar"
      style={{ '--project-colour': active ? '#1769ff' : (colour ?? '#5b56e9') } as CSSProperties}
    >
      {label.slice(0, 3)}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return <span className="avatar lg">{initials(name)}</span>;
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useProjects();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const accountRefs = useRef<Array<HTMLDivElement | null>>([]);
  const firstMenuItemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);

  const currentProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] ?? null;
  }, [location.pathname]);
  const currentProject = projects.data?.find((project) => project.id === currentProjectId) ?? null;
  const firstProjectId = projects.data?.[0]?.id ?? null;
  const currentProjectView = useMemo(() => {
    const view = new URLSearchParams(location.search).get('view');
    return view === 'overview' || view === 'my-work' ? view : 'issues';
  }, [location.search]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!accountOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!accountRefs.current.some((ref) => ref?.contains(target))) setAccountOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  const handleLogout = () => {
    setAccountOpen(false);
    void authApi.logout();
    signOut();
    navigate('/login', { replace: true });
  };

  const openProjectView = (view: 'overview' | 'issues' | 'my-work') => {
    const targetProjectId = currentProjectId ?? firstProjectId;
    if (!targetProjectId) {
      navigate('/projects');
      toast.success('Create a project to start tracking work');
      return;
    }

    const search = view === 'issues' ? '' : `?view=${view}`;
    navigate(`/projects/${targetProjectId}${search}`);
  };

  const openCreateProject = () => {
    sessionStorage.setItem('issuehub:create-project', '1');
    if (location.pathname === '/projects') {
      window.dispatchEvent(new CustomEvent('issuehub:create-project'));
      return;
    }
    navigate('/projects');
  };

  const handleAccountKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, slot: number) => {
    if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setAccountOpen(true);
    window.requestAnimationFrame(() => firstMenuItemRefs.current[slot]?.focus());
  };

  const renderAccount = (slot: number) =>
    user && (
      <div
        ref={(node) => {
          accountRefs.current[slot] = node;
        }}
        className="issuehub-profile-menu"
      >
        <button
          type="button"
          className="profile-button"
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          onClick={() => setAccountOpen((open) => !open)}
          onKeyDown={(event) => handleAccountKeyDown(event, slot)}
        >
          <Avatar name={user.name} />
          <span className="profile-meta">
            <span className="profile-name">{user.name}</span>
            <span className="profile-email">{user.email}</span>
          </span>
          <ChevronDownIcon />
        </button>

        {accountOpen && (
          <div
            role="menu"
            aria-label="Account menu"
            className={`popover issuehub-account-popover ${
              slot === 0 ? 'issuehub-account-popover-sidebar' : 'issuehub-account-popover-mobile'
            }`}
          >
            <div className="popover-label">Account</div>
            <Link
              to="/projects"
              role="menuitem"
              ref={(node) => {
                firstMenuItemRefs.current[slot] = node;
              }}
              onClick={() => setAccountOpen(false)}
              className="popover-item"
            >
              <FolderIcon />
              Projects
            </Link>
            <div className="popover-separator" />
            <button type="button" role="menuitem" onClick={handleLogout} className="popover-item danger">
              <LogoutIcon />
              Log out
            </button>
          </div>
        )}
      </div>
    );

  const sidebar = (
    <aside className={`sidebar issuehub-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
      <div className="brand-row">
        <Link to="/projects" className="brand-button" aria-label="IssueHub home">
          <Wordmark />
        </Link>
        <button
          type="button"
          className="icon-button"
          aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => {
            if (window.matchMedia('(max-width: 760px)').matches) {
              setMobileNavOpen(false);
              return;
            }
            setSidebarCollapsed((collapsed) => !collapsed);
          }}
        >
          <ChevronLeftIcon />
        </button>
      </div>

      <div className="sidebar-scroll">
        <nav className="nav-list" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if (item.action === 'reports' || item.action === 'activity') {
              return (
                <button
                  key={item.label}
                  type="button"
                  className="nav-item"
                  onClick={() => toast.success(`${item.label} is not part of the current IssueHub workflow`)}
                >
                  <span className="nav-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            }

            if (item.action === 'overview' || item.action === 'issues' || item.action === 'my-work') {
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`nav-item ${
                    currentProjectId && item.action === currentProjectView ? 'active' : ''
                  }`}
                  onClick={() => openProjectView(item.action)}
                >
                  <span className="nav-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                  {item.action === 'issues' && currentProject && (
                    <span className="nav-badge">{currentProject.issueCount}</span>
                  )}
                </button>
              );
            }

            return (
              <NavLink
                key={item.label}
                to="/projects"
                end
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="section-divider" />

        <div className="section-heading">
          <span>Projects</span>
          <button type="button" className="icon-button" aria-label="Create project" onClick={openCreateProject}>
            <PlusIcon />
          </button>
        </div>

        <div className="projects-list">
          {projects.data?.slice(0, 6).map((project, index) => {
            const active = currentProjectId === project.id;
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={`project-item ${active ? 'active' : ''}`}
              >
                <ProjectAvatar label={project.key} active={active} />
                <span>{project.name}</span>
                {index === 0 && (
                  <span className="project-star">
                    <StarIcon />
                  </span>
                )}
              </Link>
            );
          })}
          <Link to="/projects" className="project-item all-projects">
            <ChevronRightIcon />
            <span>View all projects</span>
          </Link>
        </div>

        <div className="invite-card">
          <div className="invite-title">Invite your team</div>
          <div className="avatar-stack">
            <span className="avatar sm">AK</span>
            <span className="avatar sm">RM</span>
            <span className="avatar sm">IN</span>
            <span className="avatar sm">+</span>
          </div>
          <p>Collaborate with your team and track issues together.</p>
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              if (currentProjectId) {
                window.dispatchEvent(new CustomEvent('issuehub:open-members'));
              } else {
                navigate('/projects');
              }
            }}
          >
            Invite members
          </button>
        </div>
      </div>

      <div className="profile-bar">{renderAccount(0)}</div>
    </aside>
  );

  return (
    <div className={`issuehub-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to content
      </a>

      {sidebar}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="mobile-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <header className="issuehub-mobile-header">
        <button
          type="button"
          aria-label="Open navigation"
          className="icon-button mobile-menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <MenuIcon />
        </button>
        {currentProject ? (
          <>
            <Link to="/projects" className="brand-button" aria-label="Switch project">
              <ProjectAvatar label={currentProject.key} active />
              <span className="issuehub-mobile-project-title">
                <span>{currentProject.name}</span>
                <ChevronDownIcon />
              </span>
            </Link>
            <button
              type="button"
              className="button primary icon-only"
              aria-label="New Issue"
              onClick={() => window.dispatchEvent(new CustomEvent('issuehub:new-issue'))}
            >
              <PlusIcon />
            </button>
          </>
        ) : (
          <>
            <Link to="/projects" className="brand-button" aria-label="IssueHub home">
              <Wordmark />
            </Link>
            {renderAccount(1)}
          </>
        )}
      </header>

      <div className="issuehub-page">
        <main id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
