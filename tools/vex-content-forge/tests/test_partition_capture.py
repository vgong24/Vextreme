import importlib.util
import tempfile
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    'forge',
    Path(__file__).parents[1] / 'partition_capture.py',
)
forge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(forge)

def test_safe_rel_rejects_escape():
    try:
        forge.safe_rel('../x')
    except ValueError:
        return
    assert False

def test_plan_rejects_raw_publication():
    plan = {
        'schemaVersion': 'vex-content-forge.routing/v0.1',
        'bundles': [{
            'bundleRef': 'x',
            'item': {'slug': 's', 'privacy': {'rawSourceAllowed': True}},
        }],
    }
    try:
        forge.validate_plan(plan)
    except ValueError:
        return
    assert False

def test_deterministic_zip_entry_timestamp():
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'x.zip'
        with zipfile.ZipFile(p, 'w') as z:
            forge.add_bytes(z, 'a.txt', b'a')
        with zipfile.ZipFile(p) as z:
            assert z.getinfo('a.txt').date_time == forge.FIXED_ZIP_DT
