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
            // Primeiro, verificar se cliente já existe
            const { data: existingClient, error: searchError } = await supabase
                .from('clients')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (searchError) {
                console.error('❌ Erro ao buscar cliente:', searchError);
                throw new Error('Erro ao verificar email. Tente novamente.');
            }

            // Se cliente já existe, fazer login normal
            if (existingClient) {
                console.log('✅ Cliente existente, permitindo login:', existingClient.email);
                // Token baseado em EMAIL para evitar problemas com UUID
                return {
                    token: `email-token-${btoa(existingClient.email)}`,
                    client: {
                        id: existingClient.id,
                        name: existingClient.name || 'Cliente',
                        email: existingClient.email
                    }
                };
            }

            // Cliente novo - atribuir conta automaticamente via RPC
            console.log('🆕 Email novo detectado, atribuindo conta automaticamente:', email);

            const { data: result, error: rpcError } = await supabase
                .rpc('assign_account_to_buyer', {
                    p_buyer_email: email,
                    p_buyer_name: 'Cliente GamePass'
                });

            if (rpcError) {
                console.error('❌ Erro ao atribuir conta:', rpcError);
                throw new Error('Erro ao atribuir conta. Tente novamente.');
            }

            // Verificar resultado da atribuição
            const assignResult = result?.[0];

            if (!assignResult?.success) {
                console.log('⚠️ Nenhuma conta disponível:', assignResult?.error_message);
                throw new Error(assignResult?.error_message || 'Nenhuma conta GamePass disponível no momento. Por favor, aguarde novas contas serem adicionadas.');
            }

            console.log('✅ Conta atribuída com sucesso:', assignResult.account_email);

            // Buscar o cliente recém-criado
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('email', email)
                .single();

            if (clientError || !newClient) {
                console.error('❌ Erro ao buscar novo cliente:', clientError);
                throw new Error('Conta atribuída mas erro ao carregar dados. Faça login novamente.');
            }

            return {
                token: `email-token-${btoa(newClient.email)}`,
                client: {
                    id: newClient.id,
                    name: newClient.name || 'Cliente',
                    email: newClient.email
                },
                accountAssigned: {
                    email: assignResult.account_email,
                    password: assignResult.account_password,
                    expiry_date: assignResult.expiry_date
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
        // Suporta token antigo (mock-token-ID) e novo (email-token-BASE64)
        let email = '';

        if (token.startsWith('email-token-')) {
            // Novo formato: email-token-BASE64EMAIL
            try {
                email = atob(token.replace('email-token-', ''));
            } catch {
                throw new Error('Token inválido');
            }
        } else if (token.startsWith('mock-token-')) {
            // Formato antigo: mock-token-UUID (buscar por ID)
            const id = token.replace('mock-token-', '');
            if (!id) throw new Error('Token inválido');

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) throw new Error('Cliente não encontrado');
            return data;
        } else {
            throw new Error('Token inválido');
        }

        // Buscar cliente por email
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) throw new Error('Cliente não encontrado');
        return data;
    },

    async getMyAccount(clientIdOrEmail: string | number) {
        try {
            let email = '';

            // Se for email (contém @), usar direto
            if (typeof clientIdOrEmail === 'string' && clientIdOrEmail.includes('@')) {
                email = clientIdOrEmail;
            } else {
                // Se for ID, buscar o email do cliente
                const { data: client, error: clientError } = await supabase
                    .from('clients')
                    .select('email')
                    .eq('id', clientIdOrEmail)
                    .single();

                if (clientError || !client?.email) {
                    console.error('❌ Erro ao buscar cliente:', clientError);
                    return null;
                }
                email = client.email;
            }

            console.log('🔍 Buscando conta para email:', email);

            // Buscar conta diretamente pelo sold_to_email (email do comprador)
            const { data: account, error: accountError } = await supabase
                .from('accounts')
                .select('*')
                .eq('sold_to_email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (accountError) {
                console.error('❌ Erro ao buscar conta:', accountError);
                throw accountError;
            }

            if (!account) {
                console.log('⚠️ Nenhuma conta encontrada para este email.');
                return null;
            }

            console.log('✅ Conta encontrada:', account);
            return account;

        } catch (error) {
            console.error('❌ Erro fatal em getMyAccount:', error);
            throw error;
        }
    },

    async getPurchases(clientIdOrEmail: string | number) {
        try {
            let email = '';

            if (typeof clientIdOrEmail === 'string' && clientIdOrEmail.includes('@')) {
                email = clientIdOrEmail;
            } else {
                // Buscar o email do cliente pelo ID
                const { data: client, error: clientError } = await supabase
                    .from('clients')
                    .select('email')
                    .eq('id', clientIdOrEmail)
                    .single();

                if (clientError || !client?.email) {
                    return [];
                }
                email = client.email;
            }

            // Buscar todas as contas vinculadas a este email

            // Buscar todas as contas vinculadas a este email
            const { data: accounts, error: accountsError } = await supabase
                .from('accounts')
                .select('*')
                .eq('sold_to_email', email)
                .order('created_at', { ascending: false });

            if (accountsError) throw accountsError;
            if (!accounts || accounts.length === 0) return [];

            // Formatar como compras
            return accounts.map(account => ({
                id: account.id,
                email: account.email,
                password: account.password,
                expiry_date: account.expiry_date,
                status: account.status,
                purchase_date: account.created_at,
                price: account.cost || 69
            }));
        } catch (error) {
            console.error('❌ Erro fatal em getPurchases:', error);
            throw error;
        }
    }
};

// ==========================================
// N8N INTEGRATION
// ==========================================

const N8N_NEW_SALE_URL = import.meta.env.VITE_N8N_NEW_SALE_URL || '';
const N8N_RENEWAL_URL = import.meta.env.VITE_N8N_RENEWAL_URL || '';
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
