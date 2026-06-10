import Cliente from "../model/Cliente.js";
import { type Request, type Response } from "express";
import type ClienteDTO from "../interface/ClienteDTO.js";

export default class ClienteController extends Cliente {
  static async todos(req: Request, res: Response) {
    try {
      // Chama o método do model que busca todos os alunos ativos no banco de dados
      const listaDeClientes = await Cliente.listarClientes();

      // Quando a assinatura do model retorna union (item | array), proteger com verificação
      if (!Array.isArray(listaDeClientes)) {
        // Se for um único item, retorna como array de um elemento
        res.status(200).json([listaDeClientes]);
        return;
      }

      // Se o array estiver vazio, não há clientes cadastrados — retorna 204 (No Content)
      if (listaDeClientes.length === 0) {
        res.status(204).send();
        return;
      }

      // Retorna a lista de clientes em formato JSON com status 200 (OK)
      res.status(200).json(listaDeClientes);
    } catch (error) {
      // Se ocorrer qualquer erro inesperado, exibe no console e retorna status 500
      console.error(`[ClienteController] Erro ao listar clientes:`, error);
      res
        .status(500)
        .json({ mensagem: "Erro interno ao recuperar a lista de alunos." });
    }
  }

  static async cliente(req: Request, res: Response) {
    try {
      // Lê o parâmetro "id" da URL e converte de string para número inteiro
      // "as string" garante ao TypeScript que o valor existe e é uma string antes do parseInt
      const idCliente = parseInt(req.params.id as string);

      // parseInt retorna NaN se o valor não for um número válido (ex: /api/clientes/abc)
      // isNaN() detecta isso e retorna 400 (Bad Request) antes de chegar no banco
      if (isNaN(idCliente) || idCliente <= 0) {
        res
          .status(400)
          .json({
            mensagem: "ID inválido. Informe um número inteiro positivo.",
          });
        return;
      }

      // Chama o método do model passando o ID para buscar o cliente específico no banco
      const cliente = await Cliente.listarClientes(idCliente);

      // Se chegou aqui, o cliente foi encontrado — retorna os dados com status 200 (OK)
      res.status(200).json(cliente);
    } catch (error: any) {
      // "error: any" permite inspecionar a mensagem do erro para diferenciar os casos
      console.error(
        `[ClienteController] Erro ao buscar cliente (id: ${req.params.id}):`,
        error,
      );

      // O model lança um erro com "não encontrado" quando o ID não existe no banco
      // Aqui diferenciamos esse caso (404) de um erro inesperado de banco (500)
      if (error.message?.includes("não encontrado")) {
        res.status(404).json({ mensagem: error.message });
        return;
      }

      res
        .status(500)
        .json({ mensagem: "Erro interno ao recuperar o cliente." });
    }
  }

   static async cadastrar(req: Request, res: Response) {
        try {
            // Lê o corpo da requisição e tipifica como ClienteDTO
            // O front-end envia os dados do novo cliente em formato JSON no corpo da requisição
            const dadosRecebidos: ClienteDTO = req.body;

            // Valida se os campos obrigatórios foram enviados pelo front-end
            // Se qualquer um deles estiver ausente (undefined, null ou string vazia), retorna 400
            // Isso evita criar um objeto Cliente incompleto e só descobrir o erro no banco
            if (!dadosRecebidos.nome_cliente || !dadosRecebidos.sobrenome_cliente || !dadosRecebidos.telefone) {
                res.status(400).json({ mensagem: "Campos obrigatórios ausentes: nome, sobrenome e celular." });
                return;
            }

            // Cria um novo objeto Cliente com os dados recebidos
            // O operador "??" define valores padrão para campos opcionais não informados
            const novoCliente = new Cliente(
                dadosRecebidos.nome_cliente,
                dadosRecebidos.sobrenome_cliente,
                dadosRecebidos.telefone,
                dadosRecebidos.criado_em ?? new Date() // Padrão: data atual
            );

            // Chama o método do model para persistir o novo cliente no banco de dados
            const result = await Cliente.cadastrarCliente(novoCliente);

            // O model retorna true se o INSERT foi bem-sucedido, false caso contrário
            if (result) {
                // 201 Created — recurso criado com sucesso (semântica correta para POST)
                res.status(201).json({ mensagem: "Cliente cadastrado com sucesso." });
            } else {
                // 400 Bad Request — falha de negócio, não erro de servidor
                res.status(400).json({ mensagem: "Não foi possível cadastrar o cliente." });
            }

        } catch (error) {
            console.error(`[ClienteController] Erro ao cadastrar cliente:`, error);
            res.status(500).json({ mensagem: "Erro interno ao cadastrar o cliente." });
        }
    }

