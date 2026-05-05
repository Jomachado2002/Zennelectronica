/**
 * Utilidades para el árbol espejo Visão (`visaoNavigationTree` en Category).
 * Nodos hoja llevan `subcategoryValue` + `listingUrl`; carpetas solo `children`.
 */

export function hasTreeChildren(node) {
  const ch = node && node.children;
  return !!(ch && typeof ch === 'object' && Object.keys(ch).length > 0);
}

export function isTreeLeaf(node) {
  return !!(node && node.subcategoryValue);
}

/**
 * @param {Record<string, object>|null|undefined} childrenObj
 * @returns {{ key: string, node: object }[]}
 */
export function getSortedTreeChildEntries(childrenObj) {
  if (!childrenObj || typeof childrenObj !== 'object') return [];
  return Object.entries(childrenObj)
    .map(([key, node]) => ({ key, node: node || {} }))
    .sort((a, b) =>
      String(a.node.label || '').localeCompare(String(b.node.label || ''), 'es', {
        sensitivity: 'base'
      })
    );
}

/**
 * Resuelve un nodo descendiente del árbol siguiendo claves de primer nivel en `pathKeys`.
 * @param {object} root - visaoNavigationTree (tiene `children`)
 * @param {string[]} pathKeys - ej. ["0_memorias","1_memoria_ram_pc"]
 */
export function getTreeNodeAtPath(root, pathKeys) {
  if (!root || !pathKeys || !pathKeys.length) return root;
  let cur = root;
  for (const k of pathKeys) {
    if (!cur.children || !cur.children[k]) return null;
    cur = cur.children[k];
  }
  return cur;
}

/**
 * Etiquetas de migas desde la raíz del árbol hasta el padre del nivel actual (sin incluir hojas seleccionadas).
 */
export function breadcrumbLabelsForPath(root, pathKeys) {
  const parts = [];
  if (root && root.label) parts.push(root.label);
  if (!pathKeys || !pathKeys.length || !root) return parts;
  let cur = root;
  for (const k of pathKeys) {
    if (!cur.children || !cur.children[k]) break;
    cur = cur.children[k];
    if (cur.label) parts.push(cur.label);
  }
  return parts;
}

export function usableVisaoTree(tree) {
  return !!(tree && tree.children && typeof tree.children === 'object' && Object.keys(tree.children).length);
}

/** Último segmento después de " › " o el string completo si no hay separador. */
export function leafLabelFromStoredLabel(fullLabel) {
  if (fullLabel == null) return '';
  const s = String(fullLabel);
  const sep = ' › ';
  const i = s.lastIndexOf(sep);
  return i >= 0 ? s.slice(i + sep.length).trim() || s : s;
}

/**
 * Recorre recursivamente las hojas del árbol y devuelve { subcategoryValue, label }.
 */
export function collectLeafSubcategoryValues(node) {
  if (!node || typeof node !== 'object') return [];
  if (node.subcategoryValue) {
    return [{ subcategoryValue: node.subcategoryValue, label: node.label || '' }];
  }
  const ch = node.children;
  if (!ch || typeof ch !== 'object') return [];
  return Object.values(ch).flatMap((child) => collectLeafSubcategoryValues(child));
}
