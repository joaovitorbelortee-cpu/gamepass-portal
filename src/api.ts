import { createClient } from '@supabase/supabase-js';

// Supabase config - uses same backend as main app
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tbnafolszkclonzxjivy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibmFmb2xzemtjbG9uenhqaXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2NjM3MjUsImV4cCI6MjA0ODIzOTcyNX0.dF_6Xf8mSoEqEZd3GQl9T0cKQgzAR1Q8_D5c22QCjk8';

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
        try {
            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('email', clientData.email)
                .single();

            if (existing) {
                throw new Error('Email já cadastrado');
            }

            const { data, error } = await supabase
                .from('clients')
                .insert([{
                    name: clientData.name,
                    email: clientData.email,
                    whatsapp: clientData.whatsapp,
                    password_hash: clientData.password,
                    tag: 'novo'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao registrar:', error);
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
