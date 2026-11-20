// IEEE Trace: REQ-007 | US-051 | components/Layout.jsx
import { Outlet } from 'react-router-dom';
import NavbarModule from './NavbarModule';
import AvisoPopupModal from './avisos/AvisoPopupModal';
import '../styles/tutorial.css';

export default function Layout() {
    return (
        <div className="app-layout">
            <NavbarModule />

            {/* Popup Modal de Avisos del Sistema */}
            <AvisoPopupModal />

            {/* Main Content Area */}
            <main className="main-content">
                <div className="content-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
