-- ============================================
-- DROP TABLES (A ordem importa devido às chaves estrangeiras)
-- ============================================
DROP TABLE IF EXISTS Parcela CASCADE;
DROP TABLE IF EXISTS Emprestimo CASCADE;
DROP TABLE IF EXISTS Cliente CASCADE;

-- ============================================
-- TABELA CLIENTE
-- ============================================
CREATE TABLE IF NOT EXISTS Cliente (
    id_cliente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_cliente BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================
-- TABELA EMPRESTIMO
-- ============================================
CREATE TABLE IF NOT EXISTS Emprestimo (
    id_emprestimo SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    valor_emprestimo NUMERIC(10,2) NOT NULL,
    num_parcelas INT NOT NULL,
    valor_parcela NUMERIC(10,2) NOT NULL,
    juros NUMERIC(5,2) NOT NULL,
    tipo_juros VARCHAR(30) NOT NULL,
    data_emprestimo DATE NOT NULL,
    data_devolucao DATE,
    status_emprestimo BOOLEAN NOT NULL DEFAULT TRUE,
    forma_pagamento VARCHAR(30) DEFAULT NULL,

    CONSTRAINT fk_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES Cliente(id_cliente)
);

-- Usuários
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY, 
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- ============================================
-- TABELA PARCELA (O motor do nosso Caixa)
-- ============================================
CREATE TABLE IF NOT EXISTS Parcela (
    id_parcela SERIAL PRIMARY KEY,
    id_emprestimo INT NOT NULL,
    numero_parcela INT NOT NULL,
    valor_esperado NUMERIC(10,2) NOT NULL,
    valor_pago NUMERIC(10,2) DEFAULT 0.00,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status_parcela VARCHAR(20) DEFAULT 'pendente', -- Opções: 'pendente', 'pago', 'atrasado'

    CONSTRAINT fk_emprestimo
        FOREIGN KEY (id_emprestimo)
        REFERENCES Emprestimo(id_emprestimo)
        ON DELETE CASCADE
);

-- ============================================
-- TABELA USUARIO (Autenticação do Sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ============================================
-- INSERTS DE TESTE: CLIENTES
-- ============================================
INSERT INTO Cliente (nome, sobrenome, telefone, cidade, estado, status_cliente) VALUES
('Carlos', 'Eduardo Silva', '(11) 98765-4321', 'São Paulo', 'SP', TRUE),
('Ana', 'Beatriz Rodrigues', '(21) 99888-7766', 'Rio de Janeiro', 'RJ', TRUE),
('Mariana', 'Souza Costa', '(31) 98877-2233', 'Belo Horizonte', 'MG', TRUE),
('Ricardo', 'Almeida Santos', '(41) 97766-5544', 'Curitiba', 'PR', FALSE),
('Juliana', 'Fernandes Lima', '(81) 99111-2233', 'Recife', 'PE', TRUE);

-- ============================================
-- INSERTS DE TESTE: EMPRÉSTIMOS
-- ============================================
INSERT INTO Emprestimo (id_cliente, valor_emprestimo, num_parcelas, valor_parcela, juros, tipo_juros, data_emprestimo, data_devolucao, status_emprestimo) VALUES
-- 1. Empréstimo ativo para o Carlos
(1, 5000.00, 12, 458.33, 1.50, 'simples', '2026-01-15', NULL, TRUE),

-- 2. Empréstimo ativo para a Ana
(2, 10000.00, 24, 520.83, 2.00, 'compostos', '2026-03-10', NULL, TRUE),

-- 3. Empréstimo já finalizado/pago da Mariana
(3, 2000.00, 6, 350.00, 1.80, 'simples', '2025-06-01', '2025-12-01', FALSE);

-- ============================================
-- INSERTS DE TESTE: PARCELAS
-- ============================================
-- Parcelas do Carlos (Empréstimo 1) - Pagou 2, tem 1 atrasada e o resto pendente
INSERT INTO Parcela (id_emprestimo, numero_parcela, valor_esperado, valor_pago, data_vencimento, data_pagamento, status_parcela) VALUES
(1, 1, 458.33, 458.33, '2026-02-15', '2026-02-14', 'pago'),
(1, 2, 458.33, 458.33, '2026-03-15', '2026-03-15', 'pago'),
(1, 3, 458.33, 0.00, '2026-04-15', NULL, 'atrasado'),
(1, 4, 458.33, 0.00, '2026-05-15', NULL, 'pendente');

-- Parcelas da Ana (Empréstimo 2) - Pagou 1, o resto pendente
INSERT INTO Parcela (id_emprestimo, numero_parcela, valor_esperado, valor_pago, data_vencimento, data_pagamento, status_parcela) VALUES
(2, 1, 520.83, 520.83, '2026-04-10', '2026-04-10', 'pago'),
(2, 2, 520.83, 0.00, '2026-05-10', NULL, 'pendente'),
(2, 3, 520.83, 0.00, '2026-06-10', NULL, 'pendente');

-- Parcelas da Mariana (Empréstimo 3) - Tudo pago
INSERT INTO Parcela (id_emprestimo, numero_parcela, valor_esperado, valor_pago, data_vencimento, data_pagamento, status_parcela) VALUES
(3, 1, 350.00, 350.00, '2025-07-01', '2025-07-01', 'pago'),
(3, 2, 350.00, 350.00, '2025-08-01', '2025-08-02', 'pago'),
(3, 3, 350.00, 350.00, '2025-09-01', '2025-09-01', 'pago');

-- Usuário de teste inicial (Senha padrão para teste: admin123)
-- Nota: Em produção usaríamos bcrypt, mas para bater com seu middleware faremos a busca direta
INSERT INTO usuario (nome, email, senha, role) VALUES
('Administrador', 'admin@sistema.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;
