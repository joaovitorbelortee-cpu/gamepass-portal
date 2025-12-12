import { useState } from 'react';
import { portalAPI } from './api';

interface RegisterProps {
    onSuccess: () => void;
    onBack: () => void;
}

export default function Register({ onSuccess, onBack }: RegisterProps) {
    const [step, setStep] = useState<'email' | 'password'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [clientName, setClientName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            setClientName('Cliente');
            setStep('password');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não conferem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            await portalAPI.register({
                email,
                password: password,
                name: clientName || 'Novo Cliente',
                whatsapp: ''
            });

            alert('Cadastro realizado com sucesso! Faça login.');
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro ao cadastrar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="portal-card">
            <div className="card-header">
                <h1>{step === 'email' ? 'Primeiro Acesso' : `Olá, ${clientName}!`}</h1>
                <p>
                    {step === 'email'
                        ? 'Digite o email usado na compra'
                        : 'Crie uma senha para acessar o portal'}
                </p>
            </div>

            {step === 'email' ? (
                <form onSubmit={handleCheckEmail} className="portal-form">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email da compra</label>
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
                        {loading ? 'Verificando...' : 'Continuar'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleRegister} className="portal-form">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">Nova senha</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirmar senha</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Digite novamente"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Cadastrando...' : 'Criar minha conta'}
                    </button>
                </form>
            )}

            <div className="card-footer">
                <button className="btn-link" onClick={step === 'email' ? onBack : () => setStep('email')}>
                    ← Voltar
                </button>
            </div>
        </div>
    );
}
