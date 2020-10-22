/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { List } from 'vs/Base/Browser/ui/list/listWidget';
import { WorkBenchListFocusContextKey, IListService, WorkBenchListSupportsMultiSelectContextKey, ListWidget, WorkBenchListHasSelectionOrFocus, getSelectionKeyBoardEvent } from 'vs/platform/list/Browser/listService';
import { PagedList } from 'vs/Base/Browser/ui/list/listPaging';
import { range } from 'vs/Base/common/arrays';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { OBjectTree } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { AsyncDataTree } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { DataTree } from 'vs/Base/Browser/ui/tree/dataTree';
import { ITreeNode } from 'vs/Base/Browser/ui/tree/tree';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';

function ensureDOMFocus(widget: ListWidget | undefined): void {
	// it can happen that one of the commands is executed while
	// DOM focus is within another focusaBle control within the
	// list/tree item. therefor we should ensure that the
	// list/tree has DOM focus again after the command ran.
	if (widget && widget.getHTMLElement() !== document.activeElement) {
		widget.domFocus();
	}
}

function focusDown(accessor: ServicesAccessor, arg2?: numBer, loop: Boolean = false): void {
	const focused = accessor.get(IListService).lastFocusedList;
	const count = typeof arg2 === 'numBer' ? arg2 : 1;

	// List
	if (focused instanceof List || focused instanceof PagedList) {
		const list = focused;

		list.focusNext(count);
		const listFocus = list.getFocus();
		if (listFocus.length) {
			list.reveal(listFocus[0]);
		}
	}

	// Tree
	else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
		const tree = focused;

		const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
		tree.focusNext(count, loop, fakeKeyBoardEvent);

		const listFocus = tree.getFocus();
		if (listFocus.length) {
			tree.reveal(listFocus[0]);
		}
	}

	// Ensure DOM Focus
	ensureDOMFocus(focused);
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusDown',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.DownArrow,
	mac: {
		primary: KeyCode.DownArrow,
		secondary: [KeyMod.WinCtrl | KeyCode.KEY_N]
	},
	handler: (accessor, arg2) => focusDown(accessor, arg2)
});

function expandMultiSelection(focused: List<unknown> | PagedList<unknown> | OBjectTree<unknown, unknown> | DataTree<unknown, unknown, unknown> | AsyncDataTree<unknown, unknown, unknown>, previousFocus: unknown): void {

	// List
	if (focused instanceof List || focused instanceof PagedList) {
		const list = focused;

		const focus = list.getFocus() ? list.getFocus()[0] : undefined;
		const selection = list.getSelection();
		if (selection && typeof focus === 'numBer' && selection.indexOf(focus) >= 0) {
			list.setSelection(selection.filter(s => s !== previousFocus));
		} else {
			if (typeof focus === 'numBer') {
				list.setSelection(selection.concat(focus));
			}
		}
	}

	// Tree
	else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
		const list = focused;

		const focus = list.getFocus() ? list.getFocus()[0] : undefined;

		if (previousFocus === focus) {
			return;
		}

		const selection = list.getSelection();
		const fakeKeyBoardEvent = new KeyBoardEvent('keydown', { shiftKey: true });

		if (selection && selection.indexOf(focus) >= 0) {
			list.setSelection(selection.filter(s => s !== previousFocus), fakeKeyBoardEvent);
		} else {
			list.setSelection(selection.concat(focus), fakeKeyBoardEvent);
		}
	}
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.expandSelectionDown',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WorkBenchListFocusContextKey, WorkBenchListSupportsMultiSelectContextKey),
	primary: KeyMod.Shift | KeyCode.DownArrow,
	handler: (accessor, arg2) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List / Tree
		if (focused instanceof List || focused instanceof PagedList || focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const list = focused;

			// Focus down first
			const previousFocus = list.getFocus() ? list.getFocus()[0] : undefined;
			focusDown(accessor, arg2, false);

			// Then adjust selection
			expandMultiSelection(focused, previousFocus);
		}
	}
});

