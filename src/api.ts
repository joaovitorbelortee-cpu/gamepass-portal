import { createClient } from '@supabase/supabase-js';

// Supabase config - uses same backend as main app
// Supabase config - FORCE CORRECT PROJECT
const SUPABASE_URL = 'https://cpzxslaufhomqxksyrwt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwenhzbGF1ZmhvbXF4a3N5cnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzQwNTUsImV4cCI6MjA4MDkxMDA1NX0.TDFb2CTXl6rocaRUbCNplaQ1d_zRrMmqhfQ1ncAiYmk';

console.log('🔗 Supabase URL:', SUPABASE_URL);
console.log('🔑 Supabase Key configured:', SUPABASE_ANON_KEY ? 'Yes' : 'No');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const portalAPI = {
    async login(email: string) {
        try {
            const { data: client, error } = await supabase
                .from('clients')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !client) {
                console.log('Cliente não encontrado, tentando criar temporário se houver venda...');
                // Em um cenário ideal, o n8n já criou. Se não, não permitimos login.
                throw new Error('Email não encontrado. Verifique se você digitou corretamente ou se já realizou uma compra.');
            }

            // Removida verificação de senha
            // if (client.password_hash !== password && client.password !== password) { ... }

            // Check if client has a purchase
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('id')
                .eq('client_id', client.id)
                .limit(1);

            if (salesError) {
                console.error('Erro ao verificar compras:', salesError);
                throw new Error('Erro ao verificar sua conta. Tente novamente.');
            }

            if (!sales || sales.length === 0) {
                throw new Error('Nenhuma compra ativa encontrada para este email.');
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
            console.log('🔍 Buscando conta para cliente:', clientId);

            // 1. Get Sales first
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('client_id', String(clientId))
                .order('created_at', { ascending: false })
                .limit(1);

            if (salesError) {
                console.error('❌ Erro ao buscar sales:', salesError);
                throw salesError;
            }

            if (!sales || sales.length === 0) {
                console.log('⚠️ Nenhuma venda encontrada para este cliente.');
                return null;
            }

            const sale = sales[0];
            console.log('✅ Venda encontrada:', sale);

            if (!sale.account_id) {
                console.log('⚠️ Venda sem account_id vinculado.');
                return null;
            }

            // 2. Get Account
            const { data: account, error: accountError } = await supabase
                .from('accounts')
                .select('*')
                .eq('id', sale.account_id)
                .single();

            if (accountError) {
                console.error('❌ Erro ao buscar conta vinculada:', accountError);
                // If account deleted/missing, standard error or null?
                // Throwing allows UI to see "Error loading" which might be better than silent fail
                throw accountError;
            }

            console.log('✅ Conta encontrada:', account);
            return account;

        } catch (error) {
            console.error('❌ Erro fatal em getMyAccount:', error);
            throw error;
        }
    },

    async getPurchases(clientId: string | number) {
        try {
            // 1. Get all sales
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('client_id', String(clientId))
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;
            if (!sales || sales.length === 0) return [];

            // 2. Get all accounts for these sales
            const accountIds = sales.map(s => s.account_id).filter(Boolean);

            if (accountIds.length === 0) return [];

            const { data: accounts, error: accountsError } = await supabase
                .from('accounts')
                .select('*')
                .in('id', accountIds);

            if (accountsError) throw accountsError;

            // 3. Merge manually
            return sales.map(sale => {
                const account = accounts?.find(a => a.id === sale.account_id);
                return {
                    id: account?.id,
                    email: account?.email, // account email (product)
                    password: account?.password,
                    expiry_date: account?.expiry_date,
                    status: account?.status,
                    purchase_date: sale.created_at,
                    price: sale.sale_price || sale.amount // fallback if column name differs
                };
            });
        } catch (error) {
            console.error('❌ Erro fatal em getPurchases:', error);
            throw error;
        }
    }
};

// ==========================================
// N8N INTEGRATION
// ==========================================

const N8N_NEW_SALE_URL = import.meta.env.VITE_N8N_NEW_SALE_URL || 'https://makemoneyer.app.n8n.cloud/webhook/new-sale';
const N8N_RENEWAL_URL = import.meta.env.VITE_N8N_RENEWAL_URL || 'https://makemoneyer.app.n8n.cloud/webhook/new-sale';
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
