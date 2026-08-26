export default interface ClienteDTO {
    id_cliente?: number;
    nome_cliente: string;
    sobrenome_cliente: string;
    telefone: string;
    cidade: string;
    estado: string;
    criado_em?: Date;
    status_cliente?: boolean;
}