-- ============================================
-- DROP TABLES (Sem aspas para bater com a criação)
-- ============================================
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
    tipo_juros VARCHAR(30) NOT NULL, -- Coluna adicionada para corrigir o erro 42703
    data_emprestimo DATE NOT NULL,
    data_devolucao DATE,
    status_emprestimo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES Cliente(id_cliente)
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
-- Empréstimo ativo para o Carlos (ID 1)
(1, 5000.00, 12, 458.33, 1.50, 'simples', '2026-01-15', NULL, TRUE),

-- Empréstimo ativo para a Ana (ID 2)
(2, 10000.00, 24, 520.83, 2.00, 'compostos', '2026-03-10', NULL, TRUE),

-- Empréstimo já finalizado/pago da Mariana (ID 3)
(3, 2000.00, 6, 350.00, 1.80, 'simples', '2025-06-01', '2025-12-01', FALSE),

-- Empréstimo ativo recente para a Mariana (ID 3)
(3, 3500.00, 10, 395.00, 1.28, 'compostos', '2026-05-20', NULL, TRUE),

-- Empréstimo finalizado do Ricardo (ID 4)
(4, 1500.00, 4, 400.00, 2.50, 'simples', '2025-02-10', '2025-06-10', FALSE);