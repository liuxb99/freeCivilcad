import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from src.parser import DXFParser
from src.entity_mapper import map_entities

def main():
    base = os.path.dirname(os.path.abspath(__file__))
    dxf_path = os.path.join(base, "test_files", "test.dxf")
    output_dir = os.path.join(base, "output")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "parsed.json")

    parser = DXFParser()
    entities = parser.parse(dxf_path)
    result = map_entities(entities)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print("ok %s" % output_path)
    print("total: %d" % result["stats"]["total"])
    for t, c in result["stats"]["by_type"].items():
        print("  %s: %d" % (t, c))

if __name__ == "__main__":
    main()
