import { useState, useEffect } from 'react';
import { portalAPI } from './api';

interface MyAccountProps {
    token: string;
    client: {
        id: number;
        name: string;
        email: string;
    };
}

interface Account {
    id: number;
    email: string;
    password: string;
    expiry_date: string;
    status: string;
    days_left: number;
    purchase_date: string;
    sale_price: number;
}

interface Purchase {
    id: number;
    purchase_date: string;
    sale_price: number;
    account_email: string;
    expiry_date: string;
    status: string;
}

export default function MyAccount({ token, client }: MyAccountProps) {
    const [account, setAccount] = useState<Account | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [token]);

    const loadData = async () => {
        try {
            const [accountData, purchasesData] = await Promise.all([
                portalAPI.getMyAccount(client.id),
                portalAPI.getPurchases(client.id)
            ]);

            if (accountData) {
                setAccount(accountData as any);
            }

            if (purchasesData) {
                setPurchases(purchasesData as any);
            }
        } catch (err: any) {
            console.error(err);
            setError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getStatusInfo = (status: string, daysLeft: number) => {
        if (status === 'expired' || daysLeft <= 0) {
            return { label: 'Expirada', class: 'status-expired', icon: '❌' };
        }
        if (status === 'expiring' || daysLeft <= 7) {
            return { label: `Vence em ${daysLeft} dias`, class: 'status-expiring', icon: '⚠️' };
        }
        return { label: 'Ativa', class: 'status-active', icon: '✅' };
    };

    if (loading) {
        return (
            <div className="portal-loading">
                <div className="loading-spinner"></div>
                <p>Carregando sua conta...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="portal-card">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="portal-card">
                <div className="card-header">
                    <h1>Minha Conta</h1>
                </div>
                <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <p>Nenhuma conta ativa encontrada</p>
                    <p className="empty-hint">Após realizar uma compra, sua conta aparecerá aqui.</p>
                </div>
            </div>
        );
    }

    const statusInfo = getStatusInfo(account.status, account.days_left);

    return (
        <div className="my-account">
            <div className="portal-card account-card">
                <div className="account-header">
                    <div className="account-status">
                        <span className={`status-badge ${statusInfo.class}`}>
                            {statusInfo.icon} {statusInfo.label}
                        </span>
                    </div>
                    <h2>GamePass Ultimate</h2>
                </div>

                <div className="account-credentials">
                    <div className="credential-item">
                        <label>📧 Email da conta</label>
                        <div className="credential-value">
                            <span>{account.email}</span>
                            <button
                                className={`copy-btn ${copied === 'email' ? 'copied' : ''}`}
                                onClick={() => copyToClipboard(account.email, 'email')}
                            >
                                {copied === 'email' ? '✓ Copiado!' : '📋 Copiar'}
                            </button>
                        </div>
                    </div>

                    <div className="credential-item">
                        <label>🔐 Senha da conta</label>
                        <div className="credential-value">
                            <span className="password-field">
                                {showPassword ? account.password : '••••••••••'}
                            </span>
                            <button
                                className="show-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈 Ocultar' : '👁 Ver'}
                            </button>
                            <button
                                className={`copy-btn ${copied === 'password' ? 'copied' : ''}`}
                                onClick={() => copyToClipboard(account.password, 'password')}
                            >
                                {copied === 'password' ? '✓ Copiado!' : '📋 Copiar'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="account-info">
                    <div className="info-item">
                        <span className="info-label">📅 Comprado em</span>
                        <span className="info-value">{formatDate(account.purchase_date)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">⏰ Válido até</span>
                        <span className="info-value">{formatDate(account.expiry_date)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">📊 Dias restantes</span>
                        <span className={`info-value ${account.days_left <= 7 ? 'warning' : ''}`}>
                            {account.days_left > 0 ? `${account.days_left} dias` : 'Expirado'}
                        </span>
                    </div>
                </div>

                <div className="renew-section">
                    <a
                        href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Quero renovar minha conta GamePass\n\nEmail: ${client.email}\nConta atual: ${account.email}\nVence em: ${formatDate(account.expiry_date)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="renew-btn full-width"
                    >
                        🔄 Renovar Conta
                    </a>
                </div>

                {account.days_left <= 7 && account.days_left > 0 && (
                    <div className="renew-banner">
                        <div className="renew-content">
                            <span className="renew-icon">🔄</span>
                            <div className="renew-text">
                                <strong>Sua conta vence em breve!</strong>
                                <p>Renove agora e garanta desconto de cliente fiel</p>
                            </div>
                        </div>
                        <a
                            href="https://wa.me/5511999999999?text=Olá! Quero renovar minha conta GamePass"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="renew-btn"
                        >
                            Renovar Agora
                        </a>
                    </div>
                )}

                {account.days_left <= 0 && (
                    <div className="expired-banner">
                        <div className="expired-content">
                            <span className="expired-icon">⚠️</span>
                            <div className="expired-text">
                                <strong>Sua conta expirou</strong>
                                <p>Adquira uma nova conta para continuar jogando</p>
                            </div>
                        </div>
                        <a
                            href="https://wa.me/5511999999999?text=Olá! Quero comprar uma nova conta GamePass"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="renew-btn"
                        >
                            Comprar Nova
                        </a>
                    </div>
                )}
            </div>

            {purchases.length > 1 && (
                <div className="portal-card">
                    <div className="card-header">
                        <h2>📜 Histórico de Compras</h2>
                    </div>
                    <div className="purchases-list">
                        {purchases.map((purchase, index) => (
                            <div key={purchase.id} className={`purchase-item ${index === 0 ? 'current' : ''}`}>
                                <div className="purchase-info">
                                    <span className="purchase-date">{formatDate(purchase.purchase_date)}</span>
                                    <span className="purchase-account">{purchase.account_email}</span>
                                </div>
                                <div className="purchase-meta">
                                    <span className="purchase-price">{formatCurrency(purchase.sale_price)}</span>
                                    {index === 0 && <span className="current-badge">Atual</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="help-section">
                <p>Precisa de ajuda?</p>
                <a
                    href="https://wa.me/5511999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="help-btn"
                >
                    💬 Falar no WhatsApp
                </a>
            </div>
        </div>
    );
}
