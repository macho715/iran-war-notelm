import json
import subprocess
import sys
from pathlib import Path

from iran_monitor import app


def test_get_runtime_paths_from_app():
    paths = app._get_runtime_paths()
    assert set(paths.keys()) == {"cwd", "main_file", "rss_feed_file", "canonical_root"}
    assert Path(paths["main_file"]).name == "app.py"
    assert Path(paths["rss_feed_file"]).name == "rss_feed.py"
    assert Path(paths["canonical_root"]).name == "iran-war-uae-monitor"


def test_check_runtime_paths_script_outputs_json():
    root = Path(__file__).resolve().parents[1]
    script = root / "scripts" / "check_runtime_paths.py"
    out = subprocess.check_output([sys.executable, str(script)], text=True, cwd=str(root))
    payload = json.loads(out)
    assert Path(payload["main_file"]).name == "app.py"
    assert Path(payload["rss_feed_file"]).name == "rss_feed.py"
    assert payload["canonical_root"] == str(root.resolve())
