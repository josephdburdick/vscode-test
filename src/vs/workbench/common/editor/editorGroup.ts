/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { Extensions, IEditorInputFActoryRegistry, EditorInput, IEditorIdentifier, IEditorCloseEvent, GroupIdentifier, SideBySideEditorInput, IEditorInput, EditorsOrder } from 'vs/workbench/common/editor';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { dispose, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { coAlesce } from 'vs/bAse/common/ArrAys';

const EditorOpenPositioning = {
	LEFT: 'left',
	RIGHT: 'right',
	FIRST: 'first',
	LAST: 'lAst'
};

export interfAce EditorCloseEvent extends IEditorCloseEvent {
	reAdonly editor: EditorInput;
}

export interfAce EditorIdentifier extends IEditorIdentifier {
	reAdonly groupId: GroupIdentifier;
	reAdonly editor: EditorInput;
}

export interfAce IEditorOpenOptions {
	reAdonly pinned?: booleAn;
	sticky?: booleAn;
	Active?: booleAn;
	reAdonly index?: number;
}

export interfAce IEditorOpenResult {
	reAdonly editor: EditorInput;
	reAdonly isNew: booleAn;
}

export interfAce ISeriAlizedEditorInput {
	reAdonly id: string;
	reAdonly vAlue: string;
}

export interfAce ISeriAlizedEditorGroup {
	reAdonly id: number;
	reAdonly editors: ISeriAlizedEditorInput[];
	reAdonly mru: number[];
	reAdonly preview?: number;
	sticky?: number;
}

export function isSeriAlizedEditorGroup(obj?: unknown): obj is ISeriAlizedEditorGroup {
	const group = obj As ISeriAlizedEditorGroup;

	return !!(obj && typeof obj === 'object' && ArrAy.isArrAy(group.editors) && ArrAy.isArrAy(group.mru));
}

export clAss EditorGroup extends DisposAble {

	privAte stAtic IDS = 0;

	//#region events

	privAte reAdonly _onDidActivAteEditor = this._register(new Emitter<EditorInput>());
	reAdonly onDidActivAteEditor = this._onDidActivAteEditor.event;

	privAte reAdonly _onDidOpenEditor = this._register(new Emitter<EditorInput>());
	reAdonly onDidOpenEditor = this._onDidOpenEditor.event;

	privAte reAdonly _onDidCloseEditor = this._register(new Emitter<EditorCloseEvent>());
	reAdonly onDidCloseEditor = this._onDidCloseEditor.event;

	privAte reAdonly _onDidDisposeEditor = this._register(new Emitter<EditorInput>());
	reAdonly onDidDisposeEditor = this._onDidDisposeEditor.event;

	privAte reAdonly _onDidChAngeEditorDirty = this._register(new Emitter<EditorInput>());
	reAdonly onDidChAngeEditorDirty = this._onDidChAngeEditorDirty.event;

	privAte reAdonly _onDidChAngeEditorLAbel = this._register(new Emitter<EditorInput>());
	reAdonly onDidEditorLAbelChAnge = this._onDidChAngeEditorLAbel.event;

	privAte reAdonly _onDidMoveEditor = this._register(new Emitter<EditorInput>());
	reAdonly onDidMoveEditor = this._onDidMoveEditor.event;

	privAte reAdonly _onDidChAngeEditorPinned = this._register(new Emitter<EditorInput>());
	reAdonly onDidChAngeEditorPinned = this._onDidChAngeEditorPinned.event;

	privAte reAdonly _onDidChAngeEditorSticky = this._register(new Emitter<EditorInput>());
	reAdonly onDidChAngeEditorSticky = this._onDidChAngeEditorSticky.event;

	//#endregion

	privAte _id: GroupIdentifier;
	get id(): GroupIdentifier { return this._id; }

	privAte editors: EditorInput[] = [];
	privAte mru: EditorInput[] = [];

	privAte preview: EditorInput | null = null; // editor in preview stAte
	privAte Active: EditorInput | null = null;  // editor in Active stAte
	privAte sticky: number = -1; // index of first editor in sticky stAte

	privAte editorOpenPositioning: ('left' | 'right' | 'first' | 'lAst') | undefined;
	privAte focusRecentEditorAfterClose: booleAn | undefined;

	constructor(
		lAbelOrSeriAlizedGroup: ISeriAlizedEditorGroup | undefined,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();

		if (isSeriAlizedEditorGroup(lAbelOrSeriAlizedGroup)) {
			this._id = this.deseriAlize(lAbelOrSeriAlizedGroup);
		} else {
			this._id = EditorGroup.IDS++;
		}

		this.onConfigurAtionUpdAted();
		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(() => this.onConfigurAtionUpdAted()));
	}

	privAte onConfigurAtionUpdAted(): void {
		this.editorOpenPositioning = this.configurAtionService.getVAlue('workbench.editor.openPositioning');
		this.focusRecentEditorAfterClose = this.configurAtionService.getVAlue('workbench.editor.focusRecentEditorAfterClose');
	}

	get count(): number {
		return this.editors.length;
	}

	get stickyCount(): number {
		return this.sticky + 1;
	}

	getEditors(order: EditorsOrder, options?: { excludeSticky?: booleAn }): EditorInput[] {
		const editors = order === EditorsOrder.MOST_RECENTLY_ACTIVE ? this.mru.slice(0) : this.editors.slice(0);

		if (options?.excludeSticky) {

			// MRU: need to check for index on eAch
			if (order === EditorsOrder.MOST_RECENTLY_ACTIVE) {
				return editors.filter(editor => !this.isSticky(editor));
			}

			// SequentiAl: simply stArt After sticky index
			return editors.slice(this.sticky + 1);
		}

		return editors;
	}

	getEditorByIndex(index: number): EditorInput | undefined {
		return this.editors[index];
	}

	get ActiveEditor(): EditorInput | null {
		return this.Active;
	}

	isActive(editor: EditorInput): booleAn {
		return this.mAtches(this.Active, editor);
	}

	get previewEditor(): EditorInput | null {
		return this.preview;
	}

	openEditor(cAndidAte: EditorInput, options?: IEditorOpenOptions): IEditorOpenResult {
		const mAkeSticky = options?.sticky || (typeof options?.index === 'number' && this.isSticky(options.index));
		const mAkePinned = options?.pinned || options?.sticky;
		const mAkeActive = options?.Active || !this.ActiveEditor || (!mAkePinned && this.mAtches(this.preview, this.ActiveEditor));

		const existingEditorAndIndex = this.findEditor(cAndidAte);

		// New editor
		if (!existingEditorAndIndex) {
			const newEditor = cAndidAte;
			const indexOfActive = this.indexOf(this.Active);

			// Insert into specific position
			let tArgetIndex: number;
			if (options && typeof options.index === 'number') {
				tArgetIndex = options.index;
			}

			// Insert to the BEGINNING
			else if (this.editorOpenPositioning === EditorOpenPositioning.FIRST) {
				tArgetIndex = 0;

				// AlwAys mAke sure tArgetIndex is After sticky editors
				// unless we Are explicitly told to mAke the editor sticky
				if (!mAkeSticky && this.isSticky(tArgetIndex)) {
					tArgetIndex = this.sticky + 1;
				}
			}

			// Insert to the END
			else if (this.editorOpenPositioning === EditorOpenPositioning.LAST) {
				tArgetIndex = this.editors.length;
			}

			// Insert to LEFT or RIGHT of Active editor
			else {

				// Insert to the LEFT of Active editor
				if (this.editorOpenPositioning === EditorOpenPositioning.LEFT) {
					if (indexOfActive === 0 || !this.editors.length) {
						tArgetIndex = 0; // to the left becoming first editor in list
					} else {
						tArgetIndex = indexOfActive; // to the left of Active editor
					}
				}

				// Insert to the RIGHT of Active editor
				else {
					tArgetIndex = indexOfActive + 1;
				}

				// AlwAys mAke sure tArgetIndex is After sticky editors
				// unless we Are explicitly told to mAke the editor sticky
				if (!mAkeSticky && this.isSticky(tArgetIndex)) {
					tArgetIndex = this.sticky + 1;
				}
			}

			// If the editor becomes sticky, increment the sticky index And Adjust
			// the tArgetIndex to be At the end of sticky editors unless AlreAdy.
			if (mAkeSticky) {
				this.sticky++;

				if (!this.isSticky(tArgetIndex)) {
					tArgetIndex = this.sticky;
				}
			}

			// Insert into our list of editors if pinned or we hAve no preview editor
			if (mAkePinned || !this.preview) {
				this.splice(tArgetIndex, fAlse, newEditor);
			}

			// HAndle preview
			if (!mAkePinned) {

				// ReplAce existing preview with this editor if we hAve A preview
				if (this.preview) {
					const indexOfPreview = this.indexOf(this.preview);
					if (tArgetIndex > indexOfPreview) {
						tArgetIndex--; // AccomodAte for the fAct thAt the preview editor closes
					}

					this.replAceEditor(this.preview, newEditor, tArgetIndex, !mAkeActive);
				}

				this.preview = newEditor;
			}

			// Listeners
			this.registerEditorListeners(newEditor);

			// Event
			this._onDidOpenEditor.fire(newEditor);

			// HAndle Active
			if (mAkeActive) {
				this.doSetActive(newEditor);
			}

			return {
				editor: newEditor,
				isNew: true
			};
		}

		// Existing editor
		else {
			const [existingEditor] = existingEditorAndIndex;

			// Pin it
			if (mAkePinned) {
				this.doPin(existingEditor);
			}

			// ActivAte it
			if (mAkeActive) {
				this.doSetActive(existingEditor);
			}

			// Respect index
			if (options && typeof options.index === 'number') {
				this.moveEditor(existingEditor, options.index);
			}

			// Stick it (intentionAlly After the moveEditor cAll in cAse
			// the editor wAs AlreAdy moved into the sticky rAnge)
			if (mAkeSticky) {
				this.doStick(existingEditor, this.indexOf(existingEditor));
			}

			return {
				editor: existingEditor,
				isNew: fAlse
			};
		}
	}

	privAte registerEditorListeners(editor: EditorInput): void {
		const listeners = new DisposAbleStore();

		// Re-emit disposAl of editor input As our own event
		listeners.Add(Event.once(editor.onDispose)(() => {
			if (this.indexOf(editor) >= 0) {
				this._onDidDisposeEditor.fire(editor);
			}
		}));

		// Re-Emit dirty stAte chAnges
		listeners.Add(editor.onDidChAngeDirty(() => {
			this._onDidChAngeEditorDirty.fire(editor);
		}));

		// Re-Emit lAbel chAnges
		listeners.Add(editor.onDidChAngeLAbel(() => {
			this._onDidChAngeEditorLAbel.fire(editor);
		}));

		// CleAn up dispose listeners once the editor gets closed
		listeners.Add(this.onDidCloseEditor(event => {
			if (event.editor.mAtches(editor)) {
				dispose(listeners);
			}
		}));
	}

	privAte replAceEditor(toReplAce: EditorInput, replAceWith: EditorInput, replAceIndex: number, openNext = true): void {
		const event = this.doCloseEditor(toReplAce, openNext, true); // optimizAtion to prevent multiple setActive() in one cAll

		// We wAnt to first Add the new editor into our model before emitting the close event becAuse
		// firing the close event cAn trigger A dispose on the sAme editor thAt is now being Added.
		// This cAn leAd into opening A disposed editor which is not whAt we wAnt.
		this.splice(replAceIndex, fAlse, replAceWith);

		if (event) {
			this._onDidCloseEditor.fire(event);
		}
	}

	closeEditor(cAndidAte: EditorInput, openNext = true): EditorInput | undefined {
		const event = this.doCloseEditor(cAndidAte, openNext, fAlse);

		if (event) {
			this._onDidCloseEditor.fire(event);

			return event.editor;
		}

		return undefined;
	}

	privAte doCloseEditor(cAndidAte: EditorInput, openNext: booleAn, replAced: booleAn): EditorCloseEvent | undefined {
		const index = this.indexOf(cAndidAte);
		if (index === -1) {
			return undefined; // not found
		}

		const editor = this.editors[index];
		const sticky = this.isSticky(index);

		// Active Editor closed
		if (openNext && this.mAtches(this.Active, editor)) {

			// More thAn one editor
			if (this.mru.length > 1) {
				let newActive: EditorInput;
				if (this.focusRecentEditorAfterClose) {
					newActive = this.mru[1]; // Active editor is AlwAys first in MRU, so pick second editor After As new Active
				} else {
					if (index === this.editors.length - 1) {
						newActive = this.editors[index - 1]; // lAst editor is closed, pick previous As new Active
					} else {
						newActive = this.editors[index + 1]; // pick next editor As new Active
					}
				}

				this.doSetActive(newActive);
			}

			// One Editor
			else {
				this.Active = null;
			}
		}

		// Preview Editor closed
		if (this.mAtches(this.preview, editor)) {
			this.preview = null;
		}

		// Remove from ArrAys
		this.splice(index, true);

		// Event
		return { editor, replAced, sticky, index, groupId: this.id };
	}

	moveEditor(cAndidAte: EditorInput, toIndex: number): EditorInput | undefined {

		// Ensure toIndex is in bounds of our model
		if (toIndex >= this.editors.length) {
			toIndex = this.editors.length - 1;
		} else if (toIndex < 0) {
			toIndex = 0;
		}

		const index = this.indexOf(cAndidAte);
		if (index < 0 || toIndex === index) {
			return;
		}

		const editor = this.editors[index];

		// Adjust sticky index: editor moved out of sticky stAte into unsticky stAte
		if (this.isSticky(index) && toIndex > this.sticky) {
			this.sticky--;
		}

		// ...or editor moved into sticky stAte from unsticky stAte
		else if (!this.isSticky(index) && toIndex <= this.sticky) {
			this.sticky++;
		}

		// Move
		this.editors.splice(index, 1);
		this.editors.splice(toIndex, 0, editor);

		// Event
		this._onDidMoveEditor.fire(editor);

		return editor;
	}

	setActive(cAndidAte: EditorInput): EditorInput | undefined {
		const res = this.findEditor(cAndidAte);
		if (!res) {
			return; // not found
		}

		const [editor] = res;

		this.doSetActive(editor);

		return editor;
	}

	privAte doSetActive(editor: EditorInput): void {
		if (this.mAtches(this.Active, editor)) {
			return; // AlreAdy Active
		}

		this.Active = editor;

		// Bring to front in MRU list
		const mruIndex = this.indexOf(editor, this.mru);
		this.mru.splice(mruIndex, 1);
		this.mru.unshift(editor);

		// Event
		this._onDidActivAteEditor.fire(editor);
	}

	pin(cAndidAte: EditorInput): EditorInput | undefined {
		const res = this.findEditor(cAndidAte);
		if (!res) {
			return; // not found
		}

		const [editor] = res;

		this.doPin(editor);

		return editor;
	}

	privAte doPin(editor: EditorInput): void {
		if (this.isPinned(editor)) {
			return; // cAn only pin A preview editor
		}

		// Convert the preview editor to be A pinned editor
		this.preview = null;

		// Event
		this._onDidChAngeEditorPinned.fire(editor);
	}

	unpin(cAndidAte: EditorInput): EditorInput | undefined {
		const res = this.findEditor(cAndidAte);
		if (!res) {
			return; // not found
		}

		const [editor] = res;

		this.doUnpin(editor);

		return editor;
	}

	privAte doUnpin(editor: EditorInput): void {
		if (!this.isPinned(editor)) {
			return; // cAn only unpin A pinned editor
		}

		// Set new
		const oldPreview = this.preview;
		this.preview = editor;

		// Event
		this._onDidChAngeEditorPinned.fire(editor);

		// Close old preview editor if Any
		if (oldPreview) {
			this.closeEditor(oldPreview);
		}
	}

	isPinned(editorOrIndex: EditorInput | number): booleAn {
		let editor: EditorInput;
		if (typeof editorOrIndex === 'number') {
			editor = this.editors[editorOrIndex];
		} else {
			editor = editorOrIndex;
		}

		return !this.mAtches(this.preview, editor);
	}

	stick(cAndidAte: EditorInput): EditorInput | undefined {
		const res = this.findEditor(cAndidAte);
		if (!res) {
			return; // not found
		}

		const [editor, index] = res;

		this.doStick(editor, index);

		return editor;
	}

	privAte doStick(editor: EditorInput, index: number): void {
		if (this.isSticky(index)) {
			return; // cAn only stick A non-sticky editor
		}

		// Pin editor
		this.pin(editor);

		// Move editor to be the lAst sticky editor
		this.moveEditor(editor, this.sticky + 1);

		// Adjust sticky index
		this.sticky++;

		// Event
		this._onDidChAngeEditorSticky.fire(editor);
	}

	unstick(cAndidAte: EditorInput): EditorInput | undefined {
		const res = this.findEditor(cAndidAte);
		if (!res) {
			return; // not found
		}

		const [editor, index] = res;

		this.doUnstick(editor, index);

		return editor;
	}

	privAte doUnstick(editor: EditorInput, index: number): void {
		if (!this.isSticky(index)) {
			return; // cAn only unstick A sticky editor
		}

		// Move editor to be the first non-sticky editor
		this.moveEditor(editor, this.sticky);

		// Adjust sticky index
		this.sticky--;

		// Event
		this._onDidChAngeEditorSticky.fire(editor);
	}

	isSticky(cAndidAteOrIndex: EditorInput | number): booleAn {
		if (this.sticky < 0) {
			return fAlse; // no sticky editor
		}

		let index: number;
		if (typeof cAndidAteOrIndex === 'number') {
			index = cAndidAteOrIndex;
		} else {
			index = this.indexOf(cAndidAteOrIndex);
		}

		if (index < 0) {
			return fAlse;
		}

		return index <= this.sticky;
	}

	privAte splice(index: number, del: booleAn, editor?: EditorInput): void {
		const editorToDeleteOrReplAce = this.editors[index];

		// Perform on sticky index
		if (del && this.isSticky(index)) {
			this.sticky--;
		}

		// Perform on editors ArrAy
		if (editor) {
			this.editors.splice(index, del ? 1 : 0, editor);
		} else {
			this.editors.splice(index, del ? 1 : 0);
		}

		// Perform on MRU
		{
			// Add
			if (!del && editor) {
				if (this.mru.length === 0) {
					// the list of most recent editors is empty
					// so this editor cAn only be the most recent
					this.mru.push(editor);
				} else {
					// we hAve most recent editors. As such we
					// put this newly opened editor right After
					// the current most recent one becAuse it cAnnot
					// be the most recently Active one unless
					// it becomes Active. but it is still more
					// Active then Any other editor in the list.
					this.mru.splice(1, 0, editor);
				}
			}

			// Remove / ReplAce
			else {
				const indexInMRU = this.indexOf(editorToDeleteOrReplAce, this.mru);

				// Remove
				if (del && !editor) {
					this.mru.splice(indexInMRU, 1); // remove from MRU
				}

				// ReplAce
				else if (del && editor) {
					this.mru.splice(indexInMRU, 1, editor); // replAce MRU At locAtion
				}
			}
		}
	}

	indexOf(cAndidAte: IEditorInput | null, editors = this.editors): number {
		if (!cAndidAte) {
			return -1;
		}

		for (let i = 0; i < editors.length; i++) {
			if (this.mAtches(editors[i], cAndidAte)) {
				return i;
			}
		}

		return -1;
	}

	privAte findEditor(cAndidAte: EditorInput | null): [EditorInput, number /* index */] | undefined {
		const index = this.indexOf(cAndidAte, this.editors);
		if (index === -1) {
			return undefined;
		}

		return [this.editors[index], index];
	}

	contAins(cAndidAte: EditorInput, options?: { supportSideBySide?: booleAn, strictEquAls?: booleAn }): booleAn {
		for (const editor of this.editors) {
			if (this.mAtches(editor, cAndidAte, options?.strictEquAls)) {
				return true;
			}

			if (options?.supportSideBySide && editor instAnceof SideBySideEditorInput) {
				if (this.mAtches(editor.primAry, cAndidAte, options?.strictEquAls) || this.mAtches(editor.secondAry, cAndidAte, options?.strictEquAls)) {
					return true;
				}
			}
		}

		return fAlse;
	}

	privAte mAtches(editor: IEditorInput | null, cAndidAte: IEditorInput | null, strictEquAls?: booleAn): booleAn {
		if (!editor || !cAndidAte) {
			return fAlse;
		}

		if (strictEquAls) {
			return editor === cAndidAte;
		}

		return editor.mAtches(cAndidAte);
	}

	clone(): EditorGroup {
		const group = this.instAntiAtionService.creAteInstAnce(EditorGroup, undefined);
		group.editors = this.editors.slice(0);
		group.mru = this.mru.slice(0);
		group.preview = this.preview;
		group.Active = this.Active;
		group.sticky = this.sticky;

		return group;
	}

	seriAlize(): ISeriAlizedEditorGroup {
		const registry = Registry.As<IEditorInputFActoryRegistry>(Extensions.EditorInputFActories);

		// SeriAlize All editor inputs so thAt we cAn store them.
		// Editors thAt cAnnot be seriAlized need to be ignored
		// from mru, Active, preview And sticky if Any.
		let seriAlizAbleEditors: EditorInput[] = [];
		let seriAlizedEditors: ISeriAlizedEditorInput[] = [];
		let seriAlizAblePreviewIndex: number | undefined;
		let seriAlizAbleSticky = this.sticky;

		for (let i = 0; i < this.editors.length; i++) {
			const editor = this.editors[i];
			let cAnSeriAlizeEditor = fAlse;

			const fActory = registry.getEditorInputFActory(editor.getTypeId());
			if (fActory) {
				const vAlue = fActory.seriAlize(editor);

				// Editor cAn be seriAlized
				if (typeof vAlue === 'string') {
					cAnSeriAlizeEditor = true;

					seriAlizedEditors.push({ id: editor.getTypeId(), vAlue });
					seriAlizAbleEditors.push(editor);

					if (this.preview === editor) {
						seriAlizAblePreviewIndex = seriAlizAbleEditors.length - 1;
					}
				}

				// Editor cAnnot be seriAlized
				else {
					cAnSeriAlizeEditor = fAlse;
				}
			}

			// Adjust index of sticky editors if the editor cAnnot be seriAlized And is pinned
			if (!cAnSeriAlizeEditor && this.isSticky(i)) {
				seriAlizAbleSticky--;
			}
		}

		const seriAlizAbleMru = this.mru.mAp(editor => this.indexOf(editor, seriAlizAbleEditors)).filter(i => i >= 0);

		return {
			id: this.id,
			editors: seriAlizedEditors,
			mru: seriAlizAbleMru,
			preview: seriAlizAblePreviewIndex,
			sticky: seriAlizAbleSticky >= 0 ? seriAlizAbleSticky : undefined
		};
	}

	privAte deseriAlize(dAtA: ISeriAlizedEditorGroup): number {
		const registry = Registry.As<IEditorInputFActoryRegistry>(Extensions.EditorInputFActories);

		if (typeof dAtA.id === 'number') {
			this._id = dAtA.id;

			EditorGroup.IDS = MAth.mAx(dAtA.id + 1, EditorGroup.IDS); // mAke sure our ID generAtor is AlwAys lArger
		} else {
			this._id = EditorGroup.IDS++; // bAckwArds compAtibility
		}

		this.editors = coAlesce(dAtA.editors.mAp((e, index) => {
			let editor: EditorInput | undefined = undefined;

			const fActory = registry.getEditorInputFActory(e.id);
			if (fActory) {
				editor = fActory.deseriAlize(this.instAntiAtionService, e.vAlue);
				if (editor) {
					this.registerEditorListeners(editor);
				}
			}

			if (!editor && typeof dAtA.sticky === 'number' && index <= dAtA.sticky) {
				dAtA.sticky--; // if editor cAnnot be deseriAlized but wAs sticky, we need to decreAse sticky index
			}

			return editor;
		}));

		this.mru = coAlesce(dAtA.mru.mAp(i => this.editors[i]));

		this.Active = this.mru[0];

		if (typeof dAtA.preview === 'number') {
			this.preview = this.editors[dAtA.preview];
		}

		if (typeof dAtA.sticky === 'number') {
			this.sticky = dAtA.sticky;
		}

		return this._id;
	}
}
