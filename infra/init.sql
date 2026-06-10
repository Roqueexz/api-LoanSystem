    -- ============================================
    -- DROP TABLES (Ordem correta para evitar erros de FK)
    -- ============================================
    DROP TABLE IF EXISTS "Emprestimo" CASCADE;
    DROP TABLE IF EXISTS "Cliente" CASCADE;

    CREATE TABLE IF NOT EXISTS Cliente (
        id_cliente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nome VARCHAR(80) NOT NULL,
        sobrenome VARCHAR(100) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Emprestimo (
        id_emprestimo SERIAL PRIMARY KEY,
        id_cliente INT REFERENCES Cliente(id_cliente),
        valor_emprestimo NUMERIC(10, 2) NOT NULL,
        num_parcelas INT NOT NULL,
        juros_mensal NUMERIC(5, 2) NOT NULL,
        data_emprestimo DATE NOT NULL,
        data_pagamento DATE,
        status_emprestimo VARCHAR(20) NOT NULL CHECK (status_emprestimo IN ('ativo', 'finalizado', 'atrasado')),
        status_parcela VARCHAR(20) NOT NULL CHECK (status_parcela IN ('pago', 'pendente', 'atrasado'))
    );  