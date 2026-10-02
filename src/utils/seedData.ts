import { Expense } from '../types/expense';

export function generateSeedExpenses(): Expense[] {
  // Expenses strictly starting from day 26 (2026-09-26) to today (2026-10-01)
  // Total sum = R$ 384,00 distributed daily, so "Hoje" is only R$ 52,00, not 384!
  return [
    // 26 de Setembro (Total: R$ 120,50)
    {
      id: 'exp-26-1',
      amount: 35.0,
      description: 'Almoço no Restaurante',
      category: 'Alimentação',
      date: '2026-09-26',
      paymentMethod: 'Pix',
      createdAt: 1790424000000,
    },
    {
      id: 'exp-26-2',
      amount: 78.5,
      description: 'Mercado Hortifruti & Itens Básicos',
      category: 'Alimentação',
      date: '2026-09-26',
      paymentMethod: 'Cartão de Débito',
      createdAt: 1790431200000,
    },
    {
      id: 'exp-26-3',
      amount: 7.0,
      description: 'Café Expresso',
      category: 'Alimentação',
      date: '2026-09-26',
      paymentMethod: 'Pix',
      createdAt: 1790442000000,
    },

    // 27 de Setembro (Total: R$ 59,50)
    {
      id: 'exp-27-1',
      amount: 35.0,
      description: 'Almoço Quilo Executivo',
      category: 'Alimentação',
      date: '2026-09-27',
      paymentMethod: 'Pix',
      createdAt: 1790510400000,
    },
    {
      id: 'exp-27-2',
      amount: 24.5,
      description: 'Uber Retorno Trabalho',
      category: 'Transporte',
      date: '2026-09-27',
      paymentMethod: 'Cartão de Crédito',
      createdAt: 1790528400000,
    },

    // 28 de Setembro (Total: R$ 64,00)
    {
      id: 'exp-28-1',
      amount: 42.0,
      description: 'Farmácia Remédio Dor de Cabeça',
      category: 'Saúde',
      date: '2026-09-28',
      paymentMethod: 'Cartão de Crédito',
      createdAt: 1790596800000,
    },
    {
      id: 'exp-28-2',
      amount: 22.0,
      description: 'Lanche da Tarde',
      category: 'Alimentação',
      date: '2026-09-28',
      paymentMethod: 'Pix',
      createdAt: 1790614800000,
    },

    // 29 de Setembro (Total: R$ 42,00)
    {
      id: 'exp-29-1',
      amount: 35.0,
      description: 'Almoço Prato Feito',
      category: 'Alimentação',
      date: '2026-09-29',
      paymentMethod: 'Pix',
      createdAt: 1790683200000,
    },
    {
      id: 'exp-29-2',
      amount: 7.0,
      description: 'Café & Água',
      category: 'Alimentação',
      date: '2026-09-29',
      paymentMethod: 'Pix',
      createdAt: 1790701200000,
    },

    // 30 de Setembro (Total: R$ 46,00)
    {
      id: 'exp-30-1',
      amount: 28.0,
      description: 'Transporte / Aplicativo',
      category: 'Transporte',
      date: '2026-09-30',
      paymentMethod: 'Cartão de Débito',
      createdAt: 1790769600000,
    },
    {
      id: 'exp-30-2',
      amount: 18.0,
      description: 'Padaria Café da Manhã',
      category: 'Alimentação',
      date: '2026-09-30',
      paymentMethod: 'Pix',
      createdAt: 1790787600000,
    },

    // 01 de Outubro (Hoje - Total: R$ 52,00)
    {
      id: 'exp-01-1',
      amount: 35.0,
      description: 'Almoço Restaurante',
      category: 'Alimentação',
      date: '2026-10-01',
      paymentMethod: 'Cartão de Débito',
      createdAt: Date.now() - 1000 * 60 * 60 * 3,
    },
    {
      id: 'exp-01-2',
      amount: 7.0,
      description: 'Café Expresso',
      category: 'Alimentação',
      date: '2026-10-01',
      paymentMethod: 'Pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
    },
    {
      id: 'exp-01-3',
      amount: 10.0,
      description: 'Recarga Transporte Metrô',
      category: 'Transporte',
      date: '2026-10-01',
      paymentMethod: 'Pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 7,
    },
  ];
}
