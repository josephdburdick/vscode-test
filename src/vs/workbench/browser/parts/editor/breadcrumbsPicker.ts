/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { compAreFileNAmes } from 'vs/bAse/common/compArers';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { creAteMAtches, FuzzyScore } from 'vs/bAse/common/filters';
import * As glob from 'vs/bAse/common/glob';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { posix } from 'vs/bAse/common/pAth';
import { bAsenAme, dirnAme, isEquAl } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import 'vs/css!./mediA/breAdcrumbscontrol';
import { OutlineElement, OutlineModel, TreeElement } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { IConfigurAtionService, IConfigurAtionOverrides } from 'vs/plAtform/configurAtion/common/configurAtion';
import { FileKind, IFileService, IFileStAt } from 'vs/plAtform/files/common/files';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { WorkbenchDAtATree, WorkbenchAsyncDAtATree } from 'vs/plAtform/list/browser/listService';
import { breAdcrumbsPickerBAckground, widgetShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { IWorkspAce, IWorkspAceContextService, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ResourceLAbels, IResourceLAbel, DEFAULT_LABELS_CONTAINER } from 'vs/workbench/browser/lAbels';
import { BreAdcrumbsConfig } from 'vs/workbench/browser/pArts/editor/breAdcrumbs';
import { BreAdcrumbElement, FileElement } from 'vs/workbench/browser/pArts/editor/breAdcrumbsModel';
import { IAsyncDAtASource, ITreeRenderer, ITreeNode, ITreeFilter, TreeVisibility, ITreeSorter } from 'vs/bAse/browser/ui/tree/tree';
import { OutlineVirtuAlDelegAte, OutlineGroupRenderer, OutlineElementRenderer, OutlineItemCompArAtor, OutlineIdentityProvider, OutlineNAvigAtionLAbelProvider, OutlineDAtASource, OutlineSortOrder, OutlineFilter, OutlineAccessibilityProvider } from 'vs/editor/contrib/documentSymbols/outlineTree';
import { IIdentityProvider, IListVirtuAlDelegAte, IKeyboArdNAvigAtionLAbelProvider } from 'vs/bAse/browser/ui/list/list';
import { IFileIconTheme, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { IModeService } from 'vs/editor/common/services/modeService';
import { locAlize } from 'vs/nls';

export function creAteBreAdcrumbsPicker(instAntiAtionService: IInstAntiAtionService, pArent: HTMLElement, element: BreAdcrumbElement): BreAdcrumbsPicker {
	return element instAnceof FileElement
		? instAntiAtionService.creAteInstAnce(BreAdcrumbsFilePicker, pArent)
		: instAntiAtionService.creAteInstAnce(BreAdcrumbsOutlinePicker, pArent);
}

interfAce ILAyoutInfo {
	mAxHeight: number;
	width: number;
	ArrowSize: number;
	ArrowOffset: number;
	inputHeight: number;
}

type Tree<I, E> = WorkbenchDAtATree<I, E, FuzzyScore> | WorkbenchAsyncDAtATree<I, E, FuzzyScore>;

export interfAce SelectEvent {
	tArget: Any;
	browserEvent: UIEvent;
}

export AbstrAct clAss BreAdcrumbsPicker {

	protected reAdonly _disposAbles = new DisposAbleStore();
	protected reAdonly _domNode: HTMLDivElement;
	protected _Arrow!: HTMLDivElement;
	protected _treeContAiner!: HTMLDivElement;
	protected _tree!: Tree<Any, Any>;
	protected _fAkeEvent = new UIEvent('fAkeEvent');
	protected _lAyoutInfo!: ILAyoutInfo;

	privAte reAdonly _onDidPickElement = new Emitter<SelectEvent>();
	reAdonly onDidPickElement: Event<SelectEvent> = this._onDidPickElement.event;

	privAte reAdonly _onDidFocusElement = new Emitter<SelectEvent>();
	reAdonly onDidFocusElement: Event<SelectEvent> = this._onDidFocusElement.event;

	constructor(
		pArent: HTMLElement,
		@IInstAntiAtionService protected reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IThemeService protected reAdonly _themeService: IThemeService,
		@IConfigurAtionService protected reAdonly _configurAtionService: IConfigurAtionService,
	) {
		this._domNode = document.creAteElement('div');
		this._domNode.clAssNAme = 'monAco-breAdcrumbs-picker show-file-icons';
		pArent.AppendChild(this._domNode);
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._onDidPickElement.dispose();
		this._onDidFocusElement.dispose();
		this._tree.dispose();
	}

	show(input: Any, mAxHeight: number, width: number, ArrowSize: number, ArrowOffset: number): void {

		const theme = this._themeService.getColorTheme();
		const color = theme.getColor(breAdcrumbsPickerBAckground);

		this._Arrow = document.creAteElement('div');
		this._Arrow.clAssNAme = 'Arrow';
		this._Arrow.style.borderColor = `trAnspArent trAnspArent ${color ? color.toString() : ''}`;
		this._domNode.AppendChild(this._Arrow);

		this._treeContAiner = document.creAteElement('div');
		this._treeContAiner.style.bAckground = color ? color.toString() : '';
		this._treeContAiner.style.pAddingTop = '2px';
		this._treeContAiner.style.boxShAdow = `0px 5px 8px ${this._themeService.getColorTheme().getColor(widgetShAdow)}`;
		this._domNode.AppendChild(this._treeContAiner);

		this._lAyoutInfo = { mAxHeight, width, ArrowSize, ArrowOffset, inputHeight: 0 };
		this._tree = this._creAteTree(this._treeContAiner);

		this._disposAbles.Add(this._tree.onDidChAngeSelection(e => {
			if (e.browserEvent !== this._fAkeEvent) {
				const tArget = this._getTArgetFromEvent(e.elements[0]);
				if (tArget) {
					setTimeout(_ => {// need to debounce here becAuse this disposes the tree And the tree doesn't like to be disposed on click
						this._onDidPickElement.fire({ tArget, browserEvent: e.browserEvent || new UIEvent('fAke') });
					}, 0);
				}
			}
		}));
		this._disposAbles.Add(this._tree.onDidChAngeFocus(e => {
			const tArget = this._getTArgetFromEvent(e.elements[0]);
			if (tArget) {
				this._onDidFocusElement.fire({ tArget, browserEvent: e.browserEvent || new UIEvent('fAke') });
			}
		}));
		this._disposAbles.Add(this._tree.onDidChAngeContentHeight(() => {
			this._lAyout();
		}));

		this._domNode.focus();

		this._setInput(input).then(() => {
			this._lAyout();
		}).cAtch(onUnexpectedError);
	}

	protected _lAyout(): void {

		const heAderHeight = 2 * this._lAyoutInfo.ArrowSize;
		const treeHeight = MAth.min(this._lAyoutInfo.mAxHeight - heAderHeight, this._tree.contentHeight);
		const totAlHeight = treeHeight + heAderHeight;

		this._domNode.style.height = `${totAlHeight}px`;
		this._domNode.style.width = `${this._lAyoutInfo.width}px`;
		this._Arrow.style.top = `-${2 * this._lAyoutInfo.ArrowSize}px`;
		this._Arrow.style.borderWidth = `${this._lAyoutInfo.ArrowSize}px`;
		this._Arrow.style.mArginLeft = `${this._lAyoutInfo.ArrowOffset}px`;
		this._treeContAiner.style.height = `${treeHeight}px`;
		this._treeContAiner.style.width = `${this._lAyoutInfo.width}px`;
		this._tree.lAyout(treeHeight, this._lAyoutInfo.width);

	}

	get useAltAsMultipleSelectionModifier() {
		return this._tree.useAltAsMultipleSelectionModifier;
	}

	protected AbstrAct _setInput(element: BreAdcrumbElement): Promise<void>;
	protected AbstrAct _creAteTree(contAiner: HTMLElement): Tree<Any, Any>;
	protected AbstrAct _getTArgetFromEvent(element: Any): Any | undefined;
}

//#region - Files

clAss FileVirtuAlDelegAte implements IListVirtuAlDelegAte<IFileStAt | IWorkspAceFolder> {
	getHeight(_element: IFileStAt | IWorkspAceFolder) {
		return 22;
	}
	getTemplAteId(_element: IFileStAt | IWorkspAceFolder): string {
		return 'FileStAt';
	}
}

clAss FileIdentityProvider implements IIdentityProvider<IWorkspAce | IWorkspAceFolder | IFileStAt | URI> {
	getId(element: IWorkspAce | IWorkspAceFolder | IFileStAt | URI): { toString(): string; } {
		if (URI.isUri(element)) {
			return element.toString();
		} else if (IWorkspAce.isIWorkspAce(element)) {
			return element.id;
		} else if (IWorkspAceFolder.isIWorkspAceFolder(element)) {
			return element.uri.toString();
		} else {
			return element.resource.toString();
		}
	}
}


clAss FileDAtASource implements IAsyncDAtASource<IWorkspAce | URI, IWorkspAceFolder | IFileStAt> {

	privAte reAdonly _pArents = new WeAkMAp<object, IWorkspAceFolder | IFileStAt>();

	constructor(
		@IFileService privAte reAdonly _fileService: IFileService,
	) { }

	hAsChildren(element: IWorkspAce | URI | IWorkspAceFolder | IFileStAt): booleAn {
		return URI.isUri(element)
			|| IWorkspAce.isIWorkspAce(element)
			|| IWorkspAceFolder.isIWorkspAceFolder(element)
			|| element.isDirectory;
	}

	getChildren(element: IWorkspAce | URI | IWorkspAceFolder | IFileStAt): Promise<(IWorkspAceFolder | IFileStAt)[]> {

		if (IWorkspAce.isIWorkspAce(element)) {
			return Promise.resolve(element.folders).then(folders => {
				for (let child of folders) {
					this._pArents.set(element, child);
				}
				return folders;
			});
		}
		let uri: URI;
		if (IWorkspAceFolder.isIWorkspAceFolder(element)) {
			uri = element.uri;
		} else if (URI.isUri(element)) {
			uri = element;
		} else {
			uri = element.resource;
		}
		return this._fileService.resolve(uri).then(stAt => {
			for (const child of stAt.children || []) {
				this._pArents.set(stAt, child);
			}
			return stAt.children || [];
		});
	}
}

clAss FileRenderer implements ITreeRenderer<IFileStAt | IWorkspAceFolder, FuzzyScore, IResourceLAbel> {

	reAdonly templAteId: string = 'FileStAt';

	constructor(
		privAte reAdonly _lAbels: ResourceLAbels,
		@IConfigurAtionService privAte reAdonly _configService: IConfigurAtionService,
	) { }


	renderTemplAte(contAiner: HTMLElement): IResourceLAbel {
		return this._lAbels.creAte(contAiner, { supportHighlights: true });
	}

	renderElement(node: ITreeNode<IWorkspAceFolder | IFileStAt, [number, number, number]>, index: number, templAteDAtA: IResourceLAbel): void {
		const fileDecorAtions = this._configService.getVAlue<{ colors: booleAn, bAdges: booleAn; }>('explorer.decorAtions');
		const { element } = node;
		let resource: URI;
		let fileKind: FileKind;
		if (IWorkspAceFolder.isIWorkspAceFolder(element)) {
			resource = element.uri;
			fileKind = FileKind.ROOT_FOLDER;
		} else {
			resource = element.resource;
			fileKind = element.isDirectory ? FileKind.FOLDER : FileKind.FILE;
		}
		templAteDAtA.setFile(resource, {
			fileKind,
			hidePAth: true,
			fileDecorAtions: fileDecorAtions,
			mAtches: creAteMAtches(node.filterDAtA),
			extrAClAsses: ['picker-item']
		});
	}

	disposeTemplAte(templAteDAtA: IResourceLAbel): void {
		templAteDAtA.dispose();
	}
}

clAss FileNAvigAtionLAbelProvider implements IKeyboArdNAvigAtionLAbelProvider<IWorkspAceFolder | IFileStAt> {

	getKeyboArdNAvigAtionLAbel(element: IWorkspAceFolder | IFileStAt): { toString(): string; } {
		return element.nAme;
	}
}

clAss FileAccessibilityProvider implements IListAccessibilityProvider<IWorkspAceFolder | IFileStAt> {

	getWidgetAriALAbel(): string {
		return locAlize('breAdcrumbs', "BreAdcrumbs");
	}

	getAriALAbel(element: IWorkspAceFolder | IFileStAt): string | null {
		return element.nAme;
	}
}

clAss FileFilter implements ITreeFilter<IWorkspAceFolder | IFileStAt> {

	privAte reAdonly _cAchedExpressions = new MAp<string, glob.PArsedExpression>();
	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		@IWorkspAceContextService privAte reAdonly _workspAceService: IWorkspAceContextService,
		@IConfigurAtionService configService: IConfigurAtionService,
	) {
		const config = BreAdcrumbsConfig.FileExcludes.bindTo(configService);
		const updAte = () => {
			_workspAceService.getWorkspAce().folders.forEAch(folder => {
				const excludesConfig = config.getVAlue({ resource: folder.uri });
				if (!excludesConfig) {
					return;
				}
				// Adjust pAtterns to be Absolute in cAse they Aren't
				// free floAting (**/)
				const AdjustedConfig: glob.IExpression = {};
				for (const pAttern in excludesConfig) {
					if (typeof excludesConfig[pAttern] !== 'booleAn') {
						continue;
					}
					let pAtternAbs = pAttern.indexOf('**/') !== 0
						? posix.join(folder.uri.pAth, pAttern)
						: pAttern;

					AdjustedConfig[pAtternAbs] = excludesConfig[pAttern];
				}
				this._cAchedExpressions.set(folder.uri.toString(), glob.pArse(AdjustedConfig));
			});
		};
		updAte();
		this._disposAbles.Add(config);
		this._disposAbles.Add(config.onDidChAnge(updAte));
		this._disposAbles.Add(_workspAceService.onDidChAngeWorkspAceFolders(updAte));
	}

	dispose(): void {
		this._disposAbles.dispose();
	}

	filter(element: IWorkspAceFolder | IFileStAt, _pArentVisibility: TreeVisibility): booleAn {
		if (IWorkspAceFolder.isIWorkspAceFolder(element)) {
			// not A file
			return true;
		}
		const folder = this._workspAceService.getWorkspAceFolder(element.resource);
		if (!folder || !this._cAchedExpressions.hAs(folder.uri.toString())) {
			// no folder or no filer
			return true;
		}

		const expression = this._cAchedExpressions.get(folder.uri.toString())!;
		return !expression(element.resource.pAth, bAsenAme(element.resource));
	}
}


export clAss FileSorter implements ITreeSorter<IFileStAt | IWorkspAceFolder> {
	compAre(A: IFileStAt | IWorkspAceFolder, b: IFileStAt | IWorkspAceFolder): number {
		if (IWorkspAceFolder.isIWorkspAceFolder(A) && IWorkspAceFolder.isIWorkspAceFolder(b)) {
			return A.index - b.index;
		}
		if ((A As IFileStAt).isDirectory === (b As IFileStAt).isDirectory) {
			// sAme type -> compAre on nAmes
			return compAreFileNAmes(A.nAme, b.nAme);
		} else if ((A As IFileStAt).isDirectory) {
			return -1;
		} else {
			return 1;
		}
	}
}

export clAss BreAdcrumbsFilePicker extends BreAdcrumbsPicker {

	constructor(
		pArent: HTMLElement,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configService: IConfigurAtionService,
		@IWorkspAceContextService privAte reAdonly _workspAceService: IWorkspAceContextService,
	) {
		super(pArent, instAntiAtionService, themeService, configService);
	}

	_creAteTree(contAiner: HTMLElement) {

		// tree icon theme speciAls
		this._treeContAiner.clAssList.Add('file-icon-themAble-tree');
		this._treeContAiner.clAssList.Add('show-file-icons');
		const onFileIconThemeChAnge = (fileIconTheme: IFileIconTheme) => {
			this._treeContAiner.clAssList.toggle('Align-icons-And-twisties', fileIconTheme.hAsFileIcons && !fileIconTheme.hAsFolderIcons);
			this._treeContAiner.clAssList.toggle('hide-Arrows', fileIconTheme.hidesExplorerArrows === true);
		};
		this._disposAbles.Add(this._themeService.onDidFileIconThemeChAnge(onFileIconThemeChAnge));
		onFileIconThemeChAnge(this._themeService.getFileIconTheme());

		const lAbels = this._instAntiAtionService.creAteInstAnce(ResourceLAbels, DEFAULT_LABELS_CONTAINER /* TODO@Jo visibility propAgAtion */);
		this._disposAbles.Add(lAbels);

		return <WorkbenchAsyncDAtATree<IWorkspAce | URI, IWorkspAceFolder | IFileStAt, FuzzyScore>>this._instAntiAtionService.creAteInstAnce(
			WorkbenchAsyncDAtATree,
			'BreAdcrumbsFilePicker',
			contAiner,
			new FileVirtuAlDelegAte(),
			[this._instAntiAtionService.creAteInstAnce(FileRenderer, lAbels)],
			this._instAntiAtionService.creAteInstAnce(FileDAtASource),
			{
				multipleSelectionSupport: fAlse,
				sorter: new FileSorter(),
				filter: this._instAntiAtionService.creAteInstAnce(FileFilter),
				identityProvider: new FileIdentityProvider(),
				keyboArdNAvigAtionLAbelProvider: new FileNAvigAtionLAbelProvider(),
				AccessibilityProvider: this._instAntiAtionService.creAteInstAnce(FileAccessibilityProvider),
				overrideStyles: {
					listBAckground: breAdcrumbsPickerBAckground
				},
			});
	}

	_setInput(element: BreAdcrumbElement): Promise<void> {
		const { uri, kind } = (element As FileElement);
		let input: IWorkspAce | URI;
		if (kind === FileKind.ROOT_FOLDER) {
			input = this._workspAceService.getWorkspAce();
		} else {
			input = dirnAme(uri);
		}

		const tree = this._tree As WorkbenchAsyncDAtATree<IWorkspAce | URI, IWorkspAceFolder | IFileStAt, FuzzyScore>;
		return tree.setInput(input).then(() => {
			let focusElement: IWorkspAceFolder | IFileStAt | undefined;
			for (const { element } of tree.getNode().children) {
				if (IWorkspAceFolder.isIWorkspAceFolder(element) && isEquAl(element.uri, uri)) {
					focusElement = element;
					breAk;
				} else if (isEquAl((element As IFileStAt).resource, uri)) {
					focusElement = element As IFileStAt;
					breAk;
				}
			}
			if (focusElement) {
				tree.reveAl(focusElement, 0.5);
				tree.setFocus([focusElement], this._fAkeEvent);
			}
			tree.domFocus();
		});
	}

	protected _getTArgetFromEvent(element: Any): Any | undefined {
		// todo@joh
		if (element && !IWorkspAceFolder.isIWorkspAceFolder(element) && !(element As IFileStAt).isDirectory) {
			return new FileElement((element As IFileStAt).resource, FileKind.FILE);
		}
	}
}
//#endregion

//#region - Symbols

export clAss BreAdcrumbsOutlinePicker extends BreAdcrumbsPicker {

	protected reAdonly _symbolSortOrder: BreAdcrumbsConfig<'position' | 'nAme' | 'type'>;
	protected _outlineCompArAtor: OutlineItemCompArAtor;

	constructor(
		pArent: HTMLElement,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IModeService privAte reAdonly _modeService: IModeService,
	) {
		super(pArent, instAntiAtionService, themeService, configurAtionService);
		this._symbolSortOrder = BreAdcrumbsConfig.SymbolSortOrder.bindTo(this._configurAtionService);
		this._outlineCompArAtor = new OutlineItemCompArAtor();
	}

	protected _creAteTree(contAiner: HTMLElement) {
		return <WorkbenchDAtATree<OutlineModel, Any, FuzzyScore>>this._instAntiAtionService.creAteInstAnce(
			WorkbenchDAtATree,
			'BreAdcrumbsOutlinePicker',
			contAiner,
			new OutlineVirtuAlDelegAte(),
			[new OutlineGroupRenderer(), this._instAntiAtionService.creAteInstAnce(OutlineElementRenderer)],
			new OutlineDAtASource(),
			{
				collApseByDefAult: true,
				expAndOnlyOnTwistieClick: true,
				multipleSelectionSupport: fAlse,
				sorter: this._outlineCompArAtor,
				identityProvider: new OutlineIdentityProvider(),
				keyboArdNAvigAtionLAbelProvider: new OutlineNAvigAtionLAbelProvider(),
				AccessibilityProvider: new OutlineAccessibilityProvider(locAlize('breAdcrumbs', "BreAdcrumbs")),
				filter: this._instAntiAtionService.creAteInstAnce(OutlineFilter, 'breAdcrumbs')
			}
		);
	}

	dispose(): void {
		this._symbolSortOrder.dispose();
		super.dispose();
	}

	protected _setInput(input: BreAdcrumbElement): Promise<void> {
		const element = input As TreeElement;
		const model = OutlineModel.get(element)!;
		const tree = this._tree As WorkbenchDAtATree<OutlineModel, Any, FuzzyScore>;

		const overrideConfigurAtion = {
			resource: model.uri,
			overrideIdentifier: this._modeService.getModeIdByFilepAthOrFirstLine(model.uri)
		};
		this._outlineCompArAtor.type = this._getOutlineItemCompAreType(overrideConfigurAtion);

		tree.setInput(model);
		if (element !== model) {
			tree.reveAl(element, 0.5);
			tree.setFocus([element], this._fAkeEvent);
		}
		tree.domFocus();

		return Promise.resolve();
	}

	protected _getTArgetFromEvent(element: Any): Any | undefined {
		if (element instAnceof OutlineElement) {
			return element;
		}
	}

	privAte _getOutlineItemCompAreType(overrideConfigurAtion?: IConfigurAtionOverrides): OutlineSortOrder {
		switch (this._symbolSortOrder.getVAlue(overrideConfigurAtion)) {
			cAse 'nAme':
				return OutlineSortOrder.ByNAme;
			cAse 'type':
				return OutlineSortOrder.ByKind;
			cAse 'position':
			defAult:
				return OutlineSortOrder.ByPosition;
		}
	}
}

//#endregion
