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
DROP TABLE IF EXISTS caixinha_pessoal CASCADE;
DROP TABLE IF EXISTS notificacao CASCADE;
DROP TABLE IF EXISTS notificacao_preferencia CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_meta CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_conta CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_movimentacao CASCADE;
DROP TABLE IF EXISTS caixa_pessoal_cofre CASCADE;
DROP TABLE IF EXISTS caixa_pessoal CASCADE;
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
    role        VARCHAR(20)  NOT NULL DEFAULT 'credor',
    avatar_url  VARCHAR(500) NULL,            -- Sprint 12: foto de perfil (URL local ou CDN)
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE, -- Sprint 13: status ativo/suspenso
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
                        CHECK (LOWER(status_parcela) IN ('pendente', 'pago', 'paga', 'atrasada', 'atrasado')),
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
-- TABELA CAIXA PESSOAL — SALDO CONSOLIDADO
-- Sincronização automática de Saldo em Conta.
-- ============================================
CREATE TABLE IF NOT EXISTS caixa_pessoal (
    id_usuario      INT PRIMARY KEY,
    saldo           NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    atualizado_em   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_caixa_pessoal_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_caixa_pessoal_usuario ON caixa_pessoal(id_usuario);


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
-- TABELA CAIXA PESSOAL — CAIXINHAS (ESTILO NUBANK)
-- Sprint 13: caixinhas de objetivos pessoais.
-- ============================================
CREATE TABLE IF NOT EXISTS caixinha_pessoal (
    id_caixinha  SERIAL PRIMARY KEY,
    id_usuario   INT           NOT NULL,
    nome         VARCHAR(80)   NOT NULL,
    saldo        NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    meta         NUMERIC(10,2)          CHECK (meta > 0),
    emoji        VARCHAR(10)            DEFAULT '🐷',
    cor          VARCHAR(60)            DEFAULT 'indigo',
    criado_em    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_caixinha_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_caixinha_usuario_nome
        UNIQUE (id_usuario, nome)
);

CREATE INDEX IF NOT EXISTS idx_caixinha_usuario ON caixinha_pessoal(id_usuario);


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