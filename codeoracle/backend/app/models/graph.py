from typing import Literal

from pydantic import BaseModel, Field

EdgeConfidence = Literal["confirmed", "uncertain"]


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # "module" | "external"
    language: str | None = None
    path: str | None = None
    external: bool = False
    is_entry_point: bool = False
    function_count: int = 0
    class_count: int = 0
    summary: str = ""
    risk_notes: list[str] = Field(default_factory=list)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # "imports" | "calls" | "external"
    confidence: EdgeConfidence = "confirmed"


class DependencyGraph(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
