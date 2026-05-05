import {
  breadcrumbLabelsForPath,
  getSortedTreeChildEntries,
  getTreeNodeAtPath,
  hasTreeChildren,
  isTreeLeaf,
  usableVisaoTree
} from '../visaoNavigationTree';

describe('visaoNavigationTree helpers', () => {
  const tree = {
    label: 'Informática',
    value: 'informatica',
    children: {
      '0_notebooks': {
        label: 'Notebooks',
        depth: 0,
        children: {
          '1_lenovo': {
            label: 'Notebook Lenovo',
            depth: 1,
            children: {},
            subcategoryValue: 'nb_lenovo',
            listingUrl: 'https://example.com/lenovo'
          },
          '1_hp': {
            label: 'Notebook HP',
            depth: 1,
            children: {},
            subcategoryValue: 'nb_hp',
            listingUrl: 'https://example.com/hp'
          }
        }
      },
      '0_impresoras': {
        label: 'Impresoras',
        depth: 0,
        children: {},
        subcategoryValue: 'imp_all',
        listingUrl: 'https://example.com/imp'
      }
    }
  };

  test('usableVisaoTree', () => {
    expect(usableVisaoTree(null)).toBe(false);
    expect(usableVisaoTree({})).toBe(false);
    expect(usableVisaoTree({ children: {} })).toBe(false);
    expect(usableVisaoTree(tree)).toBe(true);
  });

  test('getSortedTreeChildEntries ordena por label', () => {
    const entries = getSortedTreeChildEntries(tree.children);
    expect(entries.map((e) => e.node.label)).toEqual(['Impresoras', 'Notebooks']);
  });

  test('getTreeNodeAtPath', () => {
    expect(getTreeNodeAtPath(tree, [])).toBe(tree);
    const nb = getTreeNodeAtPath(tree, ['0_notebooks']);
    expect(nb.label).toBe('Notebooks');
    expect(getTreeNodeAtPath(tree, ['0_notebooks', '1_hp']).subcategoryValue).toBe('nb_hp');
    expect(getTreeNodeAtPath(tree, ['missing'])).toBe(null);
  });

  test('hasTreeChildren e isTreeLeaf', () => {
    const nb = tree.children['0_notebooks'];
    expect(hasTreeChildren(nb)).toBe(true);
    expect(isTreeLeaf(nb)).toBe(false);
    const hp = nb.children['1_hp'];
    expect(hasTreeChildren(hp)).toBe(false);
    expect(isTreeLeaf(hp)).toBe(true);
  });

  test('breadcrumbLabelsForPath', () => {
    expect(breadcrumbLabelsForPath(tree, []).join(' › ')).toBe('Informática');
    expect(breadcrumbLabelsForPath(tree, ['0_notebooks']).join(' › ')).toBe(
      'Informática › Notebooks'
    );
    expect(breadcrumbLabelsForPath(tree, ['0_notebooks', '1_hp']).join(' › ')).toBe(
      'Informática › Notebooks › Notebook HP'
    );
  });
});
