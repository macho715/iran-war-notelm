import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from iran_monitor.storage import ensure_layout


def test_ensure_layout_creates_urgentdash_snapshots(tmp_path: Path):
    ensure_layout(tmp_path)
    assert (tmp_path / "urgentdash_snapshots").is_dir()