      static async atualizar(req: Request, res: Response) {
        try {
            // Lê e converte o ID da URL para número inteiro
            const idCliente = parseInt(req.params.id as string);

            // Valida se o ID é um número válido e positivo antes de qualquer operação
            if (isNaN(idCliente) || idCliente <= 0) {
                res.status(400).json({ mensagem: "ID inválido. Informe um número inteiro positivo." });
                return;
            }

            // Lê os dados enviados pelo front-end no corpo da requisição
        const dadosRecebidos: ClienteDTO = req.body;

            // Valida campos obrigatórios — mesma lógica do método cadastrar
            if (!dadosRecebidos.nome_cliente || !dadosRecebidos.sobrenome_cliente || !dadosRecebidos.telefone) {
                res.status(400).json({ mensagem: "Campos obrigatórios ausentes: nome, sobrenome e celular." });
                return;
            }

            // Cria um objeto Cliente com os novos dados recebidos do front-end
            const cliente = new Cliente(
                dadosRecebidos.nome_cliente,
                dadosRecebidos.sobrenome_cliente,
                dadosRecebidos.telefone,
                dadosRecebidos.criado_em ?? new Date()
            );

            // Define o ID do cliente no objeto — necessário para o model saber qual registro atualizar no banco
            // O ID vem da URL (req.params.id), não do body, por segurança
            cliente.setIdCliente(idCliente);

            // Chama o método do model para persistir as atualizações no banco de dados
            const result = await Cliente.atualizarCliente(cliente);

            // O model retorna true se o UPDATE afetou alguma linha, false se o cliente estava inativo
            if (result) {
                res.status(200).json({ mensagem: "Cadastro atualizado com sucesso." });
            } else {
                res.status(404).json({ mensagem: "Cliente não encontrado ou já está inativo." });
            }

        } catch (error: any) {
            console.error(`[ClienteController] Erro ao atualizar cliente (id: ${req.params.id}):`, error);

            // O model lança "não encontrado" quando o ID não existe — diferencia do erro de banco
            if (error.message?.includes("não encontrado")) {
                res.status(404).json({ mensagem: error.message });
                return;
            }

            res.status(500).json({ mensagem: "Erro interno ao atualizar o cliente." });
        }
    }

        static async remover(req: Request, res: Response) {
        try {
            // Lê e converte o ID da URL para número inteiro
            const idCliente = parseInt(req.params.id as string);

            // Valida se o ID é um número válido e positivo antes de consultar o banco
            if (isNaN(idCliente) || idCliente <= 0) {
                res.status(400).json({ mensagem: "ID inválido. Informe um número inteiro positivo." });
                return;
            }

            // Chama o método do model que realiza a remoção lógica do cliente e seus empréstimos
            const result = await Cliente.removerCliente(idCliente);

            // O model retorna true se o cliente foi desativado, false se já estava inativo
            if (result) {
                res.status(200).json({ mensagem: "Cliente removido com sucesso." });
            } else {
                res.status(404).json({ mensagem: "Cliente não encontrado ou já está inativo." });
            }

        } catch (error: any) {
            console.error(`[ClienteController] Erro ao remover cliente (id: ${req.params.id}):`, error);

            // O model lança "não encontrado" quando o ID não existe — diferencia do erro de banco
            if (error.message?.includes("não encontrado")) {
                res.status(404).json({ mensagem: error.message });
                return;
            }

            res.status(500).json({ mensagem: "Erro interno ao remover o cliente." });
        }
    }
    
}