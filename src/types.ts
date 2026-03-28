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
    // Novos campos solicitados
    massa_gorda?: number;
    percentual_gordura?: number;
    agua_corporal_total?: number;
    indice_hidratacao?: number;
    agua_massa_magra?: number;
    intracelular?: number;
    agua_intracelular_percentual?: number;
    extracelular?: number;
    massa_magra?: number;
    razao_musculo_gordura?: number;
    massa_muscular?: number;
    imc?: number;
    idade?: number;
    taxa_metabolica_basal?: number;
    angulo_fase?: number;
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
  profissional_id?: string;
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
  status: 'Ativo' | 'Encerrado';
  etapa: number;
  data_inicio: string;
  data_fim?: string;
  motivo_entrada: string;
  saua_inicial?: string;
  saua_final?: string;
  objetivos: string;
  ganho_total?: string;
  evolucao_global?: string;
  uid: string;
}

export interface Laudo {
  id?: string;
  sessao_id: string;
  paciente_id: string;
  profissional_id?: string;
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
