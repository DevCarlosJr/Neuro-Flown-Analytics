export interface Paciente {
  id?: string;
  id_paciente: string;
  nome: string;
  sexo: string;
  data_nascimento: string;
  telefone: string;
  primeira_avaliacao: string;
  diagnostico_principal: string;
  observacoes: string;
  status: string;
  proxima_jornada: number;
  data_criacao: string;
  uid: string;
}

export interface Sessao {
  id?: string;
  paciente_id: string;
  jornada_id?: string;
  sessao_n?: number;
  data_sessao: string;
  fase?: string;
  qualidade_sinal?: string;
  queixa_principal?: string;
  vfc_pre_pos?: {
    fc_media: { pre: number; pos: number };
    rmssd: { pre: number; pos: number };
    sdnn: { pre: number; pos: number };
    pnn50: { pre: number; pos: number };
    lfhf: { pre: number; pos: number };
    total_power: { pre: number; pos: number };
  };
  contexto_clinico?: {
    dor_eva: number;
    mobilidade: number;
    forca: number;
    controle_motor: number;
    gordura_corporal: number;
    agua_ice: number;
    idade_celular: number;
    horas_sono: number;
    qualidade_sono: number;
    nivel_stress: number;
    estado_humor: string;
    conduta: string;
  };
  resposta_subjetiva?: string;
  resultados_automaticos?: {
    saua_pre: string;
    classificacao: string;
    saua_pos: string;
    das: string;
    ira: string;
    metabolico: string;
    locomotor: number;
    integrado: string;
    iet: string;
    isc: string;
    ir: string;
    analise_texto?: string;
  };
  observacoes: string;
  uid: string;
}

export interface Referencia {
  id?: string;
  tipo: string;
  idade_min?: number;
  idade_max?: number;
  valor_referencia: number;
  peso?: number;
  justificativa: string;
  relevancia?: string;
  data_atualizacao?: string;
}

export interface Jornada {
  id?: string;
  paciente_id: string;
  nome: string;
  status: string;
  etapa: number;
  leitura: string;
  uid: string;
}

export interface Laudo {
  id?: string;
  sessao_id: string;
  paciente_id: string;
  conteudo: string;
  data_geracao: string;
  uid: string;
}

export interface Profissional {
  id?: string;
  nome: string;
  profissao: string;
  conselho: string;
  registro: string;
  email: string;
  telefone: string;
  foto_url?: string;
  data_cadastro: string;
  uid: string;
}
