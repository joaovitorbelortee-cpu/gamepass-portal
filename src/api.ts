import { createClient } from '@supabase/supabase-js';

// Supabase config - uses same backend as main app
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cpzxslaufhomqxksyrwt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwenhzbGF1ZmhvbXF4a3N5cnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzQwNTUsImV4cCI6MjA4MDkxMDA1NX0.TDFb2CTXl6rocaRUbCNplaQ1d_zRrMmqhfQ1ncAiYmk';

console.log('🔗 Supabase URL:', SUPABASE_URL);
console.log('🔑 Supabase Key configured:', SUPABASE_ANON_KEY ? 'Yes' : 'No');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const portalAPI = {
    async login(email: string, password: string) {
        try {
            const { data: client, error } = await supabase
                .from('clients')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !client) {
                throw new Error('Cliente não encontrado');
            }

            if (client.password_hash !== password && client.password !== password) {
                throw new Error('Senha incorreta');
            }

            return {
                token: `mock-token-${client.id}`,
                client: {
                    id: client.id,
                    name: client.name,
                    email: client.email
                }
            };
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            throw error;
        }
    },

    async register(clientData: { email: string; password: string; name: string; whatsapp: string }) {
        console.log('📝 Iniciando registro para:', clientData.email);
        try {
            // Check if email already exists
            const { data: existing, error: searchError } = await supabase
                .from('clients')
                .select('id')
                .eq('email', clientData.email)
                .maybeSingle();

            if (searchError) {
                console.error('❌ Erro ao verificar email:', searchError);
                throw new Error(`Erro ao verificar email: ${searchError.message}`);
            }

            if (existing) {
                throw new Error('Email já cadastrado');
            }

            console.log('✅ Email disponível, inserindo cliente...');

            const { data, error } = await supabase
                .from('clients')
                .insert([{
                    name: clientData.name,
                    email: clientData.email,
                    whatsapp: clientData.whatsapp || '',
                    password_hash: clientData.password,
                    tag: 'novo'
                }])
                .select()
                .single();

            if (error) {
                console.error('❌ Erro ao inserir cliente:', error);
                throw new Error(`Erro ao cadastrar: ${error.message}`);
            }

            console.log('✅ Cliente cadastrado com sucesso:', data);
            return data;
        } catch (error: any) {
            console.error('❌ Erro no registro:', error);
            if (error.message?.includes('Failed to fetch')) {
                throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
            }
            throw error;
        }
    },

    async verify(token: string) {
        if (!token.startsWith('mock-token-')) {
            throw new Error('Token inválido');
        }
        const id = token.replace('mock-token-', '');

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getMyAccount(clientId: string | number) {
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('client_id', String(clientId))
                .neq('status', 'expired')
                .order('purchase_date', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code === 'PGRST116') {
                const { data: lastAccount, error: lastError } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('client_id', String(clientId))
                    .order('purchase_date', { ascending: false })
                    .limit(1)
                    .single();

                if (lastError) return null;
                return lastAccount;
            }

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar conta:', error);
            throw error;
        }
    },

    async getPurchases(clientId: string | number) {
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('id, email, password, expiry_date, status, purchase_date, sale_price')
                .eq('client_id', String(clientId))
                .order('purchase_date', { ascending: false });

            if (error) throw error;
            return data?.map(acc => ({
                id: acc.id,
                purchase_date: acc.purchase_date,
                sale_price: acc.sale_price,
                account_email: acc.email,
                expiry_date: acc.expiry_date,
                status: acc.status
            })) || [];
        } catch (error) {
            console.error('Erro ao buscar compras:', error);
            throw error;
        }
    }
};

// ==========================================
// N8N INTEGRATION
// ==========================================

const N8N_NEW_SALE_URL = import.meta.env.VITE_N8N_NEW_SALE_URL || 'https://exclusiveboss.app.n8n.cloud/webhook/new-sale';
const N8N_RENEWAL_URL = import.meta.env.VITE_N8N_RENEWAL_URL || 'https://exclusiveboss.app.n8n.cloud/webhook/renewal-confirmed';
const N8N_WEBHOOK_SECRET = import.meta.env.VITE_N8N_WEBHOOK_SECRET || 'vDgDXXS2Y8K3bQtVVNUfqJSkTtGJDWR1';

async function postToN8n(url: string, payload: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; error?: string }> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': N8N_WEBHOOK_SECRET,
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            return { ok: true, data };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Attempt ${attempt} failed:`, errorMessage);
            if (attempt === 3) {
                return { ok: false, error: errorMessage };
            }
        }
    }
    return { ok: false, error: 'All attempts failed' };
}

export async function sendNewSale(payload: {
    client_name?: string;
    client_email: string;
    client_whatsapp?: string;
    portal_link?: string;
    expiry_date?: string;
    payment_id: string;
    account_email?: string;
    account_password?: string;
}) {
    return postToN8n(N8N_NEW_SALE_URL, payload);
}

export async function sendRenewal(payload: {
    client_email: string;
    new_expiry_date: string;
    payment_id: string;
}) {
    return postToN8n(N8N_RENEWAL_URL, payload);
}
