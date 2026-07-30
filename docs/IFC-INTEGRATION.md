# IFC Integration Strategy

## Positioning

freeCivilcad should act as a civil-CAD editing and geometry front end that exchanges semantic infrastructure models through IFC 4.3. Native CAD geometry remains important for drafting and precise editing; IFC provides interoperable BIM objects and project hierarchy.

```text
CAD geometry / alignments / sections
        ↓
Civil Engineering IR
        ├── DWG / DXF
        ├── IFC 4.3
        ├── glTF visualization
        └── analysis and quantity adapters
```

## IFC capabilities to prioritize

- IFC project, site and facility hierarchy;
- building and bridge facilities;
- alignments, station/offset/elevation references;
- beams, columns, slabs, walls, piles, footings and bearings;
- bridge parts and civil-infrastructure classifications;
- materials, sections, quantities and stable GUIDs;
- import/export provenance and revision tracking.

## Editing boundary

CAD operations should modify the Civil Engineering IR first. IFC should then be regenerated through a validated exporter. Direct STEP text editing is not supported.

On IFC import, objects should be converted into editable semantic objects while retaining:

- original IFC GUID;
- IFC class and schema version;
- source placement and representation;
- unsupported-property payloads for loss-aware round trips.

## Recommended implementation

Use a shared IFC service with the other engineering projects:

```text
freeCivilcad (Go/CAD core)
        ↓ normalized JSON contract
IfcOpenShell worker
        ↓
IFC import / export / validation
```

## Delivery phases

1. IFC viewer/import metadata and spatial tree.
2. Export basic structural and civil elements.
3. Add alignments and bridge hierarchy.
4. Add editable round-trip mapping with stable GUIDs.
5. Add quantity, analysis, budget and knowledge-graph links.

IFC is the interoperability layer; the Civil Engineering IR remains the cross-format editing source of truth.
