export interface OpenQuestion {
  id: string;
  pregunta: string;
  tipo: "capacitacion" | "herramienta" | "otro";
  orden: number;
  obligatoria: boolean;
}

export interface OpenQuestionResponse {
  id: string;
  evaluacionId: string; // ID de la evaluación
  preguntaId: string;
  respuesta: string;
  createdAt: string;
}

export interface UserNeeds {
  capacitaciones: string[];
  herramientas: string[];
  otros: string[];
}

