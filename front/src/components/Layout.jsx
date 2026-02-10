// IEEE Trace: REQ-007 | US-051 | components/Layout.jsx
import { Outlet } from 'react-router-dom';
import NavbarModule from './NavbarModule';

export default function Layout() {
    return (
        <div className="app-layout">
            <NavbarModule />

            {/* Main Content Area */}
            <main className="main-content">
                <div className="content-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
