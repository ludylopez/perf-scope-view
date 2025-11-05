export interface EvaluationDraft {
  usuarioId: string;
  periodoId: string;
  tipo: "auto";
  responses: Record<string, number>;
  comments: Record<string, string>;
  estado: "borrador" | "enviado";
  progreso: number;
  fechaUltimaModificacion: string;
  fechaEnvio?: string;
}

const STORAGE_KEY_PREFIX = "evaluation_";

export const saveEvaluationDraft = (draft: EvaluationDraft): void => {
  const key = `${STORAGE_KEY_PREFIX}${draft.usuarioId}_${draft.periodoId}`;
  draft.fechaUltimaModificacion = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(draft));
};

export const getEvaluationDraft = (
  usuarioId: string,
  periodoId: string
): EvaluationDraft | null => {
  const key = `${STORAGE_KEY_PREFIX}${usuarioId}_${periodoId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as EvaluationDraft;
  } catch {
    return null;
  }
};

export const submitEvaluation = (draft: EvaluationDraft): void => {
  draft.estado = "enviado";
  draft.fechaEnvio = new Date().toISOString();
  saveEvaluationDraft(draft);
};

export const getSubmittedEvaluation = (
  usuarioId: string,
  periodoId: string
): EvaluationDraft | null => {
  const draft = getEvaluationDraft(usuarioId, periodoId);
  return draft?.estado === "enviado" ? draft : null;
};

export const hasSubmittedEvaluation = (
  usuarioId: string,
  periodoId: string
): boolean => {
  const draft = getEvaluationDraft(usuarioId, periodoId);
  return draft?.estado === "enviado" || false;
};

export const calculateProgress = (
  responses: Record<string, number>,
  totalItems: number
): number => {
  const answeredItems = Object.keys(responses).length;
  return Math.round((answeredItems / totalItems) * 100);
};
