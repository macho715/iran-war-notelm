import traceback
from notebooklm_tools.utils.cdp import launch_chrome, _read_port_map

try:
    print("Testing read_port_map...")
    _read_port_map()
    print("Testing launch_chrome...")
    launch_chrome()
    print("Success")
except Exception as e:
    traceback.print_exc()
