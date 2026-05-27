class DXFParser:
    def __init__(self):
        self.entities = []
        self.layers = {}

    def _val(self, code, raw):
        if "e" in raw.lower() or "." in raw:
            try:
                return float(raw)
            except ValueError:
                pass
        try:
            return int(raw)
        except ValueError:
            return raw

    def parse(self, filepath):
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            raw = f.read()
        lines = [ln.rstrip("\r\n") for ln in raw.splitlines()]
        n = len(lines)
        i = 0

        while i < n:
            if i + 1 >= n:
                break
            try:
                code = int(lines[i].strip())
            except ValueError:
                i += 1
                continue

            if code != 0:
                i += 2
                continue

            value = lines[i + 1].strip()
            i += 2

            if value == "EOF":
                break
            elif value == "SECTION":
                if i + 1 < n:
                    try:
                        sc = int(lines[i].strip())
                    except ValueError:
                        continue
                    if sc == 2:
                        sec_name = lines[i + 1].strip()
                        i += 2
                        if sec_name == "ENTITIES":
                            i = self._parse_entities(lines, i)
                elif value == "ENDSEC":
                    pass
        return self.entities

    def _parse_entities(self, lines, start):
        i = start
        n = len(lines)
        while i < n:
            if i + 1 >= n:
                break
            try:
                gc = int(lines[i].strip())
            except ValueError:
                i += 1
                continue
            if gc != 0:
                i += 2
                continue
            etype = lines[i + 1].strip()
            i += 2

            if etype == "ENDSEC":
                return i
            if etype == "EOF":
                return i

            pairs = []
            while i < n:
                if i + 1 >= n:
                    break
                try:
                    g = int(lines[i].strip())
                except ValueError:
                    i += 1
                    continue
                if g == 0:
                    break
                v = lines[i + 1].strip()
                i += 2
                pairs.append((g, self._val(g, v)))

            ent = self._build_entity(etype, pairs)
            if ent:
                self.entities.append(ent)
        return i

    def _build_entity(self, etype, pairs):
        d = dict(pairs)
        raw_layer = d.get(8, "0")
        if not isinstance(raw_layer, str):
            raw_layer = str(raw_layer)
        out = {"type": etype, "layer": raw_layer, "color": d.get(62, 7)}

        if etype == "LINE":
            out.update({
                "x1": d.get(10, 0), "y1": d.get(20, 0), "z1": d.get(30, 0),
                "x2": d.get(11, 0), "y2": d.get(21, 0), "z2": d.get(31, 0),
            })
        elif etype == "CIRCLE":
            out.update({
                "cx": d.get(10, 0), "cy": d.get(20, 0), "cz": d.get(30, 0),
                "radius": d.get(40, 0),
            })
        elif etype == "ARC":
            out.update({
                "cx": d.get(10, 0), "cy": d.get(20, 0), "cz": d.get(30, 0),
                "radius": d.get(40, 0),
                "start_angle": d.get(50, 0), "end_angle": d.get(51, 360),
            })
        elif etype == "LWPOLYLINE":
            verts = []
            for g, v in pairs:
                if g == 10:
                    verts.append({"x": v})
                elif g == 20 and verts:
                    verts[-1]["y"] = v
            out["vertices"] = verts
            out["count"] = d.get(90, len(verts))
            out["flag"] = d.get(70, 0)
        elif etype == "TEXT":
            out.update({
                "x": d.get(10, 0), "y": d.get(20, 0), "z": d.get(30, 0),
                "height": d.get(40, 0), "text": d.get(1, ""),
                "rotation": d.get(50, 0),
            })
        else:
            return None
        return out
