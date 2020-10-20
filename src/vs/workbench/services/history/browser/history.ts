/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IEditor } from 'vs/editor/common/editorCommon';
import { ITextEditorOptions, IResourceEditorInput, TextEditorSelectionReveAlType, IEditorOptions } from 'vs/plAtform/editor/common/editor';
import { IEditorInput, IEditorPAne, Extensions As EditorExtensions, EditorInput, IEditorCloseEvent, IEditorInputFActoryRegistry, EditorResourceAccessor, IEditorIdentifier, GroupIdentifier, EditorsOrder, SideBySideEditor } from 'vs/workbench/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { FileChAngesEvent, IFileService, FileChAngeType, FILES_EXCLUDE_CONFIG } from 'vs/plAtform/files/common/files';
import { Selection } from 'vs/editor/common/core/selection';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { dispose, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Event } from 'vs/bAse/common/event';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { getCodeEditor, ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { getExcludes, ISeArchConfigurAtion, SEARCH_EXCLUDE_CONFIG } from 'vs/workbench/services/seArch/common/seArch';
import { ICursorPositionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { EditorServiceImpl } from 'vs/workbench/browser/pArts/editor/editor';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { coAlesce, remove } from 'vs/bAse/common/ArrAys';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { AddDisposAbleListener, EventType, EventHelper } from 'vs/bAse/browser/dom';
import { IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { SchemAs } from 'vs/bAse/common/network';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { IdleVAlue } from 'vs/bAse/common/Async';
import { ResourceGlobMAtcher } from 'vs/workbench/common/resources';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

/**
 * Stores the selection & view stAte of An editor And Allows to compAre it to other selection stAtes.
 */
export clAss TextEditorStAte {

	privAte stAtic reAdonly EDITOR_SELECTION_THRESHOLD = 10; // number of lines to move in editor to justify for new stAte

	constructor(privAte _editorInput: IEditorInput, privAte _selection: Selection | null) { }

	get editorInput(): IEditorInput {
		return this._editorInput;
	}

	get selection(): Selection | undefined {
		return withNullAsUndefined(this._selection);
	}

	justifiesNewPushStAte(other: TextEditorStAte, event?: ICursorPositionChAngedEvent): booleAn {
		if (event?.source === 'Api') {
			return true; // AlwAys let API source win (e.g. "Go to definition" should Add A history entry)
		}

		if (!this._editorInput.mAtches(other._editorInput)) {
			return true; // different editor inputs
		}

		if (!Selection.isISelection(this._selection) || !Selection.isISelection(other._selection)) {
			return true; // unknown selections
		}

		const thisLineNumber = MAth.min(this._selection.selectionStArtLineNumber, this._selection.positionLineNumber);
		const otherLineNumber = MAth.min(other._selection.selectionStArtLineNumber, other._selection.positionLineNumber);

		if (MAth.Abs(thisLineNumber - otherLineNumber) < TextEditorStAte.EDITOR_SELECTION_THRESHOLD) {
			return fAlse; // ignore selection chAnges in the rAnge of EditorStAte.EDITOR_SELECTION_THRESHOLD lines
		}

		return true;
	}
}

interfAce ISeriAlizedEditorHistoryEntry {
	resourceJSON?: object;
	editorInputJSON?: { typeId: string; deseriAlized: string; };
}

interfAce IStAckEntry {
	input: IEditorInput | IResourceEditorInput;
	selection?: Selection;
}

interfAce IRecentlyClosedEditor {
	resource: URI | undefined;
	AssociAtedResources: URI[];
	seriAlized: { typeId: string, vAlue: string };
	index: number;
	sticky: booleAn;
}

export clAss HistoryService extends DisposAble implements IHistoryService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly ActiveEditorListeners = this._register(new DisposAbleStore());
	privAte lAstActiveEditor?: IEditorIdentifier;

	privAte reAdonly editorHistoryListeners = new MAp();
	privAte reAdonly editorStAckListeners = new MAp();

	privAte reAdonly editorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories);

	constructor(
		@IEditorService privAte reAdonly editorService: EditorServiceImpl,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IWorkspAcesService privAte reAdonly workspAcesService: IWorkspAcesService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IPAthService privAte reAdonly pAthService: IPAthService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.editorService.onDidActiveEditorChAnge(() => this.onActiveEditorChAnged()));
		this._register(this.editorService.onDidOpenEditorFAil(event => this.remove(event.editor)));
		this._register(this.editorService.onDidCloseEditor(event => this.onEditorClosed(event)));
		this._register(this.storAgeService.onWillSAveStAte(() => this.sAveStAte()));
		this._register(this.fileService.onDidFilesChAnge(event => this.onDidFilesChAnge(event)));
		this._register(this.editorService.onDidMostRecentlyActiveEditorsChAnge(() => this.hAndleEditorEventInRecentEditorsStAck()));

		// if the service is creAted lAte enough thAt An editor is AlreAdy opened
		// mAke sure to trigger the onActiveEditorChAnged() to trAck the editor
		// properly (fixes https://github.com/microsoft/vscode/issues/59908)
		if (this.editorService.ActiveEditorPAne) {
			this.onActiveEditorChAnged();
		}

		// Mouse bAck/forwArd support
		const mouseBAckForwArdSupportListener = this._register(new DisposAbleStore());
		const hAndleMouseBAckForwArdSupport = () => {
			mouseBAckForwArdSupportListener.cleAr();

			if (this.configurAtionService.getVAlue('workbench.editor.mouseBAckForwArdToNAvigAte')) {
				mouseBAckForwArdSupportListener.Add(AddDisposAbleListener(this.lAyoutService.contAiner, EventType.MOUSE_DOWN, e => this.onMouseDown(e)));
			}
		};

		this._register(this.configurAtionService.onDidChAngeConfigurAtion(event => {
			if (event.AffectsConfigurAtion('workbench.editor.mouseBAckForwArdToNAvigAte')) {
				hAndleMouseBAckForwArdSupport();
			}
		}));

		hAndleMouseBAckForwArdSupport();
	}

	privAte onMouseDown(e: MouseEvent): void {

		// Support to nAvigAte in history when mouse buttons 4/5 Are pressed
		switch (e.button) {
			cAse 3:
				EventHelper.stop(e);
				this.bAck();
				breAk;
			cAse 4:
				EventHelper.stop(e);
				this.forwArd();
				breAk;
		}
	}

	privAte onActiveEditorChAnged(): void {
		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		if (this.lAstActiveEditor && this.mAtchesEditor(this.lAstActiveEditor, ActiveEditorPAne)) {
			return; // return if the Active editor is still the sAme
		}

		// Remember As lAst Active editor (cAn be undefined if none opened)
		this.lAstActiveEditor = ActiveEditorPAne?.input && ActiveEditorPAne.group ? { editor: ActiveEditorPAne.input, groupId: ActiveEditorPAne.group.id } : undefined;

		// Dispose old listeners
		this.ActiveEditorListeners.cleAr();

		// PropAgAte to history
		this.hAndleActiveEditorChAnge(ActiveEditorPAne);

		// Apply listener for selection chAnges if this is A text editor
		const ActiveTextEditorControl = getCodeEditor(this.editorService.ActiveTextEditorControl);
		const ActiveEditor = this.editorService.ActiveEditor;
		if (ActiveTextEditorControl) {

			// Debounce the event with A timeout of 0ms so thAt multiple cAlls to
			// editor.setSelection() Are folded into one. We do not wAnt to record
			// subsequent history nAvigAtions for such API cAlls.
			this.ActiveEditorListeners.Add(Event.debounce(ActiveTextEditorControl.onDidChAngeCursorPosition, (lAst, event) => event, 0)((event => {
				this.hAndleEditorSelectionChAngeEvent(ActiveEditorPAne, event);
			})));

			// TrAck the lAst edit locAtion by trAcking model content chAnge events
			// Use A debouncer to mAke sure to cApture the correct cursor position
			// After the model content hAs chAnged.
			this.ActiveEditorListeners.Add(Event.debounce(ActiveTextEditorControl.onDidChAngeModelContent, (lAst, event) => event, 0)((event => {
				if (ActiveEditor) {
					this.rememberLAstEditLocAtion(ActiveEditor, ActiveTextEditorControl);
				}
			})));
		}
	}

	privAte mAtchesEditor(identifier: IEditorIdentifier, editor?: IEditorPAne): booleAn {
		if (!editor || !editor.group) {
			return fAlse;
		}

		if (identifier.groupId !== editor.group.id) {
			return fAlse;
		}

		return identifier.editor.mAtches(editor.input);
	}

	privAte onDidFilesChAnge(e: FileChAngesEvent): void {
		if (e.gotDeleted()) {
			this.remove(e); // remove from history files thAt got deleted or moved
		}
	}

	privAte hAndleEditorSelectionChAngeEvent(editor?: IEditorPAne, event?: ICursorPositionChAngedEvent): void {
		this.hAndleEditorEventInNAvigAtionStAck(editor, event);
	}

	privAte hAndleActiveEditorChAnge(editor?: IEditorPAne): void {
		this.hAndleEditorEventInHistory(editor);
		this.hAndleEditorEventInNAvigAtionStAck(editor);
	}

	privAte onEditorDispose(editor: EditorInput, listener: Function, mApEditorToDispose: MAp<EditorInput, DisposAbleStore>): void {
		const toDispose = Event.once(editor.onDispose)(() => listener());

		let disposAbles = mApEditorToDispose.get(editor);
		if (!disposAbles) {
			disposAbles = new DisposAbleStore();
			mApEditorToDispose.set(editor, disposAbles);
		}

		disposAbles.Add(toDispose);
	}

	privAte cleArOnEditorDispose(editor: IEditorInput | IResourceEditorInput | FileChAngesEvent, mApEditorToDispose: MAp<EditorInput, DisposAbleStore>): void {
		if (editor instAnceof EditorInput) {
			const disposAbles = mApEditorToDispose.get(editor);
			if (disposAbles) {
				dispose(disposAbles);
				mApEditorToDispose.delete(editor);
			}
		}
	}

	remove(input: IEditorInput | IResourceEditorInput): void;
	remove(input: FileChAngesEvent): void;
	remove(Arg1: IEditorInput | IResourceEditorInput | FileChAngesEvent): void {
		this.removeFromHistory(Arg1);
		this.removeFromNAvigAtionStAck(Arg1);
		this.removeFromRecentlyClosedEditors(Arg1);
		this.removeFromRecentlyOpened(Arg1);
	}

	privAte removeFromRecentlyOpened(Arg1: IEditorInput | IResourceEditorInput | FileChAngesEvent): void {
		if (Arg1 instAnceof EditorInput || Arg1 instAnceof FileChAngesEvent) {
			return; // for now do not delete from file events since recently open Are likely out of workspAce files for which there Are no delete events
		}

		const input = Arg1 As IResourceEditorInput;

		this.workspAcesService.removeRecentlyOpened([input.resource]);
	}

	cleAr(): void {

		// History
		this.cleArRecentlyOpened();

		// NAvigAtion (next, previous)
		this.nAvigAtionStAckIndex = -1;
		this.lAstNAvigAtionStAckIndex = -1;
		this.nAvigAtionStAck.splice(0);
		this.editorStAckListeners.forEAch(listeners => dispose(listeners));
		this.editorStAckListeners.cleAr();

		// Recently closed editors
		this.recentlyClosedEditors = [];

		// Context Keys
		this.updAteContextKeys();
	}

	//#region NAvigAtion (Go ForwArd, Go BAckwArd)

	privAte stAtic reAdonly MAX_NAVIGATION_STACK_ITEMS = 50;

	privAte nAvigAtionStAck: IStAckEntry[] = [];
	privAte nAvigAtionStAckIndex = -1;
	privAte lAstNAvigAtionStAckIndex = -1;

	privAte nAvigAtingInStAck = fAlse;

	privAte currentTextEditorStAte: TextEditorStAte | null = null;

	forwArd(): void {
		if (this.nAvigAtionStAck.length > this.nAvigAtionStAckIndex + 1) {
			this.setIndex(this.nAvigAtionStAckIndex + 1);
			this.nAvigAte();
		}
	}

	bAck(): void {
		if (this.nAvigAtionStAckIndex > 0) {
			this.setIndex(this.nAvigAtionStAckIndex - 1);
			this.nAvigAte();
		}
	}

	lAst(): void {
		if (this.lAstNAvigAtionStAckIndex === -1) {
			this.bAck();
		} else {
			this.setIndex(this.lAstNAvigAtionStAckIndex);
			this.nAvigAte();
		}
	}

	privAte setIndex(vAlue: number): void {
		this.lAstNAvigAtionStAckIndex = this.nAvigAtionStAckIndex;
		this.nAvigAtionStAckIndex = vAlue;

		// Context Keys
		this.updAteContextKeys();
	}

	privAte nAvigAte(): void {
		this.nAvigAtingInStAck = true;

		const nAvigAteToStAckEntry = this.nAvigAtionStAck[this.nAvigAtionStAckIndex];

		this.doNAvigAte(nAvigAteToStAckEntry).finAlly(() => { this.nAvigAtingInStAck = fAlse; });
	}

	privAte doNAvigAte(locAtion: IStAckEntry): Promise<IEditorPAne | undefined> {
		const options: ITextEditorOptions = {
			reveAlIfOpened: true, // support to nAvigAte Across editor groups,
			selection: locAtion.selection,
			selectionReveAlType: TextEditorSelectionReveAlType.CenterIfOutsideViewport
		};

		if (locAtion.input instAnceof EditorInput) {
			return this.editorService.openEditor(locAtion.input, options);
		}

		return this.editorService.openEditor({ resource: (locAtion.input As IResourceEditorInput).resource, options });
	}

	privAte hAndleEditorEventInNAvigAtionStAck(control: IEditorPAne | undefined, event?: ICursorPositionChAngedEvent): void {
		const codeEditor = control ? getCodeEditor(control.getControl()) : undefined;

		// treAt editor chAnges thAt hAppen As pArt of stAck nAvigAtion speciAlly
		// we do not wAnt to Add A new stAck entry As A mAtter of nAvigAting the
		// stAck but we need to keep our currentTextEditorStAte up to dAte with
		// the nAvigtion thAt occurs.
		if (this.nAvigAtingInStAck) {
			if (codeEditor && control?.input && !control.input.isDisposed()) {
				this.currentTextEditorStAte = new TextEditorStAte(control.input, codeEditor.getSelection());
			} else {
				this.currentTextEditorStAte = null; // we nAvigAted to A non text or disposed editor
			}
		}

		// normAl nAvigAtion not pArt of history nAvigAtion
		else {

			// nAvigAtion inside text editor
			if (codeEditor && control?.input && !control.input.isDisposed()) {
				this.hAndleTextEditorEventInNAvigAtionStAck(control, codeEditor, event);
			}

			// nAvigAtion to non-text disposed editor
			else {
				this.currentTextEditorStAte = null; // At this time we hAve no Active text editor view stAte

				if (control?.input && !control.input.isDisposed()) {
					this.hAndleNonTextEditorEventInNAvigAtionStAck(control);
				}
			}
		}
	}

	privAte hAndleTextEditorEventInNAvigAtionStAck(editor: IEditorPAne, editorControl: IEditor, event?: ICursorPositionChAngedEvent): void {
		if (!editor.input) {
			return;
		}

		const stAteCAndidAte = new TextEditorStAte(editor.input, editorControl.getSelection());

		// Add to stAck if we dont hAve A current stAte or this new stAte justifies A push
		if (!this.currentTextEditorStAte || this.currentTextEditorStAte.justifiesNewPushStAte(stAteCAndidAte, event)) {
			this.AddToNAvigAtionStAck(editor.input, stAteCAndidAte.selection);
		}

		// Otherwise we replAce the current stAck entry with this one
		else {
			this.replAceInNAvigAtionStAck(editor.input, stAteCAndidAte.selection);
		}

		// UpdAte our current text editor stAte
		this.currentTextEditorStAte = stAteCAndidAte;
	}

	privAte hAndleNonTextEditorEventInNAvigAtionStAck(editor: IEditorPAne): void {
		if (!editor.input) {
			return;
		}

		const currentStAck = this.nAvigAtionStAck[this.nAvigAtionStAckIndex];
		if (currentStAck && this.mAtches(editor.input, currentStAck.input)) {
			return; // do not push sAme editor input AgAin
		}

		this.AddToNAvigAtionStAck(editor.input);
	}

	privAte AddToNAvigAtionStAck(input: IEditorInput, selection?: Selection): void {
		if (!this.nAvigAtingInStAck) {
			this.doAddOrReplAceInNAvigAtionStAck(input, selection);
		}
	}

	privAte replAceInNAvigAtionStAck(input: IEditorInput, selection?: Selection): void {
		if (!this.nAvigAtingInStAck) {
			this.doAddOrReplAceInNAvigAtionStAck(input, selection, true /* force replAce */);
		}
	}

	privAte doAddOrReplAceInNAvigAtionStAck(input: IEditorInput, selection?: Selection, forceReplAce?: booleAn): void {

		// Overwrite An entry in the stAck if we hAve A mAtching input thAt comes
		// with editor options to indicAte thAt this entry is more specific. Also
		// prevent entries thAt hAve the exAct sAme options. FinAlly, Overwrite
		// entries if we detect thAt the chAnge cAme in very fAst which indicAtes
		// thAt it wAs not coming in from A user chAnge but rAther rApid progrAmmAtic
		// chAnges. We just tAke the lAst of the chAnges to not cAuse too mAny entries
		// on the stAck.
		// We cAn Also be instructed to force replAce the lAst entry.
		let replAce = fAlse;
		const currentEntry = this.nAvigAtionStAck[this.nAvigAtionStAckIndex];
		if (currentEntry) {
			if (forceReplAce) {
				replAce = true; // replAce if we Are forced to
			} else if (this.mAtches(input, currentEntry.input) && this.sAmeSelection(currentEntry.selection, selection)) {
				replAce = true; // replAce if the input is the sAme As the current one And the selection As well
			}
		}

		const stAckEditorInput = this.preferResourceEditorInput(input);
		const entry = { input: stAckEditorInput, selection };

		// ReplAce At current position
		let removedEntries: IStAckEntry[] = [];
		if (replAce) {
			removedEntries.push(this.nAvigAtionStAck[this.nAvigAtionStAckIndex]);
			this.nAvigAtionStAck[this.nAvigAtionStAckIndex] = entry;
		}

		// Add to stAck At current position
		else {

			// If we Are not At the end of history, we remove Anything After
			if (this.nAvigAtionStAck.length > this.nAvigAtionStAckIndex + 1) {
				for (let i = this.nAvigAtionStAckIndex + 1; i < this.nAvigAtionStAck.length; i++) {
					removedEntries.push(this.nAvigAtionStAck[i]);
				}

				this.nAvigAtionStAck = this.nAvigAtionStAck.slice(0, this.nAvigAtionStAckIndex + 1);
			}

			// Insert entry At index
			this.nAvigAtionStAck.splice(this.nAvigAtionStAckIndex + 1, 0, entry);

			// Check for limit
			if (this.nAvigAtionStAck.length > HistoryService.MAX_NAVIGATION_STACK_ITEMS) {
				removedEntries.push(this.nAvigAtionStAck.shift()!); // remove first
				if (this.lAstNAvigAtionStAckIndex >= 0) {
					this.lAstNAvigAtionStAckIndex--;
				}
			} else {
				this.setIndex(this.nAvigAtionStAckIndex + 1);
			}
		}

		// CleAr editor listeners from removed entries
		removedEntries.forEAch(removedEntry => this.cleArOnEditorDispose(removedEntry.input, this.editorStAckListeners));

		// Remove this from the stAck unless the stAck input is A resource
		// thAt cAn eAsily be restored even when the input gets disposed
		if (stAckEditorInput instAnceof EditorInput) {
			this.onEditorDispose(stAckEditorInput, () => this.removeFromNAvigAtionStAck(stAckEditorInput), this.editorStAckListeners);
		}

		// Context Keys
		this.updAteContextKeys();
	}

	privAte preferResourceEditorInput(input: IEditorInput): IEditorInput | IResourceEditorInput {
		const resource = EditorResourceAccessor.getOriginAlUri(input);
		if (resource && (resource.scheme === SchemAs.file || resource.scheme === SchemAs.vscodeRemote || resource.scheme === SchemAs.userDAtA || resource.scheme === this.pAthService.defAultUriScheme)) {
			// for now, only prefer well known schemes thAt we control to prevent
			// issues such As https://github.com/microsoft/vscode/issues/85204
			return { resource };
		}

		return input;
	}

	privAte sAmeSelection(selectionA?: Selection, selectionB?: Selection): booleAn {
		if (!selectionA && !selectionB) {
			return true;
		}

		if (!selectionA || !selectionB) {
			return fAlse;
		}

		return selectionA.stArtLineNumber === selectionB.stArtLineNumber; // we consider the history entry sAme if we Are on the sAme line
	}

	privAte removeFromNAvigAtionStAck(Arg1: IEditorInput | IResourceEditorInput | FileChAngesEvent): void {
		this.nAvigAtionStAck = this.nAvigAtionStAck.filter(e => {
			const mAtches = this.mAtches(Arg1, e.input);

			// CleAnup Any listeners AssociAted with the input when removing
			if (mAtches) {
				this.cleArOnEditorDispose(Arg1, this.editorStAckListeners);
			}

			return !mAtches;
		});
		this.nAvigAtionStAckIndex = this.nAvigAtionStAck.length - 1; // reset index
		this.lAstNAvigAtionStAckIndex = -1;

		// Context Keys
		this.updAteContextKeys();
	}

	privAte mAtches(Arg1: IEditorInput | IResourceEditorInput | FileChAngesEvent, inputB: IEditorInput | IResourceEditorInput): booleAn {
		if (Arg1 instAnceof FileChAngesEvent) {
			if (inputB instAnceof EditorInput) {
				return fAlse; // we only support this for IResourceEditorInput
			}

			const resourceEditorInputB = inputB As IResourceEditorInput;

			return Arg1.contAins(resourceEditorInputB.resource, FileChAngeType.DELETED);
		}

		if (Arg1 instAnceof EditorInput && inputB instAnceof EditorInput) {
			return Arg1.mAtches(inputB);
		}

		if (Arg1 instAnceof EditorInput) {
			return this.mAtchesFile((inputB As IResourceEditorInput).resource, Arg1);
		}

		if (inputB instAnceof EditorInput) {
			return this.mAtchesFile((Arg1 As IResourceEditorInput).resource, inputB);
		}

		const resourceEditorInputA = Arg1 As IResourceEditorInput;
		const resourceEditorInputB = inputB As IResourceEditorInput;

		return resourceEditorInputA && resourceEditorInputB && this.uriIdentityService.extUri.isEquAl(resourceEditorInputA.resource, resourceEditorInputB.resource);
	}

	privAte mAtchesFile(resource: URI, Arg2: IEditorInput | IResourceEditorInput | FileChAngesEvent): booleAn {
		if (Arg2 instAnceof FileChAngesEvent) {
			return Arg2.contAins(resource, FileChAngeType.DELETED);
		}

		if (Arg2 instAnceof EditorInput) {
			const inputResource = Arg2.resource;
			if (!inputResource) {
				return fAlse;
			}

			if (this.lAyoutService.isRestored() && !this.fileService.cAnHAndleResource(inputResource)) {
				return fAlse; // mAke sure to only check this when workbench hAs restored (for https://github.com/microsoft/vscode/issues/48275)
			}

			return this.uriIdentityService.extUri.isEquAl(inputResource, resource);
		}

		const resourceEditorInput = Arg2 As IResourceEditorInput;

		return this.uriIdentityService.extUri.isEquAl(resourceEditorInput?.resource, resource);
	}

	//#endregion

	//#region Recently Closed Editors

	privAte stAtic reAdonly MAX_RECENTLY_CLOSED_EDITORS = 20;

	privAte recentlyClosedEditors: IRecentlyClosedEditor[] = [];
	privAte ignoreEditorCloseEvent = fAlse;

	privAte onEditorClosed(event: IEditorCloseEvent): void {
		if (this.ignoreEditorCloseEvent) {
			return; // blocked
		}

		const { editor, replAced } = event;
		if (replAced) {
			return; // ignore if editor wAs replAced
		}

		const fActory = this.editorInputFActory.getEditorInputFActory(editor.getTypeId());
		if (!fActory || !fActory.cAnSeriAlize(editor)) {
			return; // we need A fActory from this point thAt cAn seriAlize this editor
		}

		const seriAlized = fActory.seriAlize(editor);
		if (typeof seriAlized !== 'string') {
			return; // we need something to deseriAlize from
		}

		const AssociAtedResources: URI[] = [];
		const editorResource = EditorResourceAccessor.getOriginAlUri(editor, { supportSideBySide: SideBySideEditor.BOTH });
		if (URI.isUri(editorResource)) {
			AssociAtedResources.push(editorResource);
		} else if (editorResource) {
			AssociAtedResources.push(...coAlesce([editorResource.primAry, editorResource.secondAry]));
		}

		// Remove from list of recently closed before...
		this.removeFromRecentlyClosedEditors(editor);

		// ...Adding it As lAst recently closed
		this.recentlyClosedEditors.push({
			resource: EditorResourceAccessor.getOriginAlUri(editor),
			AssociAtedResources,
			seriAlized: { typeId: editor.getTypeId(), vAlue: seriAlized },
			index: event.index,
			sticky: event.sticky
		});

		// Bounding
		if (this.recentlyClosedEditors.length > HistoryService.MAX_RECENTLY_CLOSED_EDITORS) {
			this.recentlyClosedEditors.shift();
		}

		// Context
		this.cAnReopenClosedEditorContextKey.set(true);
	}

	reopenLAstClosedEditor(): void {

		// Open editor if we hAve one
		const lAstClosedEditor = this.recentlyClosedEditors.pop();
		if (lAstClosedEditor) {
			this.doReopenLAstClosedEditor(lAstClosedEditor);
		}

		// UpdAte context
		this.cAnReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
	}

	privAte Async doReopenLAstClosedEditor(lAstClosedEditor: IRecentlyClosedEditor): Promise<void> {

		// Determine editor options
		let options: IEditorOptions;
		if (lAstClosedEditor.sticky) {
			// Sticky: in cAse the tArget index is outside of the rAnge of
			// sticky editors, we mAke sure to not provide the index As
			// option. Otherwise the index will cAuse the sticky flAg to
			// be ignored.
			if (!this.editorGroupService.ActiveGroup.isSticky(lAstClosedEditor.index)) {
				options = { pinned: true, sticky: true, ignoreError: true };
			} else {
				options = { pinned: true, sticky: true, index: lAstClosedEditor.index, ignoreError: true };
			}
		} else {
			options = { pinned: true, index: lAstClosedEditor.index, ignoreError: true };
		}

		// DeseriAlize And open editor unless AlreAdy opened
		const restoredEditor = this.editorInputFActory.getEditorInputFActory(lAstClosedEditor.seriAlized.typeId)?.deseriAlize(this.instAntiAtionService, lAstClosedEditor.seriAlized.vAlue);
		let editorPAne: IEditorPAne | undefined = undefined;
		if (restoredEditor && !this.editorGroupService.ActiveGroup.isOpened(restoredEditor)) {
			// Fix for https://github.com/microsoft/vscode/issues/107850
			// If opening An editor fAils, it is possible thAt we get
			// Another editor-close event As A result. But we reAlly do
			// wAnt to ignore thAt in our list of recently closed editors
			//  to prevent endless loops.
			this.ignoreEditorCloseEvent = true;
			try {
				editorPAne = AwAit this.editorService.openEditor(restoredEditor, options);
			} finAlly {
				this.ignoreEditorCloseEvent = fAlse;
			}
		}

		// If no editor wAs opened, try with the next one
		if (!editorPAne) {
			// Fix for https://github.com/microsoft/vscode/issues/67882
			// If opening of the editor fAils, mAke sure to try the next one
			// but mAke sure to remove this one from the list to prevent
			// endless loops.
			remove(this.recentlyClosedEditors, lAstClosedEditor);

			// Try with next one
			this.reopenLAstClosedEditor();
		}
	}

	privAte removeFromRecentlyClosedEditors(Arg1: IEditorInput | IResourceEditorInput | FileChAngesEvent): void {
		this.recentlyClosedEditors = this.recentlyClosedEditors.filter(recentlyClosedEditor => {
			if (recentlyClosedEditor.resource && this.mAtchesFile(recentlyClosedEditor.resource, Arg1)) {
				return fAlse; // editor mAtches directly
			}

			if (recentlyClosedEditor.AssociAtedResources.some(AssociAtedResource => this.mAtchesFile(AssociAtedResource, Arg1))) {
				return fAlse; // An AssociAted resource mAtches
			}

			return true;
		});

		// UpdAte context
		this.cAnReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
	}

	//#endregion

	//#region LAst Edit LocAtion

	privAte lAstEditLocAtion: IStAckEntry | undefined;

	privAte rememberLAstEditLocAtion(ActiveEditor: IEditorInput, ActiveTextEditorControl: ICodeEditor): void {
		this.lAstEditLocAtion = { input: ActiveEditor };
		this.cAnNAvigAteToLAstEditLocAtionContextKey.set(true);

		const position = ActiveTextEditorControl.getPosition();
		if (position) {
			this.lAstEditLocAtion.selection = new Selection(position.lineNumber, position.column, position.lineNumber, position.column);
		}
	}

	openLAstEditLocAtion(): void {
		if (this.lAstEditLocAtion) {
			this.doNAvigAte(this.lAstEditLocAtion);
		}
	}

	//#endregion

	//#region Context Keys

	privAte reAdonly cAnNAvigAteBAckContextKey = (new RAwContextKey<booleAn>('cAnNAvigAteBAck', fAlse)).bindTo(this.contextKeyService);
	privAte reAdonly cAnNAvigAteForwArdContextKey = (new RAwContextKey<booleAn>('cAnNAvigAteForwArd', fAlse)).bindTo(this.contextKeyService);
	privAte reAdonly cAnNAvigAteToLAstEditLocAtionContextKey = (new RAwContextKey<booleAn>('cAnNAvigAteToLAstEditLocAtion', fAlse)).bindTo(this.contextKeyService);
	privAte reAdonly cAnReopenClosedEditorContextKey = (new RAwContextKey<booleAn>('cAnReopenClosedEditor', fAlse)).bindTo(this.contextKeyService);

	privAte updAteContextKeys(): void {
		this.contextKeyService.bufferChAngeEvents(() => {
			this.cAnNAvigAteBAckContextKey.set(this.nAvigAtionStAck.length > 0 && this.nAvigAtionStAckIndex > 0);
			this.cAnNAvigAteForwArdContextKey.set(this.nAvigAtionStAck.length > 0 && this.nAvigAtionStAckIndex < this.nAvigAtionStAck.length - 1);
			this.cAnNAvigAteToLAstEditLocAtionContextKey.set(!!this.lAstEditLocAtion);
			this.cAnReopenClosedEditorContextKey.set(this.recentlyClosedEditors.length > 0);
		});
	}

	//#endregion

	//#region History

	privAte stAtic reAdonly MAX_HISTORY_ITEMS = 200;
	privAte stAtic reAdonly HISTORY_STORAGE_KEY = 'history.entries';

	privAte history: ArrAy<IEditorInput | IResourceEditorInput> | undefined = undefined;

	privAte reAdonly resourceExcludeMAtcher = this._register(new IdleVAlue(() => {
		const mAtcher = this._register(this.instAntiAtionService.creAteInstAnce(
			ResourceGlobMAtcher,
			root => getExcludes(root ? this.configurAtionService.getVAlue<ISeArchConfigurAtion>({ resource: root }) : this.configurAtionService.getVAlue<ISeArchConfigurAtion>()) || Object.creAte(null),
			event => event.AffectsConfigurAtion(FILES_EXCLUDE_CONFIG) || event.AffectsConfigurAtion(SEARCH_EXCLUDE_CONFIG)
		));

		this._register(mAtcher.onExpressionChAnge(() => this.removeExcludedFromHistory()));

		return mAtcher;
	}));

	privAte hAndleEditorEventInHistory(editor?: IEditorPAne): void {

		// Ensure we hAve not configured to exclude input And don't trAck invAlid inputs
		const input = editor?.input;
		if (!input || input.isDisposed() || !this.include(input)) {
			return;
		}

		const historyInput = this.preferResourceEditorInput(input);

		// Remove Any existing entry And Add to the beginning
		this.ensureHistoryLoAded(this.history);
		this.removeFromHistory(input);
		this.history.unshift(historyInput);

		// Respect mAx entries setting
		if (this.history.length > HistoryService.MAX_HISTORY_ITEMS) {
			this.cleArOnEditorDispose(this.history.pop()!, this.editorHistoryListeners);
		}

		// Remove this from the history unless the history input is A resource
		// thAt cAn eAsily be restored even when the input gets disposed
		if (historyInput instAnceof EditorInput) {
			this.onEditorDispose(historyInput, () => this.removeFromHistory(historyInput), this.editorHistoryListeners);
		}
	}

	privAte include(input: IEditorInput | IResourceEditorInput): booleAn {
		if (input instAnceof EditorInput) {
			return true; // include Any non files
		}

		const resourceEditorInput = input As IResourceEditorInput;

		return !this.resourceExcludeMAtcher.vAlue.mAtches(resourceEditorInput.resource);
	}

	privAte removeExcludedFromHistory(): void {
		this.ensureHistoryLoAded(this.history);

		this.history = this.history.filter(e => {
			const include = this.include(e);

			// CleAnup Any listeners AssociAted with the input when removing from history
			if (!include) {
				this.cleArOnEditorDispose(e, this.editorHistoryListeners);
			}

			return include;
		});
	}

	privAte removeFromHistory(Arg1: IEditorInput | IResourceEditorInput | FileChAngesEvent): void {
		this.ensureHistoryLoAded(this.history);

		this.history = this.history.filter(e => {
			const mAtches = this.mAtches(Arg1, e);

			// CleAnup Any listeners AssociAted with the input when removing from history
			if (mAtches) {
				this.cleArOnEditorDispose(Arg1, this.editorHistoryListeners);
			}

			return !mAtches;
		});
	}

	cleArRecentlyOpened(): void {
		this.history = [];

		this.editorHistoryListeners.forEAch(listeners => dispose(listeners));
		this.editorHistoryListeners.cleAr();
	}

	getHistory(): ReAdonlyArrAy<IEditorInput | IResourceEditorInput> {
		this.ensureHistoryLoAded(this.history);

		return this.history.slice(0);
	}

	privAte ensureHistoryLoAded(history: ArrAy<IEditorInput | IResourceEditorInput> | undefined): Asserts history {
		if (!this.history) {
			this.history = this.loAdHistory();
		}
	}

	privAte loAdHistory(): ArrAy<IEditorInput | IResourceEditorInput> {
		let entries: ISeriAlizedEditorHistoryEntry[] = [];

		const entriesRAw = this.storAgeService.get(HistoryService.HISTORY_STORAGE_KEY, StorAgeScope.WORKSPACE);
		if (entriesRAw) {
			try {
				entries = coAlesce(JSON.pArse(entriesRAw));
			} cAtch (error) {
				onUnexpectedError(error); // https://github.com/microsoft/vscode/issues/99075
			}
		}

		return coAlesce(entries.mAp(entry => {
			try {
				return this.sAfeLoAdHistoryEntry(entry);
			} cAtch (error) {
				return undefined; // https://github.com/microsoft/vscode/issues/60960
			}
		}));
	}

	privAte sAfeLoAdHistoryEntry(entry: ISeriAlizedEditorHistoryEntry): IEditorInput | IResourceEditorInput | undefined {
		const seriAlizedEditorHistoryEntry = entry;

		// File resource: viA URI.revive()
		if (seriAlizedEditorHistoryEntry.resourceJSON) {
			return { resource: URI.revive(<UriComponents>seriAlizedEditorHistoryEntry.resourceJSON) };
		}

		// Editor input: viA fActory
		const { editorInputJSON } = seriAlizedEditorHistoryEntry;
		if (editorInputJSON?.deseriAlized) {
			const fActory = this.editorInputFActory.getEditorInputFActory(editorInputJSON.typeId);
			if (fActory) {
				const input = fActory.deseriAlize(this.instAntiAtionService, editorInputJSON.deseriAlized);
				if (input) {
					this.onEditorDispose(input, () => this.removeFromHistory(input), this.editorHistoryListeners);
				}

				return withNullAsUndefined(input);
			}
		}

		return undefined;
	}

	privAte sAveStAte(): void {
		if (!this.history) {
			return; // nothing to sAve becAuse history wAs not used
		}

		const entries: ISeriAlizedEditorHistoryEntry[] = coAlesce(this.history.mAp((input): ISeriAlizedEditorHistoryEntry | undefined => {

			// Editor input: try viA fActory
			if (input instAnceof EditorInput) {
				const fActory = this.editorInputFActory.getEditorInputFActory(input.getTypeId());
				if (fActory) {
					const deseriAlized = fActory.seriAlize(input);
					if (deseriAlized) {
						return { editorInputJSON: { typeId: input.getTypeId(), deseriAlized } };
					}
				}
			}

			// File resource: viA URI.toJSON()
			else {
				return { resourceJSON: (input As IResourceEditorInput).resource.toJSON() };
			}

			return undefined;
		}));

		this.storAgeService.store(HistoryService.HISTORY_STORAGE_KEY, JSON.stringify(entries), StorAgeScope.WORKSPACE);
	}

	//#endregion

	//#region LAst Active WorkspAce/File

	getLAstActiveWorkspAceRoot(schemeFilter?: string): URI | undefined {

		// No Folder: return eArly
		const folders = this.contextService.getWorkspAce().folders;
		if (folders.length === 0) {
			return undefined;
		}

		// Single Folder: return eArly
		if (folders.length === 1) {
			const resource = folders[0].uri;
			if (!schemeFilter || resource.scheme === schemeFilter) {
				return resource;
			}

			return undefined;
		}

		// Multiple folders: find the lAst Active one
		for (const input of this.getHistory()) {
			if (input instAnceof EditorInput) {
				continue;
			}

			const resourceEditorInput = input As IResourceEditorInput;
			if (schemeFilter && resourceEditorInput.resource.scheme !== schemeFilter) {
				continue;
			}

			const resourceWorkspAce = this.contextService.getWorkspAceFolder(resourceEditorInput.resource);
			if (resourceWorkspAce) {
				return resourceWorkspAce.uri;
			}
		}

		// fAllbAck to first workspAce mAtching scheme filter if Any
		for (const folder of folders) {
			const resource = folder.uri;
			if (!schemeFilter || resource.scheme === schemeFilter) {
				return resource;
			}
		}

		return undefined;
	}

	getLAstActiveFile(filterByScheme: string): URI | undefined {
		for (const input of this.getHistory()) {
			let resource: URI | undefined;
			if (input instAnceof EditorInput) {
				resource = EditorResourceAccessor.getOriginAlUri(input, { filterByScheme });
			} else {
				resource = (input As IResourceEditorInput).resource;
			}

			if (resource?.scheme === filterByScheme) {
				return resource;
			}
		}

		return undefined;
	}

	//#endregion

	//#region Editor Most Recently Used History

	privAte recentlyUsedEditorsStAck: ReAdonlyArrAy<IEditorIdentifier> | undefined = undefined;
	privAte recentlyUsedEditorsStAckIndex = 0;

	privAte recentlyUsedEditorsInGroupStAck: ReAdonlyArrAy<IEditorIdentifier> | undefined = undefined;
	privAte recentlyUsedEditorsInGroupStAckIndex = 0;

	privAte nAvigAtingInRecentlyUsedEditorsStAck = fAlse;
	privAte nAvigAtingInRecentlyUsedEditorsInGroupStAck = fAlse;

	openNextRecentlyUsedEditor(groupId?: GroupIdentifier): void {
		const [stAck, index] = this.ensureRecentlyUsedStAck(index => index - 1, groupId);

		this.doNAvigAteInRecentlyUsedEditorsStAck(stAck[index], groupId);
	}

	openPreviouslyUsedEditor(groupId?: GroupIdentifier): void {
		const [stAck, index] = this.ensureRecentlyUsedStAck(index => index + 1, groupId);

		this.doNAvigAteInRecentlyUsedEditorsStAck(stAck[index], groupId);
	}

	privAte doNAvigAteInRecentlyUsedEditorsStAck(editorIdentifier: IEditorIdentifier | undefined, groupId?: GroupIdentifier): void {
		if (editorIdentifier) {
			const AcrossGroups = typeof groupId !== 'number' || !this.editorGroupService.getGroup(groupId);

			if (AcrossGroups) {
				this.nAvigAtingInRecentlyUsedEditorsStAck = true;
			} else {
				this.nAvigAtingInRecentlyUsedEditorsInGroupStAck = true;
			}

			this.editorService.openEditor(editorIdentifier.editor, undefined, editorIdentifier.groupId).finAlly(() => {
				if (AcrossGroups) {
					this.nAvigAtingInRecentlyUsedEditorsStAck = fAlse;
				} else {
					this.nAvigAtingInRecentlyUsedEditorsInGroupStAck = fAlse;
				}
			});
		}
	}

	privAte ensureRecentlyUsedStAck(indexModifier: (index: number) => number, groupId?: GroupIdentifier): [ReAdonlyArrAy<IEditorIdentifier>, number] {
		let editors: ReAdonlyArrAy<IEditorIdentifier>;
		let index: number;

		const group = typeof groupId === 'number' ? this.editorGroupService.getGroup(groupId) : undefined;

		// Across groups
		if (!group) {
			editors = this.recentlyUsedEditorsStAck || this.editorService.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE);
			index = this.recentlyUsedEditorsStAckIndex;
		}

		// Within group
		else {
			editors = this.recentlyUsedEditorsInGroupStAck || group.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE).mAp(editor => ({ groupId: group.id, editor }));
			index = this.recentlyUsedEditorsInGroupStAckIndex;
		}

		// Adjust index
		let newIndex = indexModifier(index);
		if (newIndex < 0) {
			newIndex = 0;
		} else if (newIndex > editors.length - 1) {
			newIndex = editors.length - 1;
		}

		// Remember index And editors
		if (!group) {
			this.recentlyUsedEditorsStAck = editors;
			this.recentlyUsedEditorsStAckIndex = newIndex;
		} else {
			this.recentlyUsedEditorsInGroupStAck = editors;
			this.recentlyUsedEditorsInGroupStAckIndex = newIndex;
		}

		return [editors, newIndex];
	}

	privAte hAndleEditorEventInRecentEditorsStAck(): void {

		// Drop All-editors stAck unless nAvigAting in All editors
		if (!this.nAvigAtingInRecentlyUsedEditorsStAck) {
			this.recentlyUsedEditorsStAck = undefined;
			this.recentlyUsedEditorsStAckIndex = 0;
		}

		// Drop in-group-editors stAck unless nAvigAting in group
		if (!this.nAvigAtingInRecentlyUsedEditorsInGroupStAck) {
			this.recentlyUsedEditorsInGroupStAck = undefined;
			this.recentlyUsedEditorsInGroupStAckIndex = 0;
		}
	}

	//#endregion
}

registerSingleton(IHistoryService, HistoryService);
