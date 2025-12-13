import { useState } from 'react';
import { portalAPI } from './api';

interface LoginProps {
    onLogin: (token: string, client: { id: number; name: string; email: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await portalAPI.login(email);
            onLogin(data.token, data.client);
        } catch (err: any) {
            setError(err.message || 'Erro ao entrar. Verifique se o email é o mesmo da compra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="portal-card">
            <div className="card-header">
                <h1>Entrar</h1>
                <p>Use o email da sua compra</p>
            </div>

            <form onSubmit={handleSubmit} className="portal-form">
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">Email da Compra</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        autoComplete="email"
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Verificando...' : 'Acessar'}
                </button>
            </form>
        </div>
    );
}
