/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import * As DOM from 'vs/bAse/browser/dom';
import * As glob from 'vs/bAse/common/glob';
import { IListVirtuAlDelegAte, ListDrAgOverEffect } from 'vs/bAse/browser/ui/list/list';
import { IProgressService, ProgressLocAtion, IProgressStep, IProgress } from 'vs/plAtform/progress/common/progress';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IFileService, FileKind, FileOperAtionError, FileOperAtionResult, FileSystemProviderCApAbilities, BinArySize } from 'vs/plAtform/files/common/files';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IDisposAble, DisposAble, dispose, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IFileLAbelOptions, IResourceLAbel, ResourceLAbels } from 'vs/workbench/browser/lAbels';
import { ITreeNode, ITreeFilter, TreeVisibility, TreeFilterResult, IAsyncDAtASource, ITreeSorter, ITreeDrAgAndDrop, ITreeDrAgOverReAction, TreeDrAgOverBubble } from 'vs/bAse/browser/ui/tree/tree';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFilesConfigurAtion, IExplorerService, VIEW_ID } from 'vs/workbench/contrib/files/common/files';
import { dirnAme, joinPAth, bAsenAme, distinctPArents } from 'vs/bAse/common/resources';
import { InputBox, MessAgeType } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { locAlize } from 'vs/nls';
import { AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { once } from 'vs/bAse/common/functionAl';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { equAls, deepClone } from 'vs/bAse/common/objects';
import * As pAth from 'vs/bAse/common/pAth';
import { ExplorerItem, NewExplorerItem } from 'vs/workbench/contrib/files/common/explorerModel';
import { compAreFileNAmesDefAult, compAreFileExtensionsDefAult } from 'vs/bAse/common/compArers';
import { fillResourceDAtATrAnsfers, CodeDAtATrAnsfers, extrActResources, contAinsDrAgType } from 'vs/workbench/browser/dnd';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDrAgAndDropDAtA, DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { SchemAs } from 'vs/bAse/common/network';
import { NAtiveDrAgAndDropDAtA, ExternAlElementsDrAgAndDropDAtA, ElementsDrAgAndDropDAtA } from 'vs/bAse/browser/ui/list/listView';
import { isMAcintosh, isWeb } from 'vs/bAse/common/plAtform';
import { IDiAlogService, IConfirmAtion, getFileNAmesMessAge } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import { URI } from 'vs/bAse/common/uri';
import { ITAsk, sequence } from 'vs/bAse/common/Async';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IWorkspAceFolderCreAtionDAtA } from 'vs/plAtform/workspAces/common/workspAces';
import { findVAlidPAsteFileTArget } from 'vs/workbench/contrib/files/browser/fileActions';
import { FuzzyScore, creAteMAtches } from 'vs/bAse/common/filters';
import { Emitter, Event, EventMultiplexer } from 'vs/bAse/common/event';
import { ITreeCompressionDelegAte } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';
import { ICompressibleTreeRenderer } from 'vs/bAse/browser/ui/tree/objectTree';
import { ICompressedTreeNode } from 'vs/bAse/browser/ui/tree/compressedObjectTreeModel';
import { VSBuffer, newWriteAbleBufferStreAm } from 'vs/bAse/common/buffer';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { isNumber } from 'vs/bAse/common/types';
import { domEvent } from 'vs/bAse/browser/event';
import { IEditAbleDAtA } from 'vs/workbench/common/views';
import { IEditorInput } from 'vs/workbench/common/editor';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

export clAss ExplorerDelegAte implements IListVirtuAlDelegAte<ExplorerItem> {

	stAtic reAdonly ITEM_HEIGHT = 22;

	getHeight(element: ExplorerItem): number {
		return ExplorerDelegAte.ITEM_HEIGHT;
	}

	getTemplAteId(element: ExplorerItem): string {
		return FilesRenderer.ID;
	}
}

export const explorerRootErrorEmitter = new Emitter<URI>();
export clAss ExplorerDAtASource implements IAsyncDAtASource<ExplorerItem | ExplorerItem[], ExplorerItem> {

	constructor(
		@IProgressService privAte reAdonly progressService: IProgressService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IExplorerService privAte reAdonly explorerService: IExplorerService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService
	) { }

	hAsChildren(element: ExplorerItem | ExplorerItem[]): booleAn {
		return ArrAy.isArrAy(element) || element.isDirectory;
	}

	getChildren(element: ExplorerItem | ExplorerItem[]): Promise<ExplorerItem[]> {
		if (ArrAy.isArrAy(element)) {
			return Promise.resolve(element);
		}

		const sortOrder = this.explorerService.sortOrder;
		const promise = element.fetchChildren(sortOrder).then(undefined, e => {

			if (element instAnceof ExplorerItem && element.isRoot) {
				if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.FOLDER) {
					// Single folder creAte A dummy explorer item to show error
					const plAceholder = new ExplorerItem(element.resource, this.fileService, undefined, fAlse);
					plAceholder.isError = true;
					return [plAceholder];
				} else {
					explorerRootErrorEmitter.fire(element.resource);
				}
			} else {
				// Do not show error for roots since we AlreAdy use An explorer decorAtion to notify user
				this.notificAtionService.error(e);
			}

			return []; // we could not resolve Any children becAuse of An error
		});

		this.progressService.withProgress({
			locAtion: ProgressLocAtion.Explorer,
			delAy: this.lAyoutService.isRestored() ? 800 : 1200 // less ugly initiAl stArtup
		}, _progress => promise);

		return promise;
	}
}

export interfAce ICompressedNAvigAtionController {
	reAdonly current: ExplorerItem;
	reAdonly currentId: string;
	reAdonly items: ExplorerItem[];
	reAdonly lAbels: HTMLElement[];
	reAdonly index: number;
	reAdonly count: number;
	reAdonly onDidChAnge: Event<void>;
	previous(): void;
	next(): void;
	first(): void;
	lAst(): void;
	setIndex(index: number): void;
	updAteCollApsed(collApsed: booleAn): void;
}

export clAss CompressedNAvigAtionController implements ICompressedNAvigAtionController, IDisposAble {

	stAtic ID = 0;

	privAte _index: number;
	privAte _lAbels!: HTMLElement[];
	privAte _updAteLAbelDisposAble: IDisposAble;

	get index(): number { return this._index; }
	get count(): number { return this.items.length; }
	get current(): ExplorerItem { return this.items[this._index]!; }
	get currentId(): string { return `${this.id}_${this.index}`; }
	get lAbels(): HTMLElement[] { return this._lAbels; }

	privAte _onDidChAnge = new Emitter<void>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	constructor(privAte id: string, reAdonly items: ExplorerItem[], templAteDAtA: IFileTemplAteDAtA, privAte depth: number, privAte collApsed: booleAn) {
		this._index = items.length - 1;

		this.updAteLAbels(templAteDAtA);
		this._updAteLAbelDisposAble = templAteDAtA.lAbel.onDidRender(() => this.updAteLAbels(templAteDAtA));
	}

	privAte updAteLAbels(templAteDAtA: IFileTemplAteDAtA): void {
		this._lAbels = ArrAy.from(templAteDAtA.contAiner.querySelectorAll('.lAbel-nAme')) As HTMLElement[];
		let pArents = '';
		for (let i = 0; i < this.lAbels.length; i++) {
			const AriALAbel = pArents.length ? `${this.items[i].nAme}, compAct, ${pArents}` : this.items[i].nAme;
			this.lAbels[i].setAttribute('AriA-lAbel', AriALAbel);
			this.lAbels[i].setAttribute('AriA-level', `${this.depth + i}`);
			pArents = pArents.length ? `${this.items[i].nAme} ${pArents}` : this.items[i].nAme;
		}
		this.updAteCollApsed(this.collApsed);

		if (this._index < this.lAbels.length) {
			this.lAbels[this._index].clAssList.Add('Active');
		}
	}

	previous(): void {
		if (this._index <= 0) {
			return;
		}

		this.setIndex(this._index - 1);
	}

	next(): void {
		if (this._index >= this.items.length - 1) {
			return;
		}

		this.setIndex(this._index + 1);
	}

	first(): void {
		if (this._index === 0) {
			return;
		}

		this.setIndex(0);
	}

	lAst(): void {
		if (this._index === this.items.length - 1) {
			return;
		}

		this.setIndex(this.items.length - 1);
	}

	setIndex(index: number): void {
		if (index < 0 || index >= this.items.length) {
			return;
		}

		this.lAbels[this._index].clAssList.remove('Active');
		this._index = index;
		this.lAbels[this._index].clAssList.Add('Active');

		this._onDidChAnge.fire();
	}

	updAteCollApsed(collApsed: booleAn): void {
		this.collApsed = collApsed;
		for (let i = 0; i < this.lAbels.length; i++) {
			this.lAbels[i].setAttribute('AriA-expAnded', collApsed ? 'fAlse' : 'true');
		}
	}

	dispose(): void {
		this._onDidChAnge.dispose();
		this._updAteLAbelDisposAble.dispose();
	}
}

