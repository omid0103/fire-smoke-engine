"""Independent syntax/unit/geometry checks for generated test fixture DXFs."""
import pathlib
import sys
import ezdxf
folder = pathlib.Path(sys.argv[1])
for name, is_3d in [('parking-2d.dxf', False), ('parking-3d.dxf', True)]:
    doc = ezdxf.readfile(folder / name)
    audit = doc.audit()
    assert not audit.has_errors, audit.errors
    assert doc.units == 6
    lines = list(doc.modelspace().query('LINE'))
    assert len(lines) == (204 if is_3d else 68), len(lines)
    coords = [p for e in lines for p in [e.dxf.start, e.dxf.end]]
    assert min(p.x for p in coords) >= 0 and max(p.x for p in coords) == 30
    assert min(p.y for p in coords) >= 0 and max(p.y for p in coords) == 20
    assert max(p.z for p in coords) == (3 if is_3d else 0)
    assert {'EXHAUST','SUPPLY','EXHAUST_OUTLET','SUPPLY_OUTLET'}.issubset({e.dxf.layer for e in lines})
    print(name, 'validated:', len(lines), 'lines; meters; valid extents')
