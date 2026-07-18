export type NodeType = "decision" | "bug" | "file" | "preference" | "task";
export type RelType = "caused" | "depends_on" | "touches" | "relates_to";

export interface CorpusNode {
  id: string;
  type: NodeType;
  title: string;
  body: string;
  tags: string[];
  session_id?: string;
}

export interface CorpusEdge {
  source_id: string;
  target_id: string;
  rel: RelType;
}

export interface Graph {
  nodes: CorpusNode[];
  edges: CorpusEdge[];
}

export interface RecallResult {
  markdown: string;
  nodeIds: string[];
  fullTokens: number;
  recallTokens: number;
}
