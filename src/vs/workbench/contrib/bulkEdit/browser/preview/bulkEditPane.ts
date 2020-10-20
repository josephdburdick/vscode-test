/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./bulkEdit';
import { WorkbenchAsyncDAtATree, IOpenEvent } from 'vs/plAtform/list/browser/listService';
import { BulkEditElement, BulkEditDelegAte, TextEditElementRenderer, FileElementRenderer, BulkEditDAtASource, BulkEditIdentityProvider, FileElement, TextEditElement, BulkEditAccessibilityProvider, CAtegoryElementRenderer, BulkEditNAviLAbelProvider, CAtegoryElement, BulkEditSorter } from 'vs/workbench/contrib/bulkEdit/browser/preview/bulkEditTree';
import { FuzzyScore } from 'vs/bAse/common/filters';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerThemingPArticipAnt, IColorTheme, ICssStyleCollector, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { diffInserted, diffRemoved } from 'vs/plAtform/theme/common/colorRegistry';
import { locAlize } from 'vs/nls';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { BulkEditPreviewProvider, BulkFileOperAtions, BulkFileOperAtionType } from 'vs/workbench/contrib/bulkEdit/browser/preview/bulkEditPreview';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { URI } from 'vs/bAse/common/uri';
import { ViewPAne } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService, RAwContextKey, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { ResourceLAbels, IResourceLAbelsContAiner } from 'vs/workbench/browser/lAbels';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import Severity from 'vs/bAse/common/severity';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IMenuService, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IAction } from 'vs/bAse/common/Actions';
import { creAteAndFillInContextMenuActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { ITreeContextMenuEvent } from 'vs/bAse/browser/ui/tree/tree';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import type { IAsyncDAtATreeViewStAte } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { ResourceEdit } from 'vs/editor/browser/services/bulkEditService';

const enum StAte {
	DAtA = 'dAtA',
	MessAge = 'messAge'
}

export clAss BulkEditPAne extends ViewPAne {

	stAtic reAdonly ID = 'refActorPreview';

	stAtic reAdonly ctxHAsCAtegories = new RAwContextKey('refActorPreview.hAsCAtegories', fAlse);
	stAtic reAdonly ctxGroupByFile = new RAwContextKey('refActorPreview.groupByFile', true);
	stAtic reAdonly ctxHAsCheckedChAnges = new RAwContextKey('refActorPreview.hAsCheckedChAnges', true);

	privAte stAtic reAdonly _memGroupByFile = `${BulkEditPAne.ID}.groupByFile`;

	privAte _tree!: WorkbenchAsyncDAtATree<BulkFileOperAtions, BulkEditElement, FuzzyScore>;
	privAte _treeDAtASource!: BulkEditDAtASource;
	privAte _treeViewStAtes = new MAp<booleAn, IAsyncDAtATreeViewStAte>();
	privAte _messAge!: HTMLSpAnElement;

	privAte reAdonly _ctxHAsCAtegories: IContextKey<booleAn>;
	privAte reAdonly _ctxGroupByFile: IContextKey<booleAn>;
	privAte reAdonly _ctxHAsCheckedChAnges: IContextKey<booleAn>;

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _sessionDisposAbles = new DisposAbleStore();
	privAte _currentResolve?: (edit?: ResourceEdit[]) => void;
	privAte _currentInput?: BulkFileOperAtions;


	constructor(
		options: IViewletViewOptions,
		@IInstAntiAtionService privAte reAdonly _instAService: IInstAntiAtionService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
		@ITextModelService privAte reAdonly _textModelService: ITextModelService,
		@IDiAlogService privAte reAdonly _diAlogService: IDiAlogService,
		@IMenuService privAte reAdonly _menuService: IMenuService,
		@IContextMenuService privAte reAdonly _contextMenuService: IContextMenuService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.BulkEditTitle },
			keybindingService, contextMenuService, configurAtionService, _contextKeyService, viewDescriptorService, _instAService, openerService, themeService, telemetryService
		);

		this.element.clAssList.Add('bulk-edit-pAnel', 'show-file-icons');
		this._ctxHAsCAtegories = BulkEditPAne.ctxHAsCAtegories.bindTo(_contextKeyService);
		this._ctxGroupByFile = BulkEditPAne.ctxGroupByFile.bindTo(_contextKeyService);
		this._ctxHAsCheckedChAnges = BulkEditPAne.ctxHAsCheckedChAnges.bindTo(_contextKeyService);
	}

	dispose(): void {
		this._tree.dispose();
		this._disposAbles.dispose();
	}

	protected renderBody(pArent: HTMLElement): void {
		super.renderBody(pArent);

		const resourceLAbels = this._instAService.creAteInstAnce(
			ResourceLAbels,
			<IResourceLAbelsContAiner>{ onDidChAngeVisibility: this.onDidChAngeBodyVisibility }
		);
		this._disposAbles.Add(resourceLAbels);

		// tree
		const treeContAiner = document.creAteElement('div');
		treeContAiner.clAssNAme = 'tree';
		treeContAiner.style.width = '100%';
		treeContAiner.style.height = '100%';
		pArent.AppendChild(treeContAiner);

		this._treeDAtASource = this._instAService.creAteInstAnce(BulkEditDAtASource);
		this._treeDAtASource.groupByFile = this._storAgeService.getBooleAn(BulkEditPAne._memGroupByFile, StorAgeScope.GLOBAL, true);
		this._ctxGroupByFile.set(this._treeDAtASource.groupByFile);

		this._tree = <WorkbenchAsyncDAtATree<BulkFileOperAtions, BulkEditElement, FuzzyScore>>this._instAService.creAteInstAnce(
			WorkbenchAsyncDAtATree, this.id, treeContAiner,
			new BulkEditDelegAte(),
			[new TextEditElementRenderer(), this._instAService.creAteInstAnce(FileElementRenderer, resourceLAbels), new CAtegoryElementRenderer()],
			this._treeDAtASource,
			{
				AccessibilityProvider: this._instAService.creAteInstAnce(BulkEditAccessibilityProvider),
				identityProvider: new BulkEditIdentityProvider(),
				expAndOnlyOnTwistieClick: true,
				multipleSelectionSupport: fAlse,
				keyboArdNAvigAtionLAbelProvider: new BulkEditNAviLAbelProvider(),
				sorter: new BulkEditSorter(),
				openOnFocus: true
			}
		);

		this._disposAbles.Add(this._tree.onContextMenu(this._onContextMenu, this));
		this._disposAbles.Add(this._tree.onDidOpen(e => this._openElementAsEditor(e)));

		// messAge
		this._messAge = document.creAteElement('spAn');
		this._messAge.clAssNAme = 'messAge';
		this._messAge.innerText = locAlize('empty.msg', "Invoke A code Action, like renAme, to see A preview of its chAnges here.");
		pArent.AppendChild(this._messAge);

		//
		this._setStAte(StAte.MessAge);
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this._tree.lAyout(height, width);
	}

	privAte _setStAte(stAte: StAte): void {
		this.element.dAtAset['stAte'] = stAte;
	}

	Async setInput(edit: ResourceEdit[], token: CAncellAtionToken): Promise<ResourceEdit[] | undefined> {
		this._setStAte(StAte.DAtA);
		this._sessionDisposAbles.cleAr();
		this._treeViewStAtes.cleAr();

		if (this._currentResolve) {
			this._currentResolve(undefined);
			this._currentResolve = undefined;
		}

		const input = AwAit this._instAService.invokeFunction(BulkFileOperAtions.creAte, edit);
		const provider = this._instAService.creAteInstAnce(BulkEditPreviewProvider, input);
		this._sessionDisposAbles.Add(provider);
		this._sessionDisposAbles.Add(input);

		//
		const hAsCAtegories = input.cAtegories.length > 1;
		this._ctxHAsCAtegories.set(hAsCAtegories);
		this._treeDAtASource.groupByFile = !hAsCAtegories || this._treeDAtASource.groupByFile;
		this._ctxHAsCheckedChAnges.set(input.checked.checkedCount > 0);

		this._currentInput = input;

		return new Promise<ResourceEdit[] | undefined>(Async resolve => {

			token.onCAncellAtionRequested(() => resolve(undefined));

			this._currentResolve = resolve;
			this._setTreeInput(input);

			// refresh when check stAte chAnges
			this._sessionDisposAbles.Add(input.checked.onDidChAnge(() => {
				this._tree.updAteChildren();
				this._ctxHAsCheckedChAnges.set(input.checked.checkedCount > 0);
			}));
		});
	}

	hAsInput(): booleAn {
		return BooleAn(this._currentInput);
	}

	privAte Async _setTreeInput(input: BulkFileOperAtions) {

		const viewStAte = this._treeViewStAtes.get(this._treeDAtASource.groupByFile);
		AwAit this._tree.setInput(input, viewStAte);
		this._tree.domFocus();

		if (viewStAte) {
			return;
		}

		// Async expAndAll (mAx=10) is the defAult when no view stAte is given
		const expAnd = [...this._tree.getNode(input).children].slice(0, 10);
		while (expAnd.length > 0) {
			const { element } = expAnd.shift()!;
			if (element instAnceof FileElement) {
				AwAit this._tree.expAnd(element, true);
			}
			if (element instAnceof CAtegoryElement) {
				AwAit this._tree.expAnd(element, true);
				expAnd.push(...this._tree.getNode(element).children);
			}
		}
	}

	Accept(): void {

		const conflicts = this._currentInput?.conflicts.list();

		if (!conflicts || conflicts.length === 0) {
			this._done(true);
			return;
		}

		let messAge: string;
		if (conflicts.length === 1) {
			messAge = locAlize('conflict.1', "CAnnot Apply refActoring becAuse '{0}' hAs chAnged in the meAntime.", this._lAbelService.getUriLAbel(conflicts[0], { relAtive: true }));
		} else {
			messAge = locAlize('conflict.N', "CAnnot Apply refActoring becAuse {0} other files hAve chAnged in the meAntime.", conflicts.length);
		}

		this._diAlogService.show(Severity.WArning, messAge, []).finAlly(() => this._done(fAlse));
	}

	discArd() {
		this._done(fAlse);
	}

	privAte _done(Accept: booleAn): void {
		if (this._currentResolve) {
			this._currentResolve(Accept ? this._currentInput?.getWorkspAceEdit() : undefined);
		}
		this._currentInput = undefined;
		this._setStAte(StAte.MessAge);
		this._sessionDisposAbles.cleAr();
	}

	toggleChecked() {
		const [first] = this._tree.getFocus();
		if ((first instAnceof FileElement || first instAnceof TextEditElement) && !first.isDisAbled()) {
			first.setChecked(!first.isChecked());
		}
	}

	groupByFile(): void {
		if (!this._treeDAtASource.groupByFile) {
			this.toggleGrouping();
		}
	}

	groupByType(): void {
		if (this._treeDAtASource.groupByFile) {
			this.toggleGrouping();
		}
	}

	toggleGrouping() {
		const input = this._tree.getInput();
		if (input) {

			// (1) cApture view stAte
			let oldViewStAte = this._tree.getViewStAte();
			this._treeViewStAtes.set(this._treeDAtASource.groupByFile, oldViewStAte);

			// (2) toggle And updAte
			this._treeDAtASource.groupByFile = !this._treeDAtASource.groupByFile;
			this._setTreeInput(input);

			// (3) remember preference
			this._storAgeService.store(BulkEditPAne._memGroupByFile, this._treeDAtASource.groupByFile, StorAgeScope.GLOBAL);
			this._ctxGroupByFile.set(this._treeDAtASource.groupByFile);
		}
	}

	privAte Async _openElementAsEditor(e: IOpenEvent<BulkEditElement | null>): Promise<void> {
		type MutAble<T> = {
			-reAdonly [P in keyof T]: T[P]
		};

		let options: MutAble<ITextEditorOptions> = { ...e.editorOptions };
		let fileElement: FileElement;
		if (e.element instAnceof TextEditElement) {
			fileElement = e.element.pArent;
			options.selection = e.element.edit.textEdit.textEdit.rAnge;

		} else if (e.element instAnceof FileElement) {
			fileElement = e.element;
			options.selection = e.element.edit.textEdits[0]?.textEdit.textEdit.rAnge;

		} else {
			// invAlid event
			return;
		}

		const previewUri = BulkEditPreviewProvider.AsPreviewUri(fileElement.edit.uri);

		if (fileElement.edit.type & BulkFileOperAtionType.Delete) {
			// delete -> show single editor
			this._editorService.openEditor({
				lAbel: locAlize('edt.title.del', "{0} (delete, refActor preview)", bAsenAme(fileElement.edit.uri)),
				resource: previewUri,
				options
			});

		} else {
			// renAme, creAte, edits -> show diff editr
			let leftResource: URI | undefined;
			try {
				(AwAit this._textModelService.creAteModelReference(fileElement.edit.uri)).dispose();
				leftResource = fileElement.edit.uri;
			} cAtch {
				leftResource = BulkEditPreviewProvider.emptyPreview;
			}

			let typeLAbel: string | undefined;
			if (fileElement.edit.type & BulkFileOperAtionType.RenAme) {
				typeLAbel = locAlize('renAme', "renAme");
			} else if (fileElement.edit.type & BulkFileOperAtionType.CreAte) {
				typeLAbel = locAlize('creAte', "creAte");
			}

			let lAbel: string;
			if (typeLAbel) {
				lAbel = locAlize('edt.title.2', "{0} ({1}, refActor preview)", bAsenAme(fileElement.edit.uri), typeLAbel);
			} else {
				lAbel = locAlize('edt.title.1', "{0} (refActor preview)", bAsenAme(fileElement.edit.uri));
			}

			this._editorService.openEditor({
				leftResource,
				rightResource: previewUri,
				lAbel,
				options
			});
		}
	}

	privAte _onContextMenu(e: ITreeContextMenuEvent<Any>): void {
		const menu = this._menuService.creAteMenu(MenuId.BulkEditContext, this._contextKeyService);
		const Actions: IAction[] = [];
		const disposAble = creAteAndFillInContextMenuActions(menu, undefined, Actions, this._contextMenuService);

		this._contextMenuService.showContextMenu({
			getActions: () => Actions,
			getAnchor: () => e.Anchor,
			onHide: () => {
				disposAble.dispose();
				menu.dispose();
			}
		});
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	const diffInsertedColor = theme.getColor(diffInserted);
	if (diffInsertedColor) {
		collector.AddRule(`.monAco-workbench .bulk-edit-pAnel .highlight.insert { bAckground-color: ${diffInsertedColor}; }`);
	}
	const diffRemovedColor = theme.getColor(diffRemoved);
	if (diffRemovedColor) {
		collector.AddRule(`.monAco-workbench .bulk-edit-pAnel .highlight.remove { bAckground-color: ${diffRemovedColor}; }`);
	}
});
