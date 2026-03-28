import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeSessionData = async (patient: any, session: any, references: any[]) => {
  const birthDate = new Date(patient.data_nascimento);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  const prompt = `
    Analise os seguintes dados fisiológicos de uma sessão clínica para o paciente ${patient.nome} (${isNaN(age) ? 'N/A' : age} anos, ${patient.sexo}).
    Dados da Sessão: ${JSON.stringify(session.dados_fisiologicos)}
    Referências Clínicas: ${JSON.stringify(references)}
    
    Gere um laudo clínico detalhado incluindo:
    1. Resumo dos dados
    2. Comparação com valores de referência
    3. Insights clínicos e possíveis alertas
    4. Sugestões de conduta
    
    Responda em formato Markdown.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  
  return response.text;
};

export const generateCustomReport = async (patients: any[], sessions: any[], filters: any) => {
  const prompt = `
    Gere um relatório analítico consolidado com base nos seguintes dados:
    Pacientes: ${JSON.stringify(patients)}
    Sessões: ${JSON.stringify(sessions)}
    Filtros aplicados: ${JSON.stringify(filters)}
    
    O relatório deve focar em ${filters.analysisType || 'evolução geral'}.
    Inclua tendências, anomalias e recomendações estratégicas para a clínica.
    Responda em formato Markdown.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  
  return response.text;
};

export const analyzeScientificReference = async (articleText: string) => {
  const prompt = `
    Analise o seguinte texto de um artigo científico ou base de dados médica e extraia parâmetros clínicos relevantes (como RMSSD, HRV, etc).
    Texto: ${articleText}
    
    Retorne um objeto JSON com:
    - tipo: nome do parâmetro
    - valor_referencia: valor sugerido
    - idade_min: idade mínima aplicável
    - idade_max: idade máxima aplicável
    - justificativa: resumo da evidência científica
    - relevancia: classificação de relevância (Alta, Média, Baixa)
    
    Responda APENAS o JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipo: { type: Type.STRING },
          valor_referencia: { type: Type.NUMBER },
          idade_min: { type: Type.INTEGER },
          idade_max: { type: Type.INTEGER },
          justificativa: { type: Type.STRING },
          relevancia: { type: Type.STRING }
        },
        required: ["tipo", "valor_referencia", "justificativa", "relevancia"]
      }
    }
  });
  
  return JSON.parse(response.text || "{}");
};

export const calculateAutomaticResults = async (sessionData: any) => {
  const prompt = `
    Você é um especialista em análise autonômica e fisiologia do exercício. Com base nos dados fornecidos de uma sessão clínica (VFC - Variabilidade da Frequência Cardíaca, Contexto Clínico, Composição Corporal e Análise Celular), calcule e gere os parâmetros do modelo SAUA (Sistema de Avaliação de Unidade Autonômica).
    
    Dados da Sessão: ${JSON.stringify(sessionData)}
    
    INSTRUÇÕES DE CÁLCULO/GERAÇÃO:
    - saua_pre: Índice numérico (0-100) representando o estado autonômico inicial.
    - classificacao: Diagnóstico autonômico (ex: Equilibrado, Simpaticotonia Leve/Moderada/Severa, Vagotonia Leve/Moderada/Severa).
    - saua_pos: Índice numérico (0-100) após a intervenção.
    - das (Desvio de Adaptação Sistêmica): Grau de desvio do equilíbrio ideal.
    - ira (Índice de Reserva Autonômica): Capacidade de resposta do sistema.
    - metabolico: Avaliação qualitativa do estado metabólico baseado na FC e VFC.
    - locomotor: Avaliação do estado locomotor (0-100).
    - integrado: Índice Integrado de Saúde (combinação de VFC e contexto clínico).
    - iet (Índice de Eficiência Terapêutica): Comparação entre pré e pós.
    - isc (Índice de Sobrecarga Clínica): Nível de estresse fisiológico.
    - ir (Índice de Recuperação): Capacidade de retorno ao basal.
    - analise_texto: Um parágrafo de análise clínica qualitativa e insights sobre os resultados.
    
    Retorne um objeto JSON seguindo estritamente o esquema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          saua_pre: { type: Type.STRING },
          classificacao: { type: Type.STRING },
          saua_pos: { type: Type.STRING },
          das: { type: Type.STRING },
          ira: { type: Type.STRING },
          metabolico: { type: Type.STRING },
          locomotor: { type: Type.NUMBER },
          integrado: { type: Type.STRING },
          iet: { type: Type.STRING },
          isc: { type: Type.STRING },
          ir: { type: Type.STRING },
          analise_texto: { type: Type.STRING }
        },
        required: ["saua_pre", "classificacao", "saua_pos", "das", "ira", "metabolico", "locomotor", "integrado", "iet", "isc", "ir", "analise_texto"]
      }
    }
  });
  
  return JSON.parse(response.text || "{}");
};
