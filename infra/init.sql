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
    data_emprestimo DATE NOT NULL,
    data_devolucao DATE,
    status_emprestimo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES Cliente(id_cliente)
);