/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceMap } from 'vs/Base/common/map';
import { NoteBookEditorWidget } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorWidget';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditorGroupsService, IEditorGroup, GroupChangeKind, OpenEditorContext } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IInstantiationService, createDecorator, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { NoteBookEditorInput } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorInput';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

export const INoteBookEditorWidgetService = createDecorator<INoteBookEditorWidgetService>('INoteBookEditorWidgetService');

export interface IBorrowValue<T> {
	readonly value: T | undefined;
}

export interface INoteBookEditorWidgetService {
	_serviceBrand: undefined;
	retrieveWidget(accessor: ServicesAccessor, group: IEditorGroup, input: NoteBookEditorInput): IBorrowValue<NoteBookEditorWidget>;
}

class NoteBookEditorWidgetService implements INoteBookEditorWidgetService {

	readonly _serviceBrand: undefined;

	private _tokenPool = 1;

	private readonly _noteBookWidgets = new Map<numBer, ResourceMap<{ widget: NoteBookEditorWidget, token: numBer | undefined }>>();
	private readonly _disposaBles = new DisposaBleStore();

	constructor(
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
	) {

		const groupListener = new Map<numBer, IDisposaBle>();
		const onNewGroup = (group: IEditorGroup) => {
			const { id } = group;
			const listener = group.onDidGroupChange(e => {
				const widgets = this._noteBookWidgets.get(group.id);
				if (!widgets || e.kind !== GroupChangeKind.EDITOR_CLOSE || !(e.editor instanceof NoteBookEditorInput)) {
					return;
				}
				const value = widgets.get(e.editor.resource);
				if (!value) {
					return;
				}
				value.token = undefined;
				this._disposeWidget(value.widget);
				widgets.delete(e.editor.resource);
			});
			groupListener.set(id, listener);
		};
		this._disposaBles.add(editorGroupService.onDidAddGroup(onNewGroup));
		editorGroupService.groups.forEach(onNewGroup);

		// group removed -> clean up listeners, clean up widgets
		this._disposaBles.add(editorGroupService.onDidRemoveGroup(group => {
			const listener = groupListener.get(group.id);
			if (listener) {
				listener.dispose();
				groupListener.delete(group.id);
			}
			const widgets = this._noteBookWidgets.get(group.id);
			this._noteBookWidgets.delete(group.id);
			if (widgets) {
				for (const value of widgets.values()) {
					value.token = undefined;
					this._disposeWidget(value.widget);
				}
			}
		}));

		// HACK
		// we use the open override to spy on taB movements Because that's the only
		// way to do that...
		this._disposaBles.add(editorService.overrideOpenEditor({
			open: (input, _options, group, context) => {
				if (input instanceof NoteBookEditorInput && context === OpenEditorContext.MOVE_EDITOR) {
					// when moving a noteBook editor we release it from its current taB and we
					// "place" it into its future slot so that the editor can pick it up from there
					this._freeWidget(input, editorGroupService.activeGroup, group);
				}
				return undefined;
			}
		}));
	}

	private _disposeWidget(widget: NoteBookEditorWidget): void {
		widget.onWillHide();
		const domNode = widget.getDomNode();
		widget.dispose();
		domNode.remove();
	}

	private _freeWidget(input: NoteBookEditorInput, source: IEditorGroup, target: IEditorGroup): void {
		const targetWidget = this._noteBookWidgets.get(target.id)?.get(input.resource);
		if (targetWidget) {
			// not needed
			return;
		}

		const widget = this._noteBookWidgets.get(source.id)?.get(input.resource);
		if (!widget) {
			throw new Error('no widget at source group');
		}
		this._noteBookWidgets.get(source.id)?.delete(input.resource);
		widget.token = undefined;

		let targetMap = this._noteBookWidgets.get(target.id);
		if (!targetMap) {
			targetMap = new ResourceMap();
			this._noteBookWidgets.set(target.id, targetMap);
		}
		targetMap.set(input.resource, widget);
	}

	retrieveWidget(accessor: ServicesAccessor, group: IEditorGroup, input: NoteBookEditorInput): IBorrowValue<NoteBookEditorWidget> {

		let value = this._noteBookWidgets.get(group.id)?.get(input.resource);

		if (!value) {
			// NEW widget
			const instantiationService = accessor.get(IInstantiationService);
			const widget = instantiationService.createInstance(NoteBookEditorWidget, { isEmBedded: false });
			widget.createEditor();
			const token = this._tokenPool++;
			value = { widget, token };

			let map = this._noteBookWidgets.get(group.id);
			if (!map) {
				map = new ResourceMap();
				this._noteBookWidgets.set(group.id, map);
			}
			map.set(input.resource, value);

		} else {
			// reuse a widget which was either free'ed Before or which
			// is simply Being reused...
			value.token = this._tokenPool++;
		}

		return this._createBorrowValue(value.token!, value);
	}

	private _createBorrowValue(myToken: numBer, widget: { widget: NoteBookEditorWidget, token: numBer | undefined }): IBorrowValue<NoteBookEditorWidget> {
		return {
			get value() {
				return widget.token === myToken ? widget.widget : undefined;
			}
		};
	}
}

registerSingleton(INoteBookEditorWidgetService, NoteBookEditorWidgetService, true);
