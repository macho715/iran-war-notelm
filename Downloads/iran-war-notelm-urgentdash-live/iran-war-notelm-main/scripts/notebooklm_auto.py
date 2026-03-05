from notebooklm_tools.core.auth import AuthManager
from notebooklm_tools.core.client import NotebookLMClient
import asyncio

def run():
    print("Loading Auth Profile...")
    auth = AuthManager()
    p = auth.load_profile()

    with NotebookLMClient(
        cookies=p.cookies,
        csrf_token=p.csrf_token,
        session_id=p.session_id,
    ) as client:
        print("Creating Notebook...")
        nb = client.create_notebook("실시간 이란-UAE 보안 브리핑 (자동화)")
        # nb is a Notebook object - get the id attribute
        nb_id = getattr(nb, "id", None) or getattr(nb, "notebook_id", None) or str(nb)
        if hasattr(nb, "model_dump"):
            d = nb.model_dump()
            nb_id = d.get("notebook_id", d.get("id", nb_id))
        elif hasattr(nb, "dict"):
            d = nb.dict()
            nb_id = d.get("notebook_id", d.get("id", nb_id))
        print(f"Notebook created: {nb_id}")

        print("Adding news text source...")
        with open("news_payload.txt", "r", encoding="utf-8") as f:
            content = f.read()

        source = client.add_text_source(nb_id, content, title="UAE Crisis Update")
        source_id = source.get("id") if isinstance(source, dict) else getattr(source, "id", None)
        print(f"Source added: {source_id}")

        print("Waiting for source to be ready...")
        client.wait_for_source_ready(nb_id, source_id)
        print("Done! Notebook ready.")
        print(f"Open at: https://notebooklm.google.com/notebook/{nb_id}")

run()