function focusUp(accessor: ServicesAccessor, arg2?: numBer, loop: Boolean = false): void {
	const focused = accessor.get(IListService).lastFocusedList;
	const count = typeof arg2 === 'numBer' ? arg2 : 1;

	// List
	if (focused instanceof List || focused instanceof PagedList) {
		const list = focused;

		list.focusPrevious(count);
		const listFocus = list.getFocus();
		if (listFocus.length) {
			list.reveal(listFocus[0]);
		}
	}

	// Tree
	else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
		const tree = focused;

		const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
		tree.focusPrevious(count, loop, fakeKeyBoardEvent);

		const listFocus = tree.getFocus();
		if (listFocus.length) {
			tree.reveal(listFocus[0]);
		}
	}

	// Ensure DOM Focus
	ensureDOMFocus(focused);
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusUp',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.UpArrow,
	mac: {
		primary: KeyCode.UpArrow,
		secondary: [KeyMod.WinCtrl | KeyCode.KEY_P]
	},
	handler: (accessor, arg2) => focusUp(accessor, arg2)
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.expandSelectionUp',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WorkBenchListFocusContextKey, WorkBenchListSupportsMultiSelectContextKey),
	primary: KeyMod.Shift | KeyCode.UpArrow,
	handler: (accessor, arg2) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List / Tree
		if (focused instanceof List || focused instanceof PagedList || focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const list = focused;

			// Focus up first
			const previousFocus = list.getFocus() ? list.getFocus()[0] : undefined;
			focusUp(accessor, arg2, false);

			// Then adjust selection
			expandMultiSelection(focused, previousFocus);
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.collapse',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.LeftArrow,
	mac: {
		primary: KeyCode.LeftArrow,
		secondary: [KeyMod.CtrlCmd | KeyCode.UpArrow]
	},
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// Tree only
		if (focused && !(focused instanceof List || focused instanceof PagedList)) {
			if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
				const tree = focused;
				const focusedElements = tree.getFocus();

				if (focusedElements.length === 0) {
					return;
				}

				const focus = focusedElements[0];

				if (!tree.collapse(focus)) {
					const parent = tree.getParentElement(focus);

					if (parent) {
						const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
						tree.setFocus([parent], fakeKeyBoardEvent);
						tree.reveal(parent);
					}
				}
			}
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.collapseAll',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyMod.CtrlCmd | KeyCode.LeftArrow,
	mac: {
		primary: KeyMod.CtrlCmd | KeyCode.LeftArrow,
		secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.UpArrow]
	},
	handler: (accessor) => {
		const focusedTree = accessor.get(IListService).lastFocusedList;

		if (focusedTree && !(focusedTree instanceof List || focusedTree instanceof PagedList)) {
			focusedTree.collapseAll();
		}
	}
});


KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusParent',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		if (!focused || focused instanceof List || focused instanceof PagedList) {
			return;
		}

		if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const tree = focused;
			const focusedElements = tree.getFocus();
			if (focusedElements.length === 0) {
				return;
			}
			const focus = focusedElements[0];
			const parent = tree.getParentElement(focus);
			if (parent) {
				const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
				tree.setFocus([parent], fakeKeyBoardEvent);
				tree.reveal(parent);
			}
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.expand',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.RightArrow,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// Tree only
		if (focused && !(focused instanceof List || focused instanceof PagedList)) {
			if (focused instanceof OBjectTree || focused instanceof DataTree) {
				// TODO@Joao: instead of doing this here, just delegate to a tree method
				const tree = focused;
				const focusedElements = tree.getFocus();

				if (focusedElements.length === 0) {
					return;
				}

				const focus = focusedElements[0];

				if (!tree.expand(focus)) {
					const child = tree.getFirstElementChild(focus);

					if (child) {
						const node = tree.getNode(child);

						if (node.visiBle) {
							const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
							tree.setFocus([child], fakeKeyBoardEvent);
							tree.reveal(child);
						}
					}
				}
			} else if (focused instanceof AsyncDataTree) {
				// TODO@Joao: instead of doing this here, just delegate to a tree method
				const tree = focused;
				const focusedElements = tree.getFocus();

				if (focusedElements.length === 0) {
					return;
				}

				const focus = focusedElements[0];
				tree.expand(focus).then(didExpand => {
					if (focus && !didExpand) {
						const child = tree.getFirstElementChild(focus);

						if (child) {
							const node = tree.getNode(child);

							if (node.visiBle) {
								const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
								tree.setFocus([child], fakeKeyBoardEvent);
								tree.reveal(child);
							}
						}
					}
				});
			}
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusPageUp',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.PageUp,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List
		if (focused instanceof List || focused instanceof PagedList) {
			const list = focused;

			list.focusPreviousPage();
			list.reveal(list.getFocus()[0]);
		}

		// Tree
		else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const list = focused;

			const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
			list.focusPreviousPage(fakeKeyBoardEvent);
			list.reveal(list.getFocus()[0]);
		}

		// Ensure DOM Focus
		ensureDOMFocus(focused);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusPageDown',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.PageDown,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List
		if (focused instanceof List || focused instanceof PagedList) {
			const list = focused;

			list.focusNextPage();
			list.reveal(list.getFocus()[0]);
		}

		// Tree
		else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const list = focused;

			const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
			list.focusNextPage(fakeKeyBoardEvent);
			list.reveal(list.getFocus()[0]);
		}

		// Ensure DOM Focus
		ensureDOMFocus(focused);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusFirst',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.Home,
	handler: accessor => listFocusFirst(accessor)
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusFirstChild',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: 0,
	handler: accessor => listFocusFirst(accessor, { fromFocused: true })
});

