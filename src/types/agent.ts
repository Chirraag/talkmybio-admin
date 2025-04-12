export interface AgentSkeleton {
  agent_configurations: {
    interruption_sensitivity: number;
    language: string;
    voice_id: string;
  };
  category_id: string;
  llm_configurations: {
    general_prompt: string;
    model: string;
  };
}