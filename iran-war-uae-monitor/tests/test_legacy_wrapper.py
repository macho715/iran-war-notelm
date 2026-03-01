import importlib.util
from pathlib import Path


def test_root_main_forwards_to_canonical(monkeypatch):
    root_main_path = Path(__file__).resolve().parents[2] / "main.py"
    spec = importlib.util.spec_from_file_location("legacy_main_wrapper", root_main_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    calls = []

    def fake_call(argv, cwd=None):
        calls.append((argv, cwd))
        return 0

    monkeypatch.setattr(module.subprocess, "call", fake_call)
    result = module.main()

    assert result == 0
    assert len(calls) == 1
    argv, cwd = calls[0]
    assert str(Path(argv[1]).name) == "run_monitor.py"
    assert Path(cwd).name == "iran-war-uae-monitor"
