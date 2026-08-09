-- ============================================
-- LoanSystem — init.sql
-- Última atualização: Sprint 12 (avatar_url, isolamento por usuario)
--
-- ATENÇÃO: Este script DESTRÓI e RECRIA todas as tabelas.
--          Use apenas em ambientes de desenvolvimento.
--          Em produção, utilize migrations incrementais.
-- ============================================


-- ============================================
-- DROP TABLES
-- A ordem importa: tabelas dependentes primeiro.
-- ============================================
DROP TABLE IF EXISTS notificacao CASCADE;
DROP TABLE IF EXISTS notificacao_preferencia CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_meta CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_conta CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_movimentacao CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_cofre CASCADE;
DROP TABLE IF EXISTS Parcela CASCADE;
DROP TABLE IF EXISTS Emprestimo CASCADE;
DROP TABLE IF EXISTS Cliente CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;


-- ============================================
-- TABELA USUARIO
-- Criada ANTES de Cliente e Emprestimo,
-- pois ambas referenciam usuario(id_usuario).
-- Sprint 12: adicionado campo avatar_url.
-- ============================================
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario  SERIAL PRIMARY KEY,
    nome        VARCHAR(80)  NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    senha       VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'admin',
    avatar_url  VARCHAR(500) NULL,            -- Sprint 12: foto de perfil (URL local ou CDN)
    criado_em   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TABELA CLIENTE