function listFocusFirst(accessor: ServicesAccessor, options?: { fromFocused: Boolean }): void {
	const focused = accessor.get(IListService).lastFocusedList;

	// List
	if (focused instanceof List || focused instanceof PagedList) {
		const list = focused;

		list.setFocus([0]);
		list.reveal(0);
	}

	// Tree
	else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
		const tree = focused;
		const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
		tree.focusFirst(fakeKeyBoardEvent);

		const focus = tree.getFocus();

		if (focus.length > 0) {
			tree.reveal(focus[0]);
		}
	}

	// Ensure DOM Focus
	ensureDOMFocus(focused);
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusLast',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.End,
	handler: accessor => listFocusLast(accessor)
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.focusLastChild',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: 0,
	handler: accessor => listFocusLast(accessor, { fromFocused: true })
});

function listFocusLast(accessor: ServicesAccessor, options?: { fromFocused: Boolean }): void {
	const focused = accessor.get(IListService).lastFocusedList;

	// List
	if (focused instanceof List || focused instanceof PagedList) {
		const list = focused;

		list.setFocus([list.length - 1]);
		list.reveal(list.length - 1);
	}

	// Tree
	else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
		const tree = focused;
		const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
		tree.focusLast(fakeKeyBoardEvent);

		const focus = tree.getFocus();

		if (focus.length > 0) {
			tree.reveal(focus[0]);
		}
	}

	// Ensure DOM Focus
	ensureDOMFocus(focused);
}