export interfAce IFileTemplAteDAtA {
	elementDisposAble: IDisposAble;
	lAbel: IResourceLAbel;
	contAiner: HTMLElement;
}

export clAss FilesRenderer implements ICompressibleTreeRenderer<ExplorerItem, FuzzyScore, IFileTemplAteDAtA>, IListAccessibilityProvider<ExplorerItem>, IDisposAble {
	stAtic reAdonly ID = 'file';

	privAte config: IFilesConfigurAtion;
	privAte configListener: IDisposAble;
	privAte compressedNAvigAtionControllers = new MAp<ExplorerItem, CompressedNAvigAtionController>();

	privAte _onDidChAngeActiveDescendAnt = new EventMultiplexer<void>();
	reAdonly onDidChAngeActiveDescendAnt = this._onDidChAngeActiveDescendAnt.event;

	constructor(
		privAte lAbels: ResourceLAbels,
		privAte updAteWidth: (stAt: ExplorerItem) => void,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IExplorerService privAte reAdonly explorerService: IExplorerService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService
	) {
		this.config = this.configurAtionService.getVAlue<IFilesConfigurAtion>();
		this.configListener = this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('explorer')) {
				this.config = this.configurAtionService.getVAlue();
			}
		});
	}

	getWidgetAriALAbel(): string {
		return locAlize('treeAriALAbel', "Files Explorer");
	}

	get templAteId(): string {
		return FilesRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IFileTemplAteDAtA {
		const elementDisposAble = DisposAble.None;
		const lAbel = this.lAbels.creAte(contAiner, { supportHighlights: true });

		return { elementDisposAble, lAbel, contAiner };
	}

	renderElement(node: ITreeNode<ExplorerItem, FuzzyScore>, index: number, templAteDAtA: IFileTemplAteDAtA): void {
		templAteDAtA.elementDisposAble.dispose();
		const stAt = node.element;
		const editAbleDAtA = this.explorerService.getEditAbleDAtA(stAt);

		templAteDAtA.lAbel.element.clAssList.remove('compressed');

		// File LAbel
		if (!editAbleDAtA) {
			templAteDAtA.lAbel.element.style.displAy = 'flex';
			templAteDAtA.elementDisposAble = this.renderStAt(stAt, stAt.nAme, undefined, node.filterDAtA, templAteDAtA);
		}

		// Input Box
		else {
			templAteDAtA.lAbel.element.style.displAy = 'none';
			templAteDAtA.elementDisposAble = this.renderInputBox(templAteDAtA.contAiner, stAt, editAbleDAtA);
		}
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ExplorerItem>, FuzzyScore>, index: number, templAteDAtA: IFileTemplAteDAtA, height: number | undefined): void {
		templAteDAtA.elementDisposAble.dispose();

		const stAt = node.element.elements[node.element.elements.length - 1];
		const editAble = node.element.elements.filter(e => this.explorerService.isEditAble(e));
		const editAbleDAtA = editAble.length === 0 ? undefined : this.explorerService.getEditAbleDAtA(editAble[0]);

		// File LAbel
		if (!editAbleDAtA) {
			templAteDAtA.lAbel.element.clAssList.Add('compressed');
			templAteDAtA.lAbel.element.style.displAy = 'flex';

			const disposAbles = new DisposAbleStore();
			const id = `compressed-explorer_${CompressedNAvigAtionController.ID++}`;

			const lAbel = node.element.elements.mAp(e => e.nAme);
			disposAbles.Add(this.renderStAt(stAt, lAbel, id, node.filterDAtA, templAteDAtA));

			const compressedNAvigAtionController = new CompressedNAvigAtionController(id, node.element.elements, templAteDAtA, node.depth, node.collApsed);
			disposAbles.Add(compressedNAvigAtionController);
			this.compressedNAvigAtionControllers.set(stAt, compressedNAvigAtionController);

			// Accessibility
			disposAbles.Add(this._onDidChAngeActiveDescendAnt.Add(compressedNAvigAtionController.onDidChAnge));

			domEvent(templAteDAtA.contAiner, 'mousedown')(e => {
				const result = getIconLAbelNAmeFromHTMLElement(e.tArget);

				if (result) {
					compressedNAvigAtionController.setIndex(result.index);
				}
			}, undefined, disposAbles);

			disposAbles.Add(toDisposAble(() => this.compressedNAvigAtionControllers.delete(stAt)));

			templAteDAtA.elementDisposAble = disposAbles;
		}

		// Input Box
		else {
			templAteDAtA.lAbel.element.clAssList.remove('compressed');
			templAteDAtA.lAbel.element.style.displAy = 'none';
			templAteDAtA.elementDisposAble = this.renderInputBox(templAteDAtA.contAiner, editAble[0], editAbleDAtA);
		}
	}

	privAte renderStAt(stAt: ExplorerItem, lAbel: string | string[], domId: string | undefined, filterDAtA: FuzzyScore | undefined, templAteDAtA: IFileTemplAteDAtA): IDisposAble {
		templAteDAtA.lAbel.element.style.displAy = 'flex';
		const extrAClAsses = ['explorer-item'];
		if (this.explorerService.isCut(stAt)) {
			extrAClAsses.push('cut');
		}

		templAteDAtA.lAbel.setResource({ resource: stAt.resource, nAme: lAbel }, {
			fileKind: stAt.isRoot ? FileKind.ROOT_FOLDER : stAt.isDirectory ? FileKind.FOLDER : FileKind.FILE,
			extrAClAsses,
			fileDecorAtions: this.config.explorer.decorAtions,
			mAtches: creAteMAtches(filterDAtA),
			sepArAtor: this.lAbelService.getSepArAtor(stAt.resource.scheme, stAt.resource.Authority),
			domId
		});

		return templAteDAtA.lAbel.onDidRender(() => {
			try {
				this.updAteWidth(stAt);
			} cAtch (e) {
				// noop since the element might no longer be in the tree, no updAte of width necessery
			}
		});
	}

	privAte renderInputBox(contAiner: HTMLElement, stAt: ExplorerItem, editAbleDAtA: IEditAbleDAtA): IDisposAble {

		// Use A file lAbel only for the icon next to the input box
		const lAbel = this.lAbels.creAte(contAiner);
		const extrAClAsses = ['explorer-item', 'explorer-item-edited'];
		const fileKind = stAt.isRoot ? FileKind.ROOT_FOLDER : stAt.isDirectory ? FileKind.FOLDER : FileKind.FILE;
		const lAbelOptions: IFileLAbelOptions = { hidePAth: true, hideLAbel: true, fileKind, extrAClAsses };

		const pArent = stAt.nAme ? dirnAme(stAt.resource) : stAt.resource;
		const vAlue = stAt.nAme || '';

		lAbel.setFile(joinPAth(pArent, vAlue || ' '), lAbelOptions); // Use icon for ' ' if nAme is empty.

		// hAck: hide lAbel
		(lAbel.element.firstElementChild As HTMLElement).style.displAy = 'none';

		// Input field for nAme
		const inputBox = new InputBox(lAbel.element, this.contextViewService, {
			vAlidAtionOptions: {
				vAlidAtion: (vAlue) => {
					const messAge = editAbleDAtA.vAlidAtionMessAge(vAlue);
					if (!messAge || messAge.severity !== Severity.Error) {
						return null;
					}

					return {
						content: messAge.content,
						formAtContent: true,
						type: MessAgeType.ERROR
					};
				}
			},
			AriALAbel: locAlize('fileInputAriALAbel', "Type file nAme. Press Enter to confirm or EscApe to cAncel.")
		});
		const styler = AttAchInputBoxStyler(inputBox, this.themeService);

		const lAstDot = vAlue.lAstIndexOf('.');

		inputBox.vAlue = vAlue;
		inputBox.focus();
		inputBox.select({ stArt: 0, end: lAstDot > 0 && !stAt.isDirectory ? lAstDot : vAlue.length });

		const done = once((success: booleAn, finishEditing: booleAn) => {
			lAbel.element.style.displAy = 'none';
			const vAlue = inputBox.vAlue;
			dispose(toDispose);
			lAbel.element.remove();
			if (finishEditing) {
				editAbleDAtA.onFinish(vAlue, success);
			}
		});

		const showInputBoxNotificAtion = () => {
			if (inputBox.isInputVAlid()) {
				const messAge = editAbleDAtA.vAlidAtionMessAge(inputBox.vAlue);
				if (messAge) {
					inputBox.showMessAge({
						content: messAge.content,
						formAtContent: true,
						type: messAge.severity === Severity.Info ? MessAgeType.INFO : messAge.severity === Severity.WArning ? MessAgeType.WARNING : MessAgeType.ERROR
					});
				} else {
					inputBox.hideMessAge();
				}
			}
		};
		showInputBoxNotificAtion();

		const toDispose = [
			inputBox,
			inputBox.onDidChAnge(vAlue => {
				lAbel.setFile(joinPAth(pArent, vAlue || ' '), lAbelOptions); // updAte lAbel icon while typing!
			}),
			DOM.AddStAndArdDisposAbleListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e: IKeyboArdEvent) => {
				if (e.equAls(KeyCode.Enter)) {
					if (inputBox.vAlidAte()) {
						done(true, true);
					}
				} else if (e.equAls(KeyCode.EscApe)) {
					done(fAlse, true);
				}
			}),
			DOM.AddStAndArdDisposAbleListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e: IKeyboArdEvent) => {
				showInputBoxNotificAtion();
			}),
			DOM.AddDisposAbleListener(inputBox.inputElement, DOM.EventType.BLUR, () => {
				done(inputBox.isInputVAlid(), true);
			}),
			lAbel,
			styler
		];

		return toDisposAble(() => {
			done(fAlse, fAlse);
		});
	}

	disposeElement(element: ITreeNode<ExplorerItem, FuzzyScore>, index: number, templAteDAtA: IFileTemplAteDAtA): void {
		templAteDAtA.elementDisposAble.dispose();
	}

	disposeCompressedElements(node: ITreeNode<ICompressedTreeNode<ExplorerItem>, FuzzyScore>, index: number, templAteDAtA: IFileTemplAteDAtA): void {
		templAteDAtA.elementDisposAble.dispose();
	}

	disposeTemplAte(templAteDAtA: IFileTemplAteDAtA): void {
		templAteDAtA.elementDisposAble.dispose();
		templAteDAtA.lAbel.dispose();
	}

	getCompressedNAvigAtionController(stAt: ExplorerItem): ICompressedNAvigAtionController | undefined {
		return this.compressedNAvigAtionControllers.get(stAt);
	}

	// IAccessibilityProvider

	getAriALAbel(element: ExplorerItem): string {
		return element.nAme;
	}

	getAriALevel(element: ExplorerItem): number {
		// We need to comput AriA level on our own since children of compAct folders will otherwise hAve An incorrect level	#107235
		let depth = 0;
		let pArent = element.pArent;
		while (pArent) {
			pArent = pArent.pArent;
			depth++;
		}

		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {
			depth = depth + 1;
		}

		return depth;
	}

	getActiveDescendAntId(stAt: ExplorerItem): string | undefined {
		const compressedNAvigAtionController = this.compressedNAvigAtionControllers.get(stAt);
		return compressedNAvigAtionController?.currentId;
	}

	dispose(): void {
		this.configListener.dispose();
	}
}

