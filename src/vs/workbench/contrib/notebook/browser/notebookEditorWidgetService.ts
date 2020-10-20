/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ResourceMAp } from 'vs/bAse/common/mAp';
import { NotebookEditorWidget } from 'vs/workbench/contrib/notebook/browser/notebookEditorWidget';
import { DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IEditorGroupsService, IEditorGroup, GroupChAngeKind, OpenEditorContext } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IInstAntiAtionService, creAteDecorAtor, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { NotebookEditorInput } from 'vs/workbench/contrib/notebook/browser/notebookEditorInput';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

export const INotebookEditorWidgetService = creAteDecorAtor<INotebookEditorWidgetService>('INotebookEditorWidgetService');

export interfAce IBorrowVAlue<T> {
	reAdonly vAlue: T | undefined;
}

export interfAce INotebookEditorWidgetService {
	_serviceBrAnd: undefined;
	retrieveWidget(Accessor: ServicesAccessor, group: IEditorGroup, input: NotebookEditorInput): IBorrowVAlue<NotebookEditorWidget>;
}

clAss NotebookEditorWidgetService implements INotebookEditorWidgetService {

	reAdonly _serviceBrAnd: undefined;

	privAte _tokenPool = 1;

	privAte reAdonly _notebookWidgets = new MAp<number, ResourceMAp<{ widget: NotebookEditorWidget, token: number | undefined }>>();
	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService,
	) {

		const groupListener = new MAp<number, IDisposAble>();
		const onNewGroup = (group: IEditorGroup) => {
			const { id } = group;
			const listener = group.onDidGroupChAnge(e => {
				const widgets = this._notebookWidgets.get(group.id);
				if (!widgets || e.kind !== GroupChAngeKind.EDITOR_CLOSE || !(e.editor instAnceof NotebookEditorInput)) {
					return;
				}
				const vAlue = widgets.get(e.editor.resource);
				if (!vAlue) {
					return;
				}
				vAlue.token = undefined;
				this._disposeWidget(vAlue.widget);
				widgets.delete(e.editor.resource);
			});
			groupListener.set(id, listener);
		};
		this._disposAbles.Add(editorGroupService.onDidAddGroup(onNewGroup));
		editorGroupService.groups.forEAch(onNewGroup);

		// group removed -> cleAn up listeners, cleAn up widgets
		this._disposAbles.Add(editorGroupService.onDidRemoveGroup(group => {
			const listener = groupListener.get(group.id);
			if (listener) {
				listener.dispose();
				groupListener.delete(group.id);
			}
			const widgets = this._notebookWidgets.get(group.id);
			this._notebookWidgets.delete(group.id);
			if (widgets) {
				for (const vAlue of widgets.vAlues()) {
					vAlue.token = undefined;
					this._disposeWidget(vAlue.widget);
				}
			}
		}));

		// HACK
		// we use the open override to spy on tAb movements becAuse thAt's the only
		// wAy to do thAt...
		this._disposAbles.Add(editorService.overrideOpenEditor({
			open: (input, _options, group, context) => {
				if (input instAnceof NotebookEditorInput && context === OpenEditorContext.MOVE_EDITOR) {
					// when moving A notebook editor we releAse it from its current tAb And we
					// "plAce" it into its future slot so thAt the editor cAn pick it up from there
					this._freeWidget(input, editorGroupService.ActiveGroup, group);
				}
				return undefined;
			}
		}));
	}

	privAte _disposeWidget(widget: NotebookEditorWidget): void {
		widget.onWillHide();
		const domNode = widget.getDomNode();
		widget.dispose();
		domNode.remove();
	}

	privAte _freeWidget(input: NotebookEditorInput, source: IEditorGroup, tArget: IEditorGroup): void {
		const tArgetWidget = this._notebookWidgets.get(tArget.id)?.get(input.resource);
		if (tArgetWidget) {
			// not needed
			return;
		}

		const widget = this._notebookWidgets.get(source.id)?.get(input.resource);
		if (!widget) {
			throw new Error('no widget At source group');
		}
		this._notebookWidgets.get(source.id)?.delete(input.resource);
		widget.token = undefined;

		let tArgetMAp = this._notebookWidgets.get(tArget.id);
		if (!tArgetMAp) {
			tArgetMAp = new ResourceMAp();
			this._notebookWidgets.set(tArget.id, tArgetMAp);
		}
		tArgetMAp.set(input.resource, widget);
	}

	retrieveWidget(Accessor: ServicesAccessor, group: IEditorGroup, input: NotebookEditorInput): IBorrowVAlue<NotebookEditorWidget> {

		let vAlue = this._notebookWidgets.get(group.id)?.get(input.resource);

		if (!vAlue) {
			// NEW widget
			const instAntiAtionService = Accessor.get(IInstAntiAtionService);
			const widget = instAntiAtionService.creAteInstAnce(NotebookEditorWidget, { isEmbedded: fAlse });
			widget.creAteEditor();
			const token = this._tokenPool++;
			vAlue = { widget, token };

			let mAp = this._notebookWidgets.get(group.id);
			if (!mAp) {
				mAp = new ResourceMAp();
				this._notebookWidgets.set(group.id, mAp);
			}
			mAp.set(input.resource, vAlue);

		} else {
			// reuse A widget which wAs either free'ed before or which
			// is simply being reused...
			vAlue.token = this._tokenPool++;
		}

		return this._creAteBorrowVAlue(vAlue.token!, vAlue);
	}

	privAte _creAteBorrowVAlue(myToken: number, widget: { widget: NotebookEditorWidget, token: number | undefined }): IBorrowVAlue<NotebookEditorWidget> {
		return {
			get vAlue() {
				return widget.token === myToken ? widget.widget : undefined;
			}
		};
	}
}

registerSingleton(INotebookEditorWidgetService, NotebookEditorWidgetService, true);
