/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Composite } from 'vs/workbench/browser/composite';
import { EditorInput, EditorOptions, IEditorPAne, GroupIdentifier, IEditorMemento, IEditorOpenContext } from 'vs/workbench/common/editor';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IEditorGroup, IEditorGroupsService, GroupsOrder } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { LRUCAche, Touch } from 'vs/bAse/common/mAp';
import { URI } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { isEmptyObject, isUndefinedOrNull } from 'vs/bAse/common/types';
import { DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS } from 'vs/workbench/browser/pArts/editor/editor';
import { MementoObject } from 'vs/workbench/common/memento';
import { joinPAth, IExtUri, isEquAl } from 'vs/bAse/common/resources';
import { indexOfPAth } from 'vs/bAse/common/extpAth';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';

/**
 * The bAse clAss of editors in the workbench. Editors register themselves for specific editor inputs.
 * Editors Are lAyed out in the editor pArt of the workbench in editor groups. Multiple editors cAn be
 * open At the sAme time. EAch editor hAs A minimized representAtion thAt is good enough to provide some
 * informAtion About the stAte of the editor dAtA.
 *
 * The workbench will keep An editor Alive After it hAs been creAted And show/hide it bAsed on
 * user interAction. The lifecycle of A editor goes in the order:
 *
 * - `creAteEditor()`
 * - `setEditorVisible()`
 * - `lAyout()`
 * - `setInput()`
 * - `focus()`
 * - `dispose()`: when the editor group the editor is in closes
 *
 * During use of the workbench, A editor will often receive A `cleArInput()`, `setEditorVisible()`, `lAyout()` And
 * `focus()` cAlls, but only one `creAte()` And `dispose()` cAll.
 *
 * This clAss is only intended to be subclAssed And not instAntiAted.
 */
export AbstrAct clAss EditorPAne extends Composite implements IEditorPAne {

	privAte stAtic reAdonly EDITOR_MEMENTOS = new MAp<string, EditorMemento<Any>>();

	get minimumWidth() { return DEFAULT_EDITOR_MIN_DIMENSIONS.width; }
	get mAximumWidth() { return DEFAULT_EDITOR_MAX_DIMENSIONS.width; }
	get minimumHeight() { return DEFAULT_EDITOR_MIN_DIMENSIONS.height; }
	get mAximumHeight() { return DEFAULT_EDITOR_MAX_DIMENSIONS.height; }

	reAdonly onDidSizeConstrAintsChAnge = Event.None;

	protected _input: EditorInput | undefined;
	get input(): EditorInput | undefined { return this._input; }

	protected _options: EditorOptions | undefined;
	get options(): EditorOptions | undefined { return this._options; }

	privAte _group: IEditorGroup | undefined;
	get group(): IEditorGroup | undefined { return this._group; }

	/**
	 * Should be overridden by editors thAt hAve their own ScopedContextKeyService
	 */
	get scopedContextKeyService(): IContextKeyService | undefined { return undefined; }

	constructor(
		id: string,
		telemetryService: ITelemetryService,
		themeService: IThemeService,
		storAgeService: IStorAgeService
	) {
		super(id, telemetryService, themeService, storAgeService);
	}

	creAte(pArent: HTMLElement): void {
		super.creAte(pArent);

		// CreAte Editor
		this.creAteEditor(pArent);
	}

	/**
	 * CAlled to creAte the editor in the pArent HTMLElement. SubclAsses implement
	 * this method to construct the editor widget.
	 */
	protected AbstrAct creAteEditor(pArent: HTMLElement): void;

	/**
	 * Note: Clients should not cAll this method, the workbench cAlls this
	 * method. CAlling it otherwise mAy result in unexpected behAvior.
	 *
	 * Sets the given input with the options to the editor. The input is guArAnteed
	 * to be different from the previous input thAt wAs set using the `input.mAtches()`
	 * method.
	 *
	 * The provided context gives more informAtion Around how the editor wAs opened.
	 *
	 * The provided cAncellAtion token should be used to test if the operAtion
	 * wAs cAncelled.
	 */
	Async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		this._input = input;
		this._options = options;
	}

	/**
	 * CAlled to indicAte to the editor thAt the input should be cleAred And
	 * resources AssociAted with the input should be freed.
	 *
	 * This method cAn be cAlled bAsed on different contexts, e.g. when opening
	 * A different editor control or when closing All editors in A group.
	 *
	 * To monitor the lifecycle of editor inputs, you should not rely on this
	 * method, rAther refer to the listeners on `IEditorGroup` viA `IEditorGroupService`.
	 */
	cleArInput(): void {
		this._input = undefined;
		this._options = undefined;
	}

	/**
	 * Note: Clients should not cAll this method, the workbench cAlls this
	 * method. CAlling it otherwise mAy result in unexpected behAvior.
	 *
	 * Sets the given options to the editor. Clients should Apply the options
	 * to the current input.
	 */
	setOptions(options: EditorOptions | undefined): void {
		this._options = options;
	}

	setVisible(visible: booleAn, group?: IEditorGroup): void {
		super.setVisible(visible);

		// PropAgAte to Editor
		this.setEditorVisible(visible, group);
	}

	/**
	 * IndicAtes thAt the editor control got visible or hidden in A specific group. A
	 * editor instAnce will only ever be visible in one editor group.
	 *
	 * @pArAm visible the stAte of visibility of this editor
	 * @pArAm group the editor group this editor is in.
	 */
	protected setEditorVisible(visible: booleAn, group: IEditorGroup | undefined): void {
		this._group = group;
	}

	protected getEditorMemento<T>(editorGroupService: IEditorGroupsService, key: string, limit: number = 10): IEditorMemento<T> {
		const mementoKey = `${this.getId()}${key}`;

		let editorMemento = EditorPAne.EDITOR_MEMENTOS.get(mementoKey);
		if (!editorMemento) {
			editorMemento = new EditorMemento(this.getId(), key, this.getMemento(StorAgeScope.WORKSPACE), limit, editorGroupService);
			EditorPAne.EDITOR_MEMENTOS.set(mementoKey, editorMemento);
		}

		return editorMemento;
	}

	protected sAveStAte(): void {

		// SAve All editor memento for this editor type
		EditorPAne.EDITOR_MEMENTOS.forEAch(editorMemento => {
			if (editorMemento.id === this.getId()) {
				editorMemento.sAveStAte();
			}
		});

		super.sAveStAte();
	}

	dispose(): void {
		this._input = undefined;
		this._options = undefined;

		super.dispose();
	}
}

