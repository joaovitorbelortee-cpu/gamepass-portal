import { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import MyAccount from './MyAccount';
import { portalAPI } from './api';
import { StarfieldBackground } from './StarfieldBackground';

type View = 'login' | 'register' | 'account';

interface Client {
    id: number;
    name: string;
    email: string;
}

export default function PortalApp() {
    const [view, setView] = useState<View>('login');
    const [client, setClient] = useState<Client | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('portal_token');
        if (savedToken) {
            verifyToken(savedToken);
        } else {
            setLoading(false);
        }
    }, []);

    const verifyToken = async (savedToken: string) => {
        try {
            const client = await portalAPI.verify(savedToken);
            if (client) {
                setToken(savedToken);
                setClient(client);
                setView('account');
            } else {
                localStorage.removeItem('portal_token');
            }
        } catch {
            localStorage.removeItem('portal_token');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (newToken: string, newClient: Client) => {
        localStorage.setItem('portal_token', newToken);
        setToken(newToken);
        setClient(newClient);
        setView('account');
    };

    const handleLogout = async () => {
        localStorage.removeItem('portal_token');
        setToken(null);
        setClient(null);
        setView('login');
    };

    if (loading) {
        return (
            <div className="portal-container">
                <div className="portal-loading">
                    <div className="loading-spinner"></div>
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="portal-container">
            <StarfieldBackground />
            <div className="portal-header">
                <div className="portal-logo">
                    <div className="logo-brand">ASSINALIVEBR</div>
                    <div className="logo-gamepass">GAMEPASS</div>
                </div>
                {client && (
                    <div className="portal-user">
                        <span className="user-name">Olá, {client.name.split(' ')[0]}!</span>
                        <button className="logout-btn" onClick={handleLogout}>Sair</button>
                    </div>
                )}
            </div>

            <div className="portal-content">
                {view === 'login' && (
                    <Login
                        onLogin={handleLogin}
                        onRegister={() => setView('register')}
                    />
                )}
                {view === 'register' && (
                    <Register
                        onSuccess={() => setView('login')}
                        onBack={() => setView('login')}
                    />
                )}
                {view === 'account' && token && client && (
                    <MyAccount token={token} client={client} />
                )}
            </div>

            <div className="portal-footer">
                <p>© 2024 GamePass Store - Todos os direitos reservados</p>
                <p className="footer-link">Precisa de ajuda? <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">Fale conosco</a></p>
            </div>
        </div>
    );
}
