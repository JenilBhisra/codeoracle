const COLUMN_SPACING = 320;
const ROW_SPACING = 120;

/**
 * Positions nodes left-to-right by dependency depth (BFS from entry points /
 * roots), matching ModuleNode's target=left / source=right handles.
 * Cycle-safe: a node's depth is fixed the first time it's reached.
 */
export function layoutGraph(nodes, edges) {
  const positions = new Map();
  if (!nodes.length) return positions;

  const outgoing = new Map();
  const incomingCount = new Map();
  nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incomingCount.set(node.id, 0);
  });
  edges.forEach((edge) => {
    if (!outgoing.has(edge.source) || !incomingCount.has(edge.target)) return;
    outgoing.get(edge.source).push(edge.target);
    incomingCount.set(edge.target, incomingCount.get(edge.target) + 1);
  });

  const depth = new Map();
  const queue = [];

  const seed = (id) => {
    if (depth.has(id)) return;
    depth.set(id, 0);
    queue.push(id);
  };

  nodes.forEach((node) => node.is_entry_point && seed(node.id));
  nodes.forEach((node) => incomingCount.get(node.id) === 0 && seed(node.id));

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const d = depth.get(id);
    for (const next of outgoing.get(id) || []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }

  // Nodes left over live only in cycles with no clear entry — pull each in as its own root.
  nodes.forEach((node) => {
    if (depth.has(node.id)) return;
    seed(node.id);
    let localHead = queue.length - 1;
    while (localHead < queue.length) {
      const id = queue[localHead++];
      const d = depth.get(id);
      for (const next of outgoing.get(id) || []) {
        if (!depth.has(next)) {
          depth.set(next, d + 1);
          queue.push(next);
        }
      }
    }
  });

  const columns = new Map();
  nodes.forEach((node) => {
    const d = depth.get(node.id) ?? 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d).push(node.id);
  });

  Array.from(columns.keys())
    .sort((a, b) => a - b)
    .forEach((d) => {
      const ids = columns.get(d);
      const offset = ((ids.length - 1) * ROW_SPACING) / 2;
      ids.forEach((id, index) => {
        positions.set(id, { x: d * COLUMN_SPACING, y: index * ROW_SPACING - offset });
      });
    });

  return positions;
}