-- Sprint 12: adicionado id_usuario para garantir
-- isolamento completo de dados por usuário,
-- seguindo o princípio de segurança do sistema.
-- ============================================
CREATE TABLE IF NOT EXISTS cliente (
    id_cliente      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario      INT          NOT NULL,                -- proprietário do registro
    nome            VARCHAR(80)  NOT NULL,
    sobrenome       VARCHAR(100) NOT NULL,
    telefone        VARCHAR(20)  NOT NULL,
    cidade          VARCHAR(100) NOT NULL,
    estado          VARCHAR(2)   NOT NULL,
    criado_em       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    status_cliente  BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_cliente_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cliente_usuario ON cliente(id_usuario);


-- ============================================
-- TABELA EMPRESTIMO
-- Sprint 12: adicionado id_usuario para:
--   1. Isolar empréstimos por usuário.
--   2. Suportar o filtro já usado em Calendario.ts
--      (resolverFiltroEmprestimo detecta a coluna via information_schema).
--   3. Registrar movimentações automáticas vinculadas ao usuário correto.
-- ============================================
CREATE TABLE IF NOT EXISTS emprestimo (
    id_emprestimo       SERIAL PRIMARY KEY,
    id_usuario          INT          NOT NULL,            -- proprietário do registro
    id_cliente          INT          NOT NULL,
    valor_emprestimo    NUMERIC(10,2) NOT NULL,
    num_parcelas        INT          NOT NULL,
    valor_parcela       NUMERIC(10,2) NOT NULL,
    juros               NUMERIC(5,2) NOT NULL,
    tipo_juros          VARCHAR(30)  NOT NULL,
    data_emprestimo     DATE         NOT NULL,
    data_devolucao      DATE,
    status_emprestimo   BOOLEAN      NOT NULL DEFAULT TRUE,
    forma_pagamento     VARCHAR(30)  DEFAULT NULL,
    criado_em           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_emprestimo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_emprestimo_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
);

CREATE INDEX IF NOT EXISTS idx_emprestimo_usuario  ON emprestimo(id_usuario);
CREATE INDEX IF NOT EXISTS idx_emprestimo_cliente  ON emprestimo(id_cliente);


-- ============================================
-- TABELA PARCELA
-- ============================================
CREATE TABLE IF NOT EXISTS parcela (
    id_parcela      SERIAL PRIMARY KEY,
    id_emprestimo   INT          NOT NULL,
    numero_parcela  INT          NOT NULL,
    valor_esperado  NUMERIC(10,2) NOT NULL,
    valor_pago      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    data_vencimento DATE         NOT NULL,
    data_pagamento  DATE,
    status_parcela  VARCHAR(20)  NOT NULL DEFAULT 'pendente'
                        CHECK (status_parcela IN ('pendente', 'pago')),
    -- 'atrasado' NÃO é gravado aqui: é calculado pela aplicação
    -- comparando data_vencimento com a data atual em tempo real.

    CONSTRAINT fk_parcela_emprestimo
        FOREIGN KEY (id_emprestimo)
        REFERENCES emprestimo(id_emprestimo)
        ON DELETE CASCADE,

    CONSTRAINT uq_parcela_numero
        UNIQUE (id_emprestimo, numero_parcela)
);

CREATE INDEX IF NOT EXISTS idx_parcela_emprestimo ON parcela(id_emprestimo);
CREATE INDEX IF NOT EXISTS idx_parcela_vencimento ON parcela(data_vencimento);


-- ============================================
-- TABELA CAIXA PESSOAL — COFRE FÍSICO
-- Sprint 2: controle de cédulas por usuário.
-- UNIQUE(id_usuario, valor_cedula) garante
-- uma linha por cédula por usuário.
-- UPSERT é usado na atualização.
-- ============================================
CREATE TABLE IF NOT EXISTS caixa_pessoal_cofre (
    id_cofre        SERIAL PRIMARY KEY,
    id_usuario      INT          NOT NULL,
    valor_cedula    NUMERIC(6,2) NOT NULL,   -- 1, 2, 5, 10, 20, 50, 100, 200
    quantidade      INT          NOT NULL DEFAULT 0
                        CHECK (quantidade >= 0),
    atualizado_em   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cofre_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_cofre_cedula
        UNIQUE (id_usuario, valor_cedula)
);

CREATE INDEX IF NOT EXISTS idx_cofre_usuario ON caixa_pessoal_cofre(id_usuario);


-- ============================================
-- TABELA CAIXA PESSOAL — MOVIMENTAÇÕES
-- Sprint 3: entradas e saídas com categoria.
-- ============================================
CREATE TABLE IF NOT EXISTS caixa_pessoal_movimentacao (
    id_movimentacao SERIAL PRIMARY KEY,
    id_usuario      INT          NOT NULL,
    tipo            VARCHAR(10)  NOT NULL
                        CHECK (tipo IN ('entrada', 'saida')),
    valor           NUMERIC(10,2) NOT NULL
                        CHECK (valor > 0),
    categoria       VARCHAR(60)  NOT NULL,
    descricao       VARCHAR(255),
    data            DATE         NOT NULL DEFAULT CURRENT_DATE,
    criado_em       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movimentacao_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_movimentacao_usuario ON caixa_pessoal_movimentacao(id_usuario);
CREATE INDEX IF NOT EXISTS idx_movimentacao_data    ON caixa_pessoal_movimentacao(data);


-- ============================================
-- TABELA CAIXA PESSOAL — CONTAS
-- Sprint 4 (base) + Sprint 6 (campos extras):
--   categoria, recorrencia, lembrete_dias_antes,
--   observacao e status incorporados diretamente
--   na criação da tabela (sem necessidade de migração).
-- ============================================
CREATE TABLE IF NOT EXISTS caixa_pessoal_conta (
    id_conta            SERIAL PRIMARY KEY,
    id_usuario          INT          NOT NULL,
    tipo                VARCHAR(10)  NOT NULL
                            CHECK (tipo IN ('pagar', 'receber')),
    descricao           VARCHAR(255) NOT NULL,
    valor               NUMERIC(10,2) NOT NULL
                            CHECK (valor > 0),
    vencimento          DATE         NOT NULL,
    pago                BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Campos adicionados na Sprint 6
    categoria           VARCHAR(100),
    recorrencia         VARCHAR(20)  NOT NULL DEFAULT 'unica'
                            CHECK (recorrencia IN ('unica', 'diaria', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
    prioridade          VARCHAR(10)  NOT NULL DEFAULT 'media'
                            CHECK (prioridade IN ('alta', 'media', 'baixa')),
    tags                TEXT[],
    lembrete_dias_antes INTEGER,
    observacao          TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('programada', 'pendente', 'paga', 'atrasada', 'cancelada')),

    criado_em           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_conta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conta_usuario    ON caixa_pessoal_conta(id_usuario);
CREATE INDEX IF NOT EXISTS idx_conta_vencimento ON caixa_pessoal_conta(vencimento);


-- ============================================
-- TABELA CAIXA PESSOAL — METAS FINANCEIRAS
-- Sprint 5: metas com progresso e prazo.
-- ============================================
CREATE TABLE IF NOT EXISTS caixa_pessoal_meta (
    id_meta         SERIAL PRIMARY KEY,
    id_usuario      INT          NOT NULL,
    nome            VARCHAR(120) NOT NULL,
    descricao       VARCHAR(255),
    valor_alvo      NUMERIC(10,2) NOT NULL
                        CHECK (valor_alvo > 0),
    valor_atual     NUMERIC(10,2) NOT NULL DEFAULT 0.00
                        CHECK (valor_atual >= 0),
    prazo           DATE,
    criado_em       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_meta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meta_usuario ON caixa_pessoal_meta(id_usuario);


-- ============================================
-- TABELAS DE NOTIFICAÇÕES
-- Sprint 10: central de notificações e preferências.
-- ============================================
CREATE TABLE IF NOT EXISTS notificacao_preferencia (
    id_usuario              INT PRIMARY KEY,
    notificacoes_conta      BOOLEAN NOT NULL DEFAULT TRUE,
    notificacoes_parcela    BOOLEAN NOT NULL DEFAULT TRUE,
    notificacoes_meta       BOOLEAN NOT NULL DEFAULT TRUE,
    notificacoes_sistema    BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
    resumo_diario           BOOLEAN NOT NULL DEFAULT TRUE,
    atualizada_em           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notificacao_preferencia_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacao (
    id_notificacao  SERIAL PRIMARY KEY,
    id_usuario      INT          NOT NULL,
    codigo          VARCHAR(120) NOT NULL,
    titulo          VARCHAR(160) NOT NULL,
    mensagem        TEXT         NOT NULL,
    tipo            VARCHAR(30)  NOT NULL
                    CHECK (tipo IN ('conta', 'parcela', 'meta', 'sistema', 'movimentacao')),
    prioridade      VARCHAR(20)  NOT NULL
                    CHECK (prioridade IN ('critica', 'alta', 'media', 'baixa')),
    canal           VARCHAR(20)  NOT NULL DEFAULT 'in_app'
                    CHECK (canal IN ('in_app', 'push', 'email', 'all')),
    lida            BOOLEAN      NOT NULL DEFAULT FALSE,
    arquivada       BOOLEAN      NOT NULL DEFAULT FALSE,
    data_criacao    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    data_vencimento DATE,
    link            VARCHAR(255),

    CONSTRAINT fk_notificacao_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_notificacao_codigo UNIQUE (id_usuario, codigo)
);

CREATE INDEX IF NOT EXISTS idx_notificacao_usuario    ON notificacao(id_usuario);
CREATE INDEX IF NOT EXISTS idx_notificacao_prioridade ON notificacao(prioridade);
CREATE INDEX IF NOT EXISTS idx_notificacao_lida       ON notificacao(id_usuario, lida);


-- ============================================
-- DADOS DE SEED — USUÁRIO ADMIN
--
-- ATENÇÃO: A senha abaixo está em texto puro e deve ser
-- substituída por um hash bcrypt antes de usar em produção.
-- O backend faz upgrade automático de senhas legadas para bcrypt
-- no primeiro login (ver Usuario.validarSenha).
-- ============================================
INSERT INTO usuario (nome, email, senha, role)
VALUES ('Administrador', 'admin@sistema.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;


-- ============================================
-- DADOS DE SEED — CLIENTES DE TESTE
-- Vinculados ao usuário admin (id_usuario = 1).
-- ============================================
INSERT INTO cliente (id_usuario, nome, sobrenome, telefone, cidade, estado, status_cliente) VALUES
(1, 'Carlos',   'Eduardo Silva',     '(11) 98765-4321', 'São Paulo',       'SP', TRUE),
(1, 'Ana',      'Beatriz Rodrigues', '(21) 99888-7766', 'Rio de Janeiro',  'RJ', TRUE),
(1, 'Mariana',  'Souza Costa',       '(31) 98877-2233', 'Belo Horizonte',  'MG', TRUE),
(1, 'Ricardo',  'Almeida Santos',    '(41) 97766-5544', 'Curitiba',        'PR', FALSE),
(1, 'Juliana',  'Fernandes Lima',    '(81) 99111-2233', 'Recife',          'PE', TRUE);


-- ============================================
-- DADOS DE SEED — EMPRÉSTIMOS DE TESTE
-- Vinculados ao usuário admin (id_usuario = 1).
-- ============================================
INSERT INTO emprestimo (id_usuario, id_cliente, valor_emprestimo, num_parcelas, valor_parcela, juros, tipo_juros, data_emprestimo, data_devolucao, status_emprestimo) VALUES
(1, 1, 5000.00,  12, 458.33, 1.50, 'simples',   '2026-01-15', NULL,         TRUE),
(1, 2, 10000.00, 24, 520.83, 2.00, 'compostos', '2026-03-10', NULL,         TRUE),
(1, 3, 2000.00,   6, 350.00, 1.80, 'simples',   '2025-06-01', '2025-12-01', FALSE);


-- ============================================
-- DADOS DE SEED — PARCELAS DE TESTE
-- ============================================
INSERT INTO parcela (id_emprestimo, numero_parcela, valor_esperado, valor_pago, data_vencimento, data_pagamento, status_parcela) VALUES
(1, 1, 458.33, 458.33, '2026-02-15', '2026-02-14', 'pago'),
(1, 2, 458.33, 458.33, '2026-03-15', '2026-03-15', 'pago'),
(1, 3, 458.33,   0.00, '2026-04-15', NULL,          'pendente'),
(1, 4, 458.33,   0.00, '2026-05-15', NULL,          'pendente');

INSERT INTO parcela (id_emprestimo, numero_parcela, valor_esperado, valor_pago, data_vencimento, data_pagamento, status_parcela) VALUES
(2, 1, 520.83, 520.83, '2026-04-10', '2026-04-10', 'pago'),
(2, 2, 520.83,   0.00, '2026-05-10', NULL,          'pendente'),
(2, 3, 520.83,   0.00, '2026-06-10', NULL,          'pendente');

INSERT INTO parcela (id_emprestimo, numero_parcela, valor_esperado, valor_pago, data_vencimento, data_pagamento, status_parcela) VALUES
(3, 1, 350.00, 350.00, '2025-07-01', '2025-07-01', 'pago'),
(3, 2, 350.00, 350.00, '2025-08-01', '2025-08-02', 'pago'),
(3, 3, 350.00, 350.00, '2025-09-01', '2025-09-01', 'pago');