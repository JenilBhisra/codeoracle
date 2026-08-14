from langchain_core.prompts import PromptTemplate

STRUCTURED_JSON_TEMPLATE = PromptTemplate.from_template(
    "You are analyzing a legacy codebase. Base your answer ONLY on the facts "
    "provided below - do not invent imports, function names, dependencies, "
    "or behavior that isn't shown in the facts.\n\n"
    "Respond with ONLY valid JSON matching this schema. No markdown code "
    "fences, no commentary before or after the JSON.\n\n"
    "Schema:\n{schema}\n\n"
    "Facts:\n{facts}\n\n"
    "Task:\n{task}\n"
)


def build_structured_prompt(*, schema_description: str, facts_json: str, task: str) -> str:
    return STRUCTURED_JSON_TEMPLATE.format(schema=schema_description, facts=facts_json, task=task)