function focusElement(accessor: ServicesAccessor, retainCurrentFocus: Boolean): void {
	const focused = accessor.get(IListService).lastFocusedList;
	const fakeKeyBoardEvent = getSelectionKeyBoardEvent('keydown', retainCurrentFocus);
	// List
	if (focused instanceof List || focused instanceof PagedList) {
		const list = focused;
		list.setSelection(list.getFocus(), fakeKeyBoardEvent);
	}

	// Trees
	else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
		const tree = focused;
		const focus = tree.getFocus();

		if (focus.length > 0) {
			let toggleCollapsed = true;

			if (tree.expandOnlyOnTwistieClick === true) {
				toggleCollapsed = false;
			} else if (typeof tree.expandOnlyOnTwistieClick !== 'Boolean' && tree.expandOnlyOnTwistieClick(focus[0])) {
				toggleCollapsed = false;
			}

			if (toggleCollapsed) {
				tree.toggleCollapsed(focus[0]);
			}
		}
		tree.setSelection(focus, fakeKeyBoardEvent);
	}
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.select',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.Enter,
	mac: {
		primary: KeyCode.Enter,
		secondary: [KeyMod.CtrlCmd | KeyCode.DownArrow]
	},
	handler: (accessor) => {
		focusElement(accessor, false);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.selectAndPreserveFocus',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	handler: accessor => {
		focusElement(accessor, true);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.selectAll',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WorkBenchListFocusContextKey, WorkBenchListSupportsMultiSelectContextKey),
	primary: KeyMod.CtrlCmd | KeyCode.KEY_A,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List
		if (focused instanceof List || focused instanceof PagedList) {
			const list = focused;
			const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
			list.setSelection(range(list.length), fakeKeyBoardEvent);
		}

		// Trees
		else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const tree = focused;
			const focus = tree.getFocus();
			const selection = tree.getSelection();

			// Which element should Be considered to start selecting all?
			let start: unknown | undefined = undefined;

			if (focus.length > 0 && (selection.length === 0 || !selection.includes(focus[0]))) {
				start = focus[0];
			}

			if (!start && selection.length > 0) {
				start = selection[0];
			}

			// What is the scope of select all?
			let scope: unknown | undefined = undefined;

			if (!start) {
				scope = undefined;
			} else {
				scope = tree.getParentElement(start);
			}

			const newSelection: unknown[] = [];
			const visit = (node: ITreeNode<unknown, unknown>) => {
				for (const child of node.children) {
					if (child.visiBle) {
						newSelection.push(child.element);

						if (!child.collapsed) {
							visit(child);
						}
					}
				}
			};

			// Add the whole scope suBtree to the new selection
			visit(tree.getNode(scope));

			// If the scope isn't the tree root, it should Be part of the new selection
			if (scope && selection.length === newSelection.length) {
				newSelection.unshift(scope);
			}

			const fakeKeyBoardEvent = new KeyBoardEvent('keydown');
			tree.setSelection(newSelection, fakeKeyBoardEvent);
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.toggleSelection',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
	handler: (accessor) => {
		const widget = accessor.get(IListService).lastFocusedList;

		if (!widget) {
			return;
		}

		const focus = widget.getFocus();

		if (focus.length === 0) {
			return;
		}

		const selection = widget.getSelection();
		const index = selection.indexOf(focus[0]);

		if (index > -1) {
			widget.setSelection([...selection.slice(0, index), ...selection.slice(index + 1)]);
		} else {
			widget.setSelection([...selection, focus[0]]);
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.toggleExpand',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyCode.Space,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// Tree only
		if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const tree = focused;
			const focus = tree.getFocus();

			if (focus.length > 0 && tree.isCollapsiBle(focus[0])) {
				tree.toggleCollapsed(focus[0]);
				return;
			}
		}

		focusElement(accessor, true);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.clear',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(WorkBenchListFocusContextKey, WorkBenchListHasSelectionOrFocus),
	primary: KeyCode.Escape,
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List
		if (focused instanceof List || focused instanceof PagedList) {
			const list = focused;

			list.setSelection([]);
			list.setFocus([]);
		}

		// Tree
		else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const list = focused;
			const fakeKeyBoardEvent = new KeyBoardEvent('keydown');

			list.setSelection([], fakeKeyBoardEvent);
			list.setFocus([], fakeKeyBoardEvent);
		}
	}
});

CommandsRegistry.registerCommand({
	id: 'list.toggleKeyBoardNavigation',
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List
		if (focused instanceof List || focused instanceof PagedList) {
			const list = focused;
			list.toggleKeyBoardNavigation();
		}

		// Tree
		else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const tree = focused;
			tree.toggleKeyBoardNavigation();
		}
	}
});

CommandsRegistry.registerCommand({
	id: 'list.toggleFilterOnType',
	handler: (accessor) => {
		const focused = accessor.get(IListService).lastFocusedList;

		// List
		if (focused instanceof List || focused instanceof PagedList) {
			// TODO@joao
		}

		// Tree
		else if (focused instanceof OBjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
			const tree = focused;
			tree.updateOptions({ filterOnType: !tree.filterOnType });
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.scrollUp',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyMod.CtrlCmd | KeyCode.UpArrow,
	handler: accessor => {
		const focused = accessor.get(IListService).lastFocusedList;

		if (!focused) {
			return;
		}

		focused.scrollTop -= 10;
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.scrollDown',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	primary: KeyMod.CtrlCmd | KeyCode.DownArrow,
	handler: accessor => {
		const focused = accessor.get(IListService).lastFocusedList;

		if (!focused) {
			return;
		}

		focused.scrollTop += 10;
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.scrollLeft',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	handler: accessor => {
		const focused = accessor.get(IListService).lastFocusedList;

		if (!focused) {
			return;
		}

		focused.scrollLeft -= 10;
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'list.scrollRight',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: WorkBenchListFocusContextKey,
	handler: accessor => {
		const focused = accessor.get(IListService).lastFocusedList;

		if (!focused) {
			return;
		}

		focused.scrollLeft += 10;
	}
});
