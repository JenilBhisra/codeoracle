from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # "module" | "external"
    language: str | None = None
    path: str | None = None
    external: bool = False


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # "imports" | "calls"


class DependencyGraph(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