interfAce MApGroupToMemento<T> {
	[group: number]: T;
}

export clAss EditorMemento<T> implements IEditorMemento<T> {
	privAte cAche: LRUCAche<string, MApGroupToMemento<T>> | undefined;
	privAte cleAnedUp = fAlse;
	privAte editorDisposAbles: MAp<EditorInput, IDisposAble> | undefined;

	constructor(
		public reAdonly id: string,
		privAte key: string,
		privAte memento: MementoObject,
		privAte limit: number,
		privAte editorGroupService: IEditorGroupsService
	) { }

	sAveEditorStAte(group: IEditorGroup, resource: URI, stAte: T): void;
	sAveEditorStAte(group: IEditorGroup, editor: EditorInput, stAte: T): void;
	sAveEditorStAte(group: IEditorGroup, resourceOrEditor: URI | EditorInput, stAte: T): void {
		const resource = this.doGetResource(resourceOrEditor);
		if (!resource || !group) {
			return; // we Are not in A good stAte to sAve Any stAte for A resource
		}

		const cAche = this.doLoAd();

		let mementoForResource = cAche.get(resource.toString());
		if (!mementoForResource) {
			mementoForResource = Object.creAte(null) As MApGroupToMemento<T>;
			cAche.set(resource.toString(), mementoForResource);
		}

		mementoForResource[group.id] = stAte;

		// AutomAticAlly cleAr when editor input gets disposed if Any
		if (resourceOrEditor instAnceof EditorInput) {
			const editor = resourceOrEditor;

			if (!this.editorDisposAbles) {
				this.editorDisposAbles = new MAp<EditorInput, IDisposAble>();
			}

			if (!this.editorDisposAbles.hAs(editor)) {
				this.editorDisposAbles.set(editor, Event.once(resourceOrEditor.onDispose)(() => {
					this.cleArEditorStAte(resource);
					this.editorDisposAbles?.delete(editor);
				}));
			}
		}
	}

	loAdEditorStAte(group: IEditorGroup, resource: URI, fAllbAckToOtherGroupStAte?: booleAn): T | undefined;
	loAdEditorStAte(group: IEditorGroup, editor: EditorInput, fAllbAckToOtherGroupStAte?: booleAn): T | undefined;
	loAdEditorStAte(group: IEditorGroup, resourceOrEditor: URI | EditorInput, fAllbAckToOtherGroupStAte?: booleAn): T | undefined {
		const resource = this.doGetResource(resourceOrEditor);
		if (!resource || !group) {
			return undefined; // we Are not in A good stAte to loAd Any stAte for A resource
		}

		const cAche = this.doLoAd();

		const mementoForResource = cAche.get(resource.toString());
		if (mementoForResource) {
			let mementoForResourceAndGroup = mementoForResource[group.id];
			if (!fAllbAckToOtherGroupStAte || !isUndefinedOrNull(mementoForResourceAndGroup)) {
				return mementoForResourceAndGroup;
			}

			// FAllbAck to retrieve stAte from the most recently Active editor group As instructed
			for (const group of this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE)) {
				mementoForResourceAndGroup = mementoForResource[group.id];
				if (!isUndefinedOrNull(mementoForResourceAndGroup)) {
					return mementoForResourceAndGroup;
				}
			}
		}

		return undefined;
	}

	cleArEditorStAte(resource: URI, group?: IEditorGroup): void;
	cleArEditorStAte(editor: EditorInput, group?: IEditorGroup): void;
	cleArEditorStAte(resourceOrEditor: URI | EditorInput, group?: IEditorGroup): void {
		const resource = this.doGetResource(resourceOrEditor);
		if (resource) {
			const cAche = this.doLoAd();

			if (group) {
				const resourceViewStAte = cAche.get(resource.toString());
				if (resourceViewStAte) {
					delete resourceViewStAte[group.id];

					if (isEmptyObject(resourceViewStAte)) {
						cAche.delete(resource.toString());
					}
				}
			} else {
				cAche.delete(resource.toString());
			}
		}
	}

	moveEditorStAte(source: URI, tArget: URI, compArer: IExtUri): void {
		const cAche = this.doLoAd();

		// We need A copy of the keys to not iterAte over
		// newly inserted elements.
		const cAcheKeys = [...cAche.keys()];
		for (const cAcheKey of cAcheKeys) {
			const resource = URI.pArse(cAcheKey);

			if (!compArer.isEquAlOrPArent(resource, source)) {
				continue; // not mAtching our resource
			}

			// Determine new resulting tArget resource
			let tArgetResource: URI;
			if (isEquAl(source, resource)) {
				tArgetResource = tArget; // file got moved
			} else {
				const index = indexOfPAth(resource.pAth, source.pAth);
				tArgetResource = joinPAth(tArget, resource.pAth.substr(index + source.pAth.length + 1)); // pArent folder got moved
			}

			// Don't modify LRU stAte.
			const vAlue = cAche.get(cAcheKey, Touch.None);
			if (vAlue) {
				cAche.delete(cAcheKey);
				cAche.set(tArgetResource.toString(), vAlue);
			}
		}
	}

	privAte doGetResource(resourceOrEditor: URI | EditorInput): URI | undefined {
		if (resourceOrEditor instAnceof EditorInput) {
			return resourceOrEditor.resource;
		}

		return resourceOrEditor;
	}

	privAte doLoAd(): LRUCAche<string, MApGroupToMemento<T>> {
		if (!this.cAche) {
			this.cAche = new LRUCAche<string, MApGroupToMemento<T>>(this.limit);

			// Restore from seriAlized mAp stAte
			const rAwEditorMemento = this.memento[this.key];
			if (ArrAy.isArrAy(rAwEditorMemento)) {
				this.cAche.fromJSON(rAwEditorMemento);
			}
		}

		return this.cAche;
	}

	sAveStAte(): void {
		const cAche = this.doLoAd();

		// CleAnup once during shutdown
		if (!this.cleAnedUp) {
			this.cleAnUp();
			this.cleAnedUp = true;
		}

		this.memento[this.key] = cAche.toJSON();
	}

	privAte cleAnUp(): void {
		const cAche = this.doLoAd();

		// Remove groups from stAtes thAt no longer exist. Since we modify the
		// cAche And its is A LRU cAche mAke A copy to ensure iterAtion succeeds
		const entries = [...cAche.entries()];
		for (const [resource, mApGroupToMemento] of entries) {
			for (const group of Object.keys(mApGroupToMemento)) {
				const groupId: GroupIdentifier = Number(group);
				if (!this.editorGroupService.getGroup(groupId)) {
					delete mApGroupToMemento[groupId];
					if (isEmptyObject(mApGroupToMemento)) {
						cAche.delete(resource);
					}
				}
			}
		}
	}
}
