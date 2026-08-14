from app.services.prompt_templates import build_structured_prompt


def test_build_structured_prompt_includes_all_sections():
    prompt = build_structured_prompt(
        schema_description='{"summary": "string"}',
        facts_json='{"functions": ["foo"]}',
        task="Summarize this module.",
    )

    assert '{"summary": "string"}' in prompt
    assert '{"functions": ["foo"]}' in prompt
    assert "Summarize this module." in prompt
    assert "do not invent" in prompt.lower()