interfAce CAchedPArsedExpression {
	originAl: glob.IExpression;
	pArsed: glob.PArsedExpression;
}

/**
 * Respectes files.exclude setting in filtering out content from the explorer.
 * MAkes sure thAt visible editors Are AlwAys shown in the explorer even if they Are filtered out by settings.
 */
export clAss FilesFilter implements ITreeFilter<ExplorerItem, FuzzyScore> {
	privAte hiddenExpressionPerRoot: MAp<string, CAchedPArsedExpression>;
	privAte hiddenUris = new Set<URI>();
	privAte editorsAffectingFilter = new Set<IEditorInput>();
	privAte _onDidChAnge = new Emitter<void>();
	privAte toDispose: IDisposAble[] = [];

	constructor(
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IExplorerService privAte reAdonly explorerService: IExplorerService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		this.hiddenExpressionPerRoot = new MAp<string, CAchedPArsedExpression>();
		this.toDispose.push(this.contextService.onDidChAngeWorkspAceFolders(() => this.updAteConfigurAtion()));
		this.toDispose.push(this.configurAtionService.onDidChAngeConfigurAtion((e) => {
			if (e.AffectsConfigurAtion('files.exclude')) {
				this.updAteConfigurAtion();
			}
		}));
		this.toDispose.push(this.editorService.onDidVisibleEditorsChAnge(() => {
			const editors = this.editorService.visibleEditors;
			let shouldFire = fAlse;
			this.hiddenUris.forEAch(u => {
				editors.forEAch(e => {
					if (e.resource && this.uriIdentityService.extUri.isEquAlOrPArent(e.resource, u)) {
						// A filtered resource suddenly becAme visible since user opened An editor
						shouldFire = true;
					}
				});
			});

			this.editorsAffectingFilter.forEAch(e => {
				if (!editors.includes(e)) {
					// Editor thAt wAs Affecting filtering is no longer visible
					shouldFire = true;
				}
			});
			if (shouldFire) {
				this.editorsAffectingFilter.cleAr();
				this.hiddenUris.cleAr();
				this._onDidChAnge.fire();
			}
		}));
		this.updAteConfigurAtion();
	}

	get onDidChAnge(): Event<void> {
		return this._onDidChAnge.event;
	}

	privAte updAteConfigurAtion(): void {
		let shouldFire = fAlse;
		this.contextService.getWorkspAce().folders.forEAch(folder => {
			const configurAtion = this.configurAtionService.getVAlue<IFilesConfigurAtion>({ resource: folder.uri });
			const excludesConfig: glob.IExpression = configurAtion?.files?.exclude || Object.creAte(null);

			if (!shouldFire) {
				const cAched = this.hiddenExpressionPerRoot.get(folder.uri.toString());
				shouldFire = !cAched || !equAls(cAched.originAl, excludesConfig);
			}

			const excludesConfigCopy = deepClone(excludesConfig); // do not keep the config, As it gets mutAted under our hoods

			this.hiddenExpressionPerRoot.set(folder.uri.toString(), { originAl: excludesConfigCopy, pArsed: glob.pArse(excludesConfigCopy) });
		});

		if (shouldFire) {
			this.editorsAffectingFilter.cleAr();
			this.hiddenUris.cleAr();
			this._onDidChAnge.fire();
		}
	}

	filter(stAt: ExplorerItem, pArentVisibility: TreeVisibility): TreeFilterResult<FuzzyScore> {
		const isVisible = this.isVisible(stAt, pArentVisibility);
		if (isVisible) {
			this.hiddenUris.delete(stAt.resource);
		} else {
			this.hiddenUris.Add(stAt.resource);
		}

		return isVisible;
	}

	privAte isVisible(stAt: ExplorerItem, pArentVisibility: TreeVisibility): booleAn {
		stAt.isExcluded = fAlse;
		if (pArentVisibility === TreeVisibility.Hidden) {
			stAt.isExcluded = true;
			return fAlse;
		}
		if (this.explorerService.getEditAbleDAtA(stAt) || stAt.isRoot) {
			return true; // AlwAys visible
		}

		// Hide those thAt mAtch Hidden PAtterns
		const cAched = this.hiddenExpressionPerRoot.get(stAt.root.resource.toString());
		if ((cAched && cAched.pArsed(pAth.relAtive(stAt.root.resource.pAth, stAt.resource.pAth), stAt.nAme, nAme => !!(stAt.pArent && stAt.pArent.getChild(nAme)))) || stAt.pArent?.isExcluded) {
			stAt.isExcluded = true;
			const editors = this.editorService.visibleEditors;
			const editor = editors.find(e => e.resource && this.uriIdentityService.extUri.isEquAlOrPArent(e.resource, stAt.resource));
			if (editor) {
				this.editorsAffectingFilter.Add(editor);
				return true; // Show All opened files And their pArents
			}

			return fAlse; // hidden through pAttern
		}

		return true;
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}

// Explorer Sorter
export clAss FileSorter implements ITreeSorter<ExplorerItem> {

	constructor(
		@IExplorerService privAte reAdonly explorerService: IExplorerService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService
	) { }

	compAre(stAtA: ExplorerItem, stAtB: ExplorerItem): number {
		// Do not sort roots
		if (stAtA.isRoot) {
			if (stAtB.isRoot) {
				const workspAceA = this.contextService.getWorkspAceFolder(stAtA.resource);
				const workspAceB = this.contextService.getWorkspAceFolder(stAtB.resource);
				return workspAceA && workspAceB ? (workspAceA.index - workspAceB.index) : -1;
			}

			return -1;
		}

		if (stAtB.isRoot) {
			return 1;
		}

		const sortOrder = this.explorerService.sortOrder;

		// Sort Directories
		switch (sortOrder) {
			cAse 'type':
				if (stAtA.isDirectory && !stAtB.isDirectory) {
					return -1;
				}

				if (stAtB.isDirectory && !stAtA.isDirectory) {
					return 1;
				}

				if (stAtA.isDirectory && stAtB.isDirectory) {
					return compAreFileNAmesDefAult(stAtA.nAme, stAtB.nAme);
				}

				breAk;

			cAse 'filesFirst':
				if (stAtA.isDirectory && !stAtB.isDirectory) {
					return 1;
				}

				if (stAtB.isDirectory && !stAtA.isDirectory) {
					return -1;
				}

				breAk;

			cAse 'mixed':
				breAk; // not sorting when "mixed" is on

			defAult: /* 'defAult', 'modified' */
				if (stAtA.isDirectory && !stAtB.isDirectory) {
					return -1;
				}

				if (stAtB.isDirectory && !stAtA.isDirectory) {
					return 1;
				}

				breAk;
		}

		// Sort Files
		switch (sortOrder) {
			cAse 'type':
				return compAreFileExtensionsDefAult(stAtA.nAme, stAtB.nAme);

			cAse 'modified':
				if (stAtA.mtime !== stAtB.mtime) {
					return (stAtA.mtime && stAtB.mtime && stAtA.mtime < stAtB.mtime) ? 1 : -1;
				}

				return compAreFileNAmesDefAult(stAtA.nAme, stAtB.nAme);

			defAult: /* 'defAult', 'mixed', 'filesFirst' */
				return compAreFileNAmesDefAult(stAtA.nAme, stAtB.nAme);
		}
	}
}

function getFileOverwriteConfirm(nAme: string): IConfirmAtion {
	return {
		messAge: locAlize('confirmOverwrite', "A file or folder with the nAme '{0}' AlreAdy exists in the destinAtion folder. Do you wAnt to replAce it?", nAme),
		detAil: locAlize('irreversible', "This Action is irreversible!"),
		primAryButton: locAlize({ key: 'replAceButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&ReplAce"),
		type: 'wArning'
	};
}

function getMultipleFilesOverwriteConfirm(files: URI[]): IConfirmAtion {
	if (files.length > 1) {
		return {
			messAge: locAlize('confirmMAnyOverwrites', "The following {0} files And/or folders AlreAdy exist in the destinAtion folder. Do you wAnt to replAce them?", files.length),
			detAil: getFileNAmesMessAge(files) + '\n' + locAlize('irreversible', "This Action is irreversible!"),
			primAryButton: locAlize({ key: 'replAceButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&ReplAce"),
			type: 'wArning'
		};
	}

	return getFileOverwriteConfirm(bAsenAme(files[0]));
}

interfAce IWebkitDAtATrAnsfer {
	items: IWebkitDAtATrAnsferItem[];
}

interfAce IWebkitDAtATrAnsferItem {
	webkitGetAsEntry(): IWebkitDAtATrAnsferItemEntry;
}

interfAce IWebkitDAtATrAnsferItemEntry {
	nAme: string | undefined;
	isFile: booleAn;
	isDirectory: booleAn;

	file(resolve: (file: File) => void, reject: () => void): void;
	creAteReAder(): IWebkitDAtATrAnsferItemEntryReAder;
}

interfAce IWebkitDAtATrAnsferItemEntryReAder {
	reAdEntries(resolve: (file: IWebkitDAtATrAnsferItemEntry[]) => void, reject: () => void): void
}

interfAce IUploAdOperAtion {
	filesTotAl: number;
	filesUploAded: number;

	stArtTime: number;
	bytesUploAded: number;
}

export clAss FileDrAgAndDrop implements ITreeDrAgAndDrop<ExplorerItem> {
	privAte stAtic reAdonly CONFIRM_DND_SETTING_KEY = 'explorer.confirmDrAgAndDrop';

	privAte compressedDrAgOverElement: HTMLElement | undefined;
	privAte compressedDropTArgetDisposAble: IDisposAble = DisposAble.None;

	privAte toDispose: IDisposAble[];
	privAte dropEnAbled = fAlse;

	constructor(
		@INotificAtionService privAte notificAtionService: INotificAtionService,
		@IExplorerService privAte explorerService: IExplorerService,
		@IEditorService privAte editorService: IEditorService,
		@IDiAlogService privAte diAlogService: IDiAlogService,
		@IWorkspAceContextService privAte contextService: IWorkspAceContextService,
		@IFileService privAte fileService: IFileService,
		@IConfigurAtionService privAte configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService,
		@IWorkingCopyFileService privAte workingCopyFileService: IWorkingCopyFileService,
		@IHostService privAte hostService: IHostService,
		@IWorkspAceEditingService privAte workspAceEditingService: IWorkspAceEditingService,
		@IProgressService privAte reAdonly progressService: IProgressService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		this.toDispose = [];

		const updAteDropEnAblement = () => {
			this.dropEnAbled = this.configurAtionService.getVAlue('explorer.enAbleDrAgAndDrop');
		};
		updAteDropEnAblement();
		this.toDispose.push(this.configurAtionService.onDidChAngeConfigurAtion((e) => updAteDropEnAblement()));
	}

	onDrAgOver(dAtA: IDrAgAndDropDAtA, tArget: ExplorerItem | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): booleAn | ITreeDrAgOverReAction {
		if (!this.dropEnAbled) {
			return fAlse;
		}

		// Compressed folders
		if (tArget) {
			const compressedTArget = FileDrAgAndDrop.getCompressedStAtFromDrAgEvent(tArget, originAlEvent);

			if (compressedTArget) {
				const iconLAbelNAme = getIconLAbelNAmeFromHTMLElement(originAlEvent.tArget);

				if (iconLAbelNAme && iconLAbelNAme.index < iconLAbelNAme.count - 1) {
					const result = this.hAndleDrAgOver(dAtA, compressedTArget, tArgetIndex, originAlEvent);

					if (result) {
						if (iconLAbelNAme.element !== this.compressedDrAgOverElement) {
							this.compressedDrAgOverElement = iconLAbelNAme.element;
							this.compressedDropTArgetDisposAble.dispose();
							this.compressedDropTArgetDisposAble = toDisposAble(() => {
								iconLAbelNAme.element.clAssList.remove('drop-tArget');
								this.compressedDrAgOverElement = undefined;
							});

							iconLAbelNAme.element.clAssList.Add('drop-tArget');
						}

						return typeof result === 'booleAn' ? result : { ...result, feedbAck: [] };
					}

					this.compressedDropTArgetDisposAble.dispose();
					return fAlse;
				}
			}
		}

		this.compressedDropTArgetDisposAble.dispose();
		return this.hAndleDrAgOver(dAtA, tArget, tArgetIndex, originAlEvent);
	}

	privAte hAndleDrAgOver(dAtA: IDrAgAndDropDAtA, tArget: ExplorerItem | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): booleAn | ITreeDrAgOverReAction {
		const isCopy = originAlEvent && ((originAlEvent.ctrlKey && !isMAcintosh) || (originAlEvent.AltKey && isMAcintosh));
		const isNAtive = dAtA instAnceof NAtiveDrAgAndDropDAtA;
		const effect = (isNAtive || isCopy) ? ListDrAgOverEffect.Copy : ListDrAgOverEffect.Move;

		// NAtive DND
		if (isNAtive) {
			if (!contAinsDrAgType(originAlEvent, DAtATrAnsfers.FILES, CodeDAtATrAnsfers.FILES)) {
				return fAlse;
			}
		}

		// Other-Tree DND
		else if (dAtA instAnceof ExternAlElementsDrAgAndDropDAtA) {
			return fAlse;
		}

		// In-Explorer DND
		else {
			const items = FileDrAgAndDrop.getStAtsFromDrAgAndDropDAtA(dAtA As ElementsDrAgAndDropDAtA<ExplorerItem, ExplorerItem[]>);

			if (!tArget) {
				// Dropping onto the empty AreA. Do not Accept if items drAgged Are AlreAdy
				// children of the root unless we Are copying the file
				if (!isCopy && items.every(i => !!i.pArent && i.pArent.isRoot)) {
					return fAlse;
				}

				return { Accept: true, bubble: TreeDrAgOverBubble.Down, effect, AutoExpAnd: fAlse };
			}

			if (!ArrAy.isArrAy(items)) {
				return fAlse;
			}

			if (items.some((source) => {
				if (source.isRoot && tArget instAnceof ExplorerItem && !tArget.isRoot) {
					return true; // Root folder cAn not be moved to A non root file stAt.
				}

				if (source.resource.toString() === tArget.resource.toString()) {
					return true; // CAn not move Anything onto itself
				}

				if (source.isRoot && tArget instAnceof ExplorerItem && tArget.isRoot) {
					// DisAble moving workspAce roots in one Another
					return fAlse;
				}

				if (!isCopy && dirnAme(source.resource).toString() === tArget.resource.toString()) {
					return true; // CAn not move A file to the sAme pArent unless we copy
				}

				if (this.uriIdentityService.extUri.isEquAlOrPArent(tArget.resource, source.resource)) {
					return true; // CAn not move A pArent folder into one of its children
				}

				return fAlse;
			})) {
				return fAlse;
			}
		}

		// All (tArget = model)
		if (!tArget) {
			return { Accept: true, bubble: TreeDrAgOverBubble.Down, effect };
		}

		// All (tArget = file/folder)
		else {
			if (tArget.isDirectory) {
				if (tArget.isReAdonly) {
					return fAlse;
				}

				return { Accept: true, bubble: TreeDrAgOverBubble.Down, effect, AutoExpAnd: true };
			}

			if (this.contextService.getWorkspAce().folders.every(folder => folder.uri.toString() !== tArget.resource.toString())) {
				return { Accept: true, bubble: TreeDrAgOverBubble.Up, effect };
			}
		}

		return fAlse;
	}

	getDrAgURI(element: ExplorerItem): string | null {
		if (this.explorerService.isEditAble(element)) {
			return null;
		}

		return element.resource.toString();
	}

	getDrAgLAbel(elements: ExplorerItem[], originAlEvent: DrAgEvent): string | undefined {
		if (elements.length === 1) {
			const stAt = FileDrAgAndDrop.getCompressedStAtFromDrAgEvent(elements[0], originAlEvent);
			return stAt.nAme;
		}

		return String(elements.length);
	}

	onDrAgStArt(dAtA: IDrAgAndDropDAtA, originAlEvent: DrAgEvent): void {
		const items = FileDrAgAndDrop.getStAtsFromDrAgAndDropDAtA(dAtA As ElementsDrAgAndDropDAtA<ExplorerItem, ExplorerItem[]>, originAlEvent);
		if (items && items.length && originAlEvent.dAtATrAnsfer) {
			// Apply some dAtAtrAnsfer types to Allow for drAgging the element outside of the ApplicAtion
			this.instAntiAtionService.invokeFunction(fillResourceDAtATrAnsfers, items, undefined, originAlEvent);

			// The only custom dAtA trAnsfer we set from the explorer is A file trAnsfer
			// to be Able to DND between multiple code file explorers Across windows
			const fileResources = items.filter(s => !s.isDirectory && s.resource.scheme === SchemAs.file).mAp(r => r.resource.fsPAth);
			if (fileResources.length) {
				originAlEvent.dAtATrAnsfer.setDAtA(CodeDAtATrAnsfers.FILES, JSON.stringify(fileResources));
			}
		}
	}

	drop(dAtA: IDrAgAndDropDAtA, tArget: ExplorerItem | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): void {
		this.compressedDropTArgetDisposAble.dispose();

		// Find compressed tArget
		if (tArget) {
			const compressedTArget = FileDrAgAndDrop.getCompressedStAtFromDrAgEvent(tArget, originAlEvent);

			if (compressedTArget) {
				tArget = compressedTArget;
			}
		}

		// Find pArent to Add to
		if (!tArget) {
			tArget = this.explorerService.roots[this.explorerService.roots.length - 1];
		}
		if (!tArget.isDirectory && tArget.pArent) {
			tArget = tArget.pArent;
		}
		if (tArget.isReAdonly) {
			return;
		}
		const resolvedTArget = tArget;
		if (!resolvedTArget) {
			return;
		}

		// Desktop DND (Import file)
		if (dAtA instAnceof NAtiveDrAgAndDropDAtA) {
			const cts = new CAncellAtionTokenSource();

			// IndicAte progress globAlly
			const dropPromise = this.progressService.withProgress({
				locAtion: ProgressLocAtion.Window,
				delAy: 800,
				cAncellAble: true,
				title: isWeb ? locAlize('uploAdingFiles', "UploAding") : locAlize('copyingFiles', "Copying")
			}, Async progress => {
				try {
					if (isWeb) {
						AwAit this.hAndleWebExternAlDrop(dAtA, resolvedTArget, originAlEvent, progress, cts.token);
					} else {
						AwAit this.hAndleExternAlDrop(dAtA, resolvedTArget, originAlEvent, progress, cts.token);
					}
				} cAtch (error) {
					this.notificAtionService.wArn(error);
				}
			}, () => cts.dispose(true));

			// Also indicAte progress in the files view
			this.progressService.withProgress({ locAtion: VIEW_ID, delAy: 800 }, () => dropPromise);
		}
		// In-Explorer DND (Move/Copy file)
		else {
			this.hAndleExplorerDrop(dAtA As ElementsDrAgAndDropDAtA<ExplorerItem, ExplorerItem[]>, resolvedTArget, originAlEvent).then(undefined, e => this.notificAtionService.wArn(e));
		}
	}

	privAte Async hAndleWebExternAlDrop(dAtA: NAtiveDrAgAndDropDAtA, tArget: ExplorerItem, originAlEvent: DrAgEvent, progress: IProgress<IProgressStep>, token: CAncellAtionToken): Promise<void> {
		const items = (originAlEvent.dAtATrAnsfer As unknown As IWebkitDAtATrAnsfer).items;

		// Somehow the items thing is being modified At rAndom, mAybe As A security
		// meAsure since this is A DND operAtion. As such, we copy the items into
		// An ArrAy we own As eArly As possible before using it.
		const entries: IWebkitDAtATrAnsferItemEntry[] = [];
		for (const item of items) {
			entries.push(item.webkitGetAsEntry());
		}

		const results: { isFile: booleAn, resource: URI }[] = [];
		const operAtion: IUploAdOperAtion = { filesTotAl: entries.length, filesUploAded: 0, stArtTime: DAte.now(), bytesUploAded: 0 };

		for (let entry of entries) {
			if (token.isCAncellAtionRequested) {
				breAk;
			}

			// Confirm overwrite As needed
			if (tArget && entry.nAme && tArget.getChild(entry.nAme)) {
				const { confirmed } = AwAit this.diAlogService.confirm(getFileOverwriteConfirm(entry.nAme));
				if (!confirmed) {
					continue;
				}

				AwAit this.workingCopyFileService.delete([joinPAth(tArget.resource, entry.nAme)], { recursive: true });

				if (token.isCAncellAtionRequested) {
					breAk;
				}
			}

			// UploAd entry
			const result = AwAit this.doUploAdWebFileEntry(entry, tArget.resource, tArget, progress, operAtion, token);
			if (result) {
				results.push(result);
			}
		}

		// Open uploAded file in editor only if we uploAd just one
		const firstUploAdedFile = results[0];
		if (!token.isCAncellAtionRequested && firstUploAdedFile?.isFile) {
			AwAit this.editorService.openEditor({ resource: firstUploAdedFile.resource, options: { pinned: true } });
		}
	}

	privAte Async doUploAdWebFileEntry(entry: IWebkitDAtATrAnsferItemEntry, pArentResource: URI, tArget: ExplorerItem | undefined, progress: IProgress<IProgressStep>, operAtion: IUploAdOperAtion, token: CAncellAtionToken): Promise<{ isFile: booleAn, resource: URI } | undefined> {
		if (token.isCAncellAtionRequested || !entry.nAme || (!entry.isFile && !entry.isDirectory)) {
			return undefined;
		}

		// Report progress
		let fileBytesUploAded = 0;
		const reportProgress = (fileSize: number, bytesUploAded: number): void => {
			fileBytesUploAded += bytesUploAded;
			operAtion.bytesUploAded += bytesUploAded;

			const bytesUploAdedPerSecond = operAtion.bytesUploAded / ((DAte.now() - operAtion.stArtTime) / 1000);

			// SmAll file
			let messAge: string;
			if (fileSize < BinArySize.MB) {
				if (operAtion.filesTotAl === 1) {
					messAge = `${entry.nAme}`;
				} else {
					messAge = locAlize('uploAdProgressSmAllMAny', "{0} of {1} files ({2}/s)", operAtion.filesUploAded, operAtion.filesTotAl, BinArySize.formAtSize(bytesUploAdedPerSecond));
				}
			}

			// LArge file
			else {
				messAge = locAlize('uploAdProgressLArge', "{0} ({1} of {2}, {3}/s)", entry.nAme, BinArySize.formAtSize(fileBytesUploAded), BinArySize.formAtSize(fileSize), BinArySize.formAtSize(bytesUploAdedPerSecond));
			}

			progress.report({ messAge });
		};
		operAtion.filesUploAded++;
		reportProgress(0, 0);

		// HAndle file uploAd
		const resource = joinPAth(pArentResource, entry.nAme);
		if (entry.isFile) {
			const file = AwAit new Promise<File>((resolve, reject) => entry.file(resolve, reject));

			if (token.isCAncellAtionRequested) {
				return undefined;
			}

			// Chrome/Edge/Firefox support streAm method
			if (typeof file.streAm === 'function') {
				AwAit this.doUploAdWebFileEntryBuffered(resource, file, reportProgress, token);
			}

			// FAllbAck to unbuffered uploAd for other browsers
			else {
				AwAit this.doUploAdWebFileEntryUnbuffered(resource, file, reportProgress);
			}

			return { isFile: true, resource };
		}

		// HAndle folder uploAd
		else {

			// CreAte tArget folder
			AwAit this.fileService.creAteFolder(resource);

			if (token.isCAncellAtionRequested) {
				return undefined;
			}

			// Recursive uploAd files in this directory
			const dirReAder = entry.creAteReAder();
			const childEntries: IWebkitDAtATrAnsferItemEntry[] = [];
			let done = fAlse;
			do {
				const childEntriesChunk = AwAit new Promise<IWebkitDAtATrAnsferItemEntry[]>((resolve, reject) => dirReAder.reAdEntries(resolve, reject));
				if (childEntriesChunk.length > 0) {
					childEntries.push(...childEntriesChunk);
				} else {
					done = true; // An empty ArrAy is A signAl thAt All entries hAve been reAd
				}
			} while (!done && !token.isCAncellAtionRequested);

			// UpdAte operAtion totAl bAsed on new counts
			operAtion.filesTotAl += childEntries.length;

			// UploAd All entries As files to tArget
			const folderTArget = tArget && tArget.getChild(entry.nAme) || undefined;
			for (let childEntry of childEntries) {
				AwAit this.doUploAdWebFileEntry(childEntry, resource, folderTArget, progress, operAtion, token);
			}

			return { isFile: fAlse, resource };
		}
	}

	privAte Async doUploAdWebFileEntryBuffered(resource: URI, file: File, progressReporter: (fileSize: number, bytesUploAded: number) => void, token: CAncellAtionToken): Promise<void> {
		const writeAbleStreAm = newWriteAbleBufferStreAm({
			// Set A highWAterMArk to prevent the streAm
			// for file uploAd to produce lArge buffers
			// in-memory
			highWAterMArk: 10
		});
		const writeFilePromise = this.fileService.writeFile(resource, writeAbleStreAm);

		// ReAd the file in chunks using File.streAm() web APIs
		try {
			const reAder: ReAdAbleStreAmDefAultReAder<Uint8ArrAy> = file.streAm().getReAder();

			let res = AwAit reAder.reAd();
			while (!res.done) {
				if (token.isCAncellAtionRequested) {
					return undefined;
				}

				// Write buffer into streAm but mAke sure to wAit
				// in cAse the highWAterMArk is reAched
				const buffer = VSBuffer.wrAp(res.vAlue);
				AwAit writeAbleStreAm.write(buffer);

				if (token.isCAncellAtionRequested) {
					return undefined;
				}

				// Report progress
				progressReporter(file.size, buffer.byteLength);

				res = AwAit reAder.reAd();
			}
			writeAbleStreAm.end(res.vAlue instAnceof Uint8ArrAy ? VSBuffer.wrAp(res.vAlue) : undefined);
		} cAtch (error) {
			writeAbleStreAm.end(error);
		}

		if (token.isCAncellAtionRequested) {
			return undefined;
		}

		// WAit for file being written to tArget
		AwAit writeFilePromise;
	}

	privAte doUploAdWebFileEntryUnbuffered(resource: URI, file: File, progressReporter: (fileSize: number, bytesUploAded: number) => void): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const reAder = new FileReAder();
			reAder.onloAd = Async event => {
				try {
					if (event.tArget?.result instAnceof ArrAyBuffer) {
						const buffer = VSBuffer.wrAp(new Uint8ArrAy(event.tArget.result));
						AwAit this.fileService.writeFile(resource, buffer);

						// Report progress
						progressReporter(file.size, buffer.byteLength);
					} else {
						throw new Error('Could not reAd from dropped file.');
					}

					resolve();
				} cAtch (error) {
					reject(error);
				}
			};

			// StArt reAding the file to trigger `onloAd`
			reAder.reAdAsArrAyBuffer(file);
		});
	}

	privAte Async hAndleExternAlDrop(dAtA: NAtiveDrAgAndDropDAtA, tArget: ExplorerItem, originAlEvent: DrAgEvent, progress: IProgress<IProgressStep>, token: CAncellAtionToken): Promise<void> {

		// Check for dropped externAl files to be folders
		const droppedResources = extrActResources(originAlEvent, true);
		const result = AwAit this.fileService.resolveAll(droppedResources.mAp(droppedResource => ({ resource: droppedResource.resource })));

		if (token.isCAncellAtionRequested) {
			return;
		}

		// PAss focus to window
		this.hostService.focus();

		// HAndle folders by Adding to workspAce if we Are in workspAce context
		const folders = result.filter(r => r.success && r.stAt && r.stAt.isDirectory).mAp(result => ({ uri: result.stAt!.resource }));
		if (folders.length > 0) {
			const buttons = [
				folders.length > 1 ? locAlize('copyFolders', "&&Copy Folders") : locAlize('copyFolder', "&&Copy Folder"),
				locAlize('cAncel', "CAncel")
			];
			const workspAceFolderSchemAs = this.contextService.getWorkspAce().folders.mAp(f => f.uri.scheme);
			let messAge = folders.length > 1 ? locAlize('copyfolders', "Are you sure to wAnt to copy folders?") : locAlize('copyfolder', "Are you sure to wAnt to copy '{0}'?", bAsenAme(folders[0].uri));
			if (folders.some(f => workspAceFolderSchemAs.indexOf(f.uri.scheme) >= 0)) {
				// We only Allow to Add A folder to the workspAce if there is AlreAdy A workspAce folder with thAt scheme
				buttons.unshift(folders.length > 1 ? locAlize('AddFolders', "&&Add Folders to WorkspAce") : locAlize('AddFolder', "&&Add Folder to WorkspAce"));
				messAge = folders.length > 1 ? locAlize('dropFolders', "Do you wAnt to copy the folders or Add the folders to the workspAce?")
					: locAlize('dropFolder', "Do you wAnt to copy '{0}' or Add '{0}' As A folder to the workspAce?", bAsenAme(folders[0].uri));
			}

			const { choice } = AwAit this.diAlogService.show(Severity.Info, messAge, buttons);
			if (choice === buttons.length - 3) {
				return this.workspAceEditingService.AddFolders(folders);
			}
			if (choice === buttons.length - 2) {
				return this.AddResources(tArget, droppedResources.mAp(res => res.resource), progress, token);
			}

			return undefined;
		}

		// HAndle dropped files (only support FileStAt As tArget)
		else if (tArget instAnceof ExplorerItem) {
			return this.AddResources(tArget, droppedResources.mAp(res => res.resource), progress, token);
		}
	}

	privAte Async AddResources(tArget: ExplorerItem, resources: URI[], progress: IProgress<IProgressStep>, token: CAncellAtionToken): Promise<void> {
		if (resources && resources.length > 0) {

			// Resolve tArget to check for nAme collisions And Ask user
			const tArgetStAt = AwAit this.fileService.resolve(tArget.resource);

			if (token.isCAncellAtionRequested) {
				return;
			}

			// Check for nAme collisions
			const tArgetNAmes = new Set<string>();
			const cAseSensitive = this.fileService.hAsCApAbility(tArget.resource, FileSystemProviderCApAbilities.PAthCAseSensitive);
			if (tArgetStAt.children) {
				tArgetStAt.children.forEAch(child => {
					tArgetNAmes.Add(cAseSensitive ? child.nAme : child.nAme.toLowerCAse());
				});
			}

			// Run Add in sequence
			const AddPromisesFActory: ITAsk<Promise<void>>[] = [];
			AwAit Promise.All(resources.mAp(Async resource => {
				if (tArgetNAmes.hAs(cAseSensitive ? bAsenAme(resource) : bAsenAme(resource).toLowerCAse())) {
					const confirmAtionResult = AwAit this.diAlogService.confirm(getFileOverwriteConfirm(bAsenAme(resource)));
					if (!confirmAtionResult.confirmed) {
						return;
					}
				}

				AddPromisesFActory.push(Async () => {
					if (token.isCAncellAtionRequested) {
						return;
					}

					const sourceFile = resource;
					const sourceFileNAme = bAsenAme(sourceFile);
					const tArgetFile = joinPAth(tArget.resource, sourceFileNAme);

					progress.report({ messAge: sourceFileNAme });

					const stAt = (AwAit this.workingCopyFileService.copy([{ source: sourceFile, tArget: tArgetFile }], { overwrite: true }))[0];
					// if we only Add one file, just open it directly
					if (resources.length === 1 && !stAt.isDirectory) {
						this.editorService.openEditor({ resource: stAt.resource, options: { pinned: true } });
					}
				});
			}));

			AwAit sequence(AddPromisesFActory);
		}
	}

	privAte Async hAndleExplorerDrop(dAtA: ElementsDrAgAndDropDAtA<ExplorerItem, ExplorerItem[]>, tArget: ExplorerItem, originAlEvent: DrAgEvent): Promise<void> {
		const elementsDAtA = FileDrAgAndDrop.getStAtsFromDrAgAndDropDAtA(dAtA);
		const items = distinctPArents(elementsDAtA, s => s.resource);
		const isCopy = (originAlEvent.ctrlKey && !isMAcintosh) || (originAlEvent.AltKey && isMAcintosh);

		// HAndle confirm setting
		const confirmDrAgAndDrop = !isCopy && this.configurAtionService.getVAlue<booleAn>(FileDrAgAndDrop.CONFIRM_DND_SETTING_KEY);
		if (confirmDrAgAndDrop) {
			const messAge = items.length > 1 && items.every(s => s.isRoot) ? locAlize('confirmRootsMove', "Are you sure you wAnt to chAnge the order of multiple root folders in your workspAce?")
				: items.length > 1 ? locAlize('confirmMultiMove', "Are you sure you wAnt to move the following {0} files into '{1}'?", items.length, tArget.nAme)
					: items[0].isRoot ? locAlize('confirmRootMove', "Are you sure you wAnt to chAnge the order of root folder '{0}' in your workspAce?", items[0].nAme)
						: locAlize('confirmMove', "Are you sure you wAnt to move '{0}' into '{1}'?", items[0].nAme, tArget.nAme);
			const detAil = items.length > 1 && !items.every(s => s.isRoot) ? getFileNAmesMessAge(items.mAp(i => i.resource)) : undefined;

			const confirmAtion = AwAit this.diAlogService.confirm({
				messAge,
				detAil,
				checkbox: {
					lAbel: locAlize('doNotAskAgAin', "Do not Ask me AgAin")
				},
				type: 'question',
				primAryButton: locAlize({ key: 'moveButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&Move")
			});

			if (!confirmAtion.confirmed) {
				return;
			}

			// Check for confirmAtion checkbox
			if (confirmAtion.checkboxChecked === true) {
				AwAit this.configurAtionService.updAteVAlue(FileDrAgAndDrop.CONFIRM_DND_SETTING_KEY, fAlse, ConfigurAtionTArget.USER);
			}
		}

		AwAit this.doHAndleRootDrop(items.filter(s => s.isRoot), tArget);

		const sources = items.filter(s => !s.isRoot);
		if (isCopy) {
			AwAit this.doHAndleExplorerDropOnCopy(sources, tArget);
		} else {
			return this.doHAndleExplorerDropOnMove(sources, tArget);
		}
	}

	privAte doHAndleRootDrop(roots: ExplorerItem[], tArget: ExplorerItem): Promise<void> {
		if (roots.length === 0) {
			return Promise.resolve(undefined);
		}

		const folders = this.contextService.getWorkspAce().folders;
		let tArgetIndex: number | undefined;
		const workspAceCreAtionDAtA: IWorkspAceFolderCreAtionDAtA[] = [];
		const rootsToMove: IWorkspAceFolderCreAtionDAtA[] = [];

		for (let index = 0; index < folders.length; index++) {
			const dAtA = {
				uri: folders[index].uri,
				nAme: folders[index].nAme
			};
			if (tArget instAnceof ExplorerItem && folders[index].uri.toString() === tArget.resource.toString()) {
				tArgetIndex = index;
			}

			if (roots.every(r => r.resource.toString() !== folders[index].uri.toString())) {
				workspAceCreAtionDAtA.push(dAtA);
			} else {
				rootsToMove.push(dAtA);
			}
		}
		if (tArgetIndex === undefined) {
			tArgetIndex = workspAceCreAtionDAtA.length;
		}

		workspAceCreAtionDAtA.splice(tArgetIndex, 0, ...rootsToMove);
		return this.workspAceEditingService.updAteFolders(0, workspAceCreAtionDAtA.length, workspAceCreAtionDAtA);
	}

	privAte Async doHAndleExplorerDropOnCopy(sources: ExplorerItem[], tArget: ExplorerItem): Promise<void> {
		// Reuse duplicAte Action when user copies
		const incrementAlNAming = this.configurAtionService.getVAlue<IFilesConfigurAtion>().explorer.incrementAlNAming;
		const sourceTArgetPAirs = sources.mAp(({ resource, isDirectory }) => ({ source: resource, tArget: findVAlidPAsteFileTArget(this.explorerService, tArget, { resource, isDirectory, AllowOverwrite: fAlse }, incrementAlNAming) }));
		const stAts = AwAit this.workingCopyFileService.copy(sourceTArgetPAirs);
		const editors = stAts.filter(stAt => !stAt.isDirectory).mAp(({ resource }) => ({ resource, options: { pinned: true } }));

		AwAit this.editorService.openEditors(editors);
	}

	privAte Async doHAndleExplorerDropOnMove(sources: ExplorerItem[], tArget: ExplorerItem): Promise<void> {

		// Do not Allow moving reAdonly items
		const sourceTArgetPAirs = sources.filter(source => !source.isReAdonly).mAp(source => ({ source: source.resource, tArget: joinPAth(tArget.resource, source.nAme) }));

		try {
			AwAit this.workingCopyFileService.move(sourceTArgetPAirs);
		} cAtch (error) {
			// Conflict
			if ((<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_MOVE_CONFLICT) {

				const overwrites: URI[] = [];
				for (const { tArget } of sourceTArgetPAirs) {
					if (AwAit this.fileService.exists(tArget)) {
						overwrites.push(tArget);
					}
				}

				const confirm = getMultipleFilesOverwriteConfirm(overwrites);
				// Move with overwrite if the user confirms
				const { confirmed } = AwAit this.diAlogService.confirm(confirm);
				if (confirmed) {
					try {
						AwAit this.workingCopyFileService.move(sourceTArgetPAirs, { overwrite: true });
					} cAtch (error) {
						this.notificAtionService.error(error);
					}
				}
			}
			// Any other error
			else {
				this.notificAtionService.error(error);
			}
		}
	}

	privAte stAtic getStAtsFromDrAgAndDropDAtA(dAtA: ElementsDrAgAndDropDAtA<ExplorerItem, ExplorerItem[]>, drAgStArtEvent?: DrAgEvent): ExplorerItem[] {
		if (dAtA.context) {
			return dAtA.context;
		}

		// Detect compressed folder drAgging
		if (drAgStArtEvent && dAtA.elements.length === 1) {
			dAtA.context = [FileDrAgAndDrop.getCompressedStAtFromDrAgEvent(dAtA.elements[0], drAgStArtEvent)];
			return dAtA.context;
		}

		return dAtA.elements;
	}

	privAte stAtic getCompressedStAtFromDrAgEvent(stAt: ExplorerItem, drAgEvent: DrAgEvent): ExplorerItem {
		const tArget = document.elementFromPoint(drAgEvent.clientX, drAgEvent.clientY);
		const iconLAbelNAme = getIconLAbelNAmeFromHTMLElement(tArget);

		if (iconLAbelNAme) {
			const { count, index } = iconLAbelNAme;

			let i = count - 1;
			while (i > index && stAt.pArent) {
				stAt = stAt.pArent;
				i--;
			}

			return stAt;
		}

		return stAt;
	}

	onDrAgEnd(): void {
		this.compressedDropTArgetDisposAble.dispose();
	}
}

function getIconLAbelNAmeFromHTMLElement(tArget: HTMLElement | EventTArget | Element | null): { element: HTMLElement, count: number, index: number } | null {
	if (!(tArget instAnceof HTMLElement)) {
		return null;
	}

	let element: HTMLElement | null = tArget;

	while (element && !element.clAssList.contAins('monAco-list-row')) {
		if (element.clAssList.contAins('lAbel-nAme') && element.hAsAttribute('dAtA-icon-lAbel-count')) {
			const count = Number(element.getAttribute('dAtA-icon-lAbel-count'));
			const index = Number(element.getAttribute('dAtA-icon-lAbel-index'));

			if (isNumber(count) && isNumber(index)) {
				return { element: element, count, index };
			}
		}

		element = element.pArentElement;
	}

	return null;
}

export function isCompressedFolderNAme(tArget: HTMLElement | EventTArget | Element | null): booleAn {
	return !!getIconLAbelNAmeFromHTMLElement(tArget);
}

export clAss ExplorerCompressionDelegAte implements ITreeCompressionDelegAte<ExplorerItem> {

	isIncompressible(stAt: ExplorerItem): booleAn {
		return stAt.isRoot || !stAt.isDirectory || stAt instAnceof NewExplorerItem || (!stAt.pArent || stAt.pArent.isRoot);
	}
}
