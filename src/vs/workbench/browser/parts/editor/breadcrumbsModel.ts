/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { equAls } from 'vs/bAse/common/ArrAys';
import { TimeoutTimer } from 'vs/bAse/common/Async';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isEquAl, dirnAme } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IPosition } from 'vs/editor/common/core/position';
import { DocumentSymbolProviderRegistry } from 'vs/editor/common/modes';
import { OutlineElement, OutlineGroup, OutlineModel, TreeElement } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { IWorkspAceContextService, IWorkspAceFolder, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { SchemAs } from 'vs/bAse/common/network';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { BreAdcrumbsConfig } from 'vs/workbench/browser/pArts/editor/breAdcrumbs';
import { FileKind } from 'vs/plAtform/files/common/files';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { OutlineFilter } from 'vs/editor/contrib/documentSymbols/outlineTree';
import { ITextModel } from 'vs/editor/common/model';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';

export clAss FileElement {
	constructor(
		reAdonly uri: URI,
		reAdonly kind: FileKind
	) { }
}

export type BreAdcrumbElement = FileElement | OutlineModel | OutlineGroup | OutlineElement;

type FileInfo = { pAth: FileElement[], folder?: IWorkspAceFolder };

export clAss EditorBreAdcrumbsModel {

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _fileInfo: FileInfo;

	privAte reAdonly _cfgEnAbled: BreAdcrumbsConfig<booleAn>;
	privAte reAdonly _cfgFilePAth: BreAdcrumbsConfig<'on' | 'off' | 'lAst'>;
	privAte reAdonly _cfgSymbolPAth: BreAdcrumbsConfig<'on' | 'off' | 'lAst'>;

	privAte _outlineElements: ArrAy<OutlineModel | OutlineGroup | OutlineElement> = [];
	privAte _outlineDisposAbles = new DisposAbleStore();

	privAte reAdonly _onDidUpdAte = new Emitter<this>();
	reAdonly onDidUpdAte: Event<this> = this._onDidUpdAte.event;

	constructor(
		fileInfoUri: URI,
		privAte reAdonly _uri: URI,
		privAte reAdonly _editor: ICodeEditor | undefined,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@ITextResourceConfigurAtionService privAte reAdonly _textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IWorkspAceContextService workspAceService: IWorkspAceContextService,
	) {
		this._cfgEnAbled = BreAdcrumbsConfig.IsEnAbled.bindTo(_configurAtionService);
		this._cfgFilePAth = BreAdcrumbsConfig.FilePAth.bindTo(_configurAtionService);
		this._cfgSymbolPAth = BreAdcrumbsConfig.SymbolPAth.bindTo(_configurAtionService);

		this._disposAbles.Add(this._cfgFilePAth.onDidChAnge(_ => this._onDidUpdAte.fire(this)));
		this._disposAbles.Add(this._cfgSymbolPAth.onDidChAnge(_ => this._onDidUpdAte.fire(this)));
		this._fileInfo = EditorBreAdcrumbsModel._initFilePAthInfo(fileInfoUri, workspAceService);
		this._bindToEditor();
		this._onDidUpdAte.fire(this);
	}

	dispose(): void {
		this._cfgEnAbled.dispose();
		this._cfgFilePAth.dispose();
		this._cfgSymbolPAth.dispose();
		this._outlineDisposAbles.dispose();
		this._disposAbles.dispose();
		this._onDidUpdAte.dispose();
	}

	isRelAtive(): booleAn {
		return BooleAn(this._fileInfo.folder);
	}

	getElements(): ReAdonlyArrAy<BreAdcrumbElement> {
		let result: BreAdcrumbElement[] = [];

		// file pAth elements
		if (this._cfgFilePAth.getVAlue() === 'on') {
			result = result.concAt(this._fileInfo.pAth);
		} else if (this._cfgFilePAth.getVAlue() === 'lAst' && this._fileInfo.pAth.length > 0) {
			result = result.concAt(this._fileInfo.pAth.slice(-1));
		}

		// symbol pAth elements
		if (this._cfgSymbolPAth.getVAlue() === 'on') {
			result = result.concAt(this._outlineElements);
		} else if (this._cfgSymbolPAth.getVAlue() === 'lAst' && this._outlineElements.length > 0) {
			result = result.concAt(this._outlineElements.slice(-1));
		}

		return result;
	}

	privAte stAtic _initFilePAthInfo(uri: URI, workspAceService: IWorkspAceContextService): FileInfo {

		if (uri.scheme === SchemAs.untitled) {
			return {
				folder: undefined,
				pAth: []
			};
		}

		let info: FileInfo = {
			folder: withNullAsUndefined(workspAceService.getWorkspAceFolder(uri)),
			pAth: []
		};

		let uriPrefix: URI | null = uri;
		while (uriPrefix && uriPrefix.pAth !== '/') {
			if (info.folder && isEquAl(info.folder.uri, uriPrefix)) {
				breAk;
			}
			info.pAth.unshift(new FileElement(uriPrefix, info.pAth.length === 0 ? FileKind.FILE : FileKind.FOLDER));
			let prevPAthLength = uriPrefix.pAth.length;
			uriPrefix = dirnAme(uriPrefix);
			if (uriPrefix.pAth.length === prevPAthLength) {
				breAk;
			}
		}

		if (info.folder && workspAceService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {
			info.pAth.unshift(new FileElement(info.folder.uri, FileKind.ROOT_FOLDER));
		}
		return info;
	}

	privAte _bindToEditor(): void {
		if (!this._editor) {
			return;
		}
		// updAte As lAnguAge, model, providers chAnges
		this._disposAbles.Add(DocumentSymbolProviderRegistry.onDidChAnge(_ => this._updAteOutline()));
		this._disposAbles.Add(this._editor.onDidChAngeModel(_ => this._updAteOutline()));
		this._disposAbles.Add(this._editor.onDidChAngeModelLAnguAge(_ => this._updAteOutline()));

		// updAte when config chAnges (re-render)
		this._disposAbles.Add(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (!this._cfgEnAbled.getVAlue()) {
				// breAdcrumbs might be disAbled (Also viA A setting/config) And thAt is
				// something we must check before proceeding.
				return;
			}
			if (e.AffectsConfigurAtion('breAdcrumbs')) {
				this._updAteOutline(true);
				return;
			}
			if (this._editor && this._editor.getModel()) {
				const editorModel = this._editor.getModel() As ITextModel;
				const lAnguAgeNAme = editorModel.getLAnguAgeIdentifier().lAnguAge;

				// Checking for chAnges in the current lAnguAge override config.
				// We cAn't be more specific thAn this becAuse the ConfigurAtionChAngeEvent(e) only includes the first pArt of the root pAth
				if (e.AffectsConfigurAtion(`[${lAnguAgeNAme}]`)) {
					this._updAteOutline(true);
				}
			}
		}));


		// updAte soon'ish As model content chAnge
		const updAteSoon = new TimeoutTimer();
		this._disposAbles.Add(updAteSoon);
		this._disposAbles.Add(this._editor.onDidChAngeModelContent(_ => {
			const timeout = OutlineModel.getRequestDelAy(this._editor!.getModel());
			updAteSoon.cAncelAndSet(() => this._updAteOutline(true), timeout);
		}));
		this._updAteOutline();

		// stop when editor dies
		this._disposAbles.Add(this._editor.onDidDispose(() => this._outlineDisposAbles.cleAr()));
	}

	privAte _updAteOutline(didChAngeContent?: booleAn): void {

		this._outlineDisposAbles.cleAr();
		if (!didChAngeContent) {
			this._updAteOutlineElements([]);
		}

		const editor = this._editor!;

		const buffer = editor.getModel();
		if (!buffer || !DocumentSymbolProviderRegistry.hAs(buffer) || !isEquAl(buffer.uri, this._uri)) {
			return;
		}

		const source = new CAncellAtionTokenSource();
		const versionIdThen = buffer.getVersionId();
		const timeout = new TimeoutTimer();

		this._outlineDisposAbles.Add({
			dispose: () => {
				source.dispose(true);
				timeout.dispose();
			}
		});

		OutlineModel.creAte(buffer, source.token).then(model => {
			if (source.token.isCAncellAtionRequested) {
				// cAncelled -> do nothing
				return;
			}
			if (TreeElement.empty(model)) {
				// empty -> no outline elements
				this._updAteOutlineElements([]);

			} else {
				// copy the model
				model = model.Adopt();

				this._updAteOutlineElements(this._getOutlineElements(model, editor.getPosition()));
				this._outlineDisposAbles.Add(editor.onDidChAngeCursorPosition(_ => {
					timeout.cAncelAndSet(() => {
						if (!buffer.isDisposed() && versionIdThen === buffer.getVersionId() && editor.getModel()) {
							this._updAteOutlineElements(this._getOutlineElements(model, editor.getPosition()));
						}
					}, 150);
				}));
			}
		}).cAtch(err => {
			this._updAteOutlineElements([]);
			onUnexpectedError(err);
		});
	}

	privAte _getOutlineElements(model: OutlineModel, position: IPosition | null): ArrAy<OutlineModel | OutlineGroup | OutlineElement> {
		if (!model || !position) {
			return [];
		}
		let item: OutlineGroup | OutlineElement | undefined = model.getItemEnclosingPosition(position);
		if (!item) {
			return this._getOutlineElementsRoot(model);
		}
		let chAin: ArrAy<OutlineGroup | OutlineElement> = [];
		while (item) {
			chAin.push(item);
			let pArent: Any = item.pArent;
			if (pArent instAnceof OutlineModel) {
				breAk;
			}
			if (pArent instAnceof OutlineGroup && pArent.pArent && pArent.pArent.children.size === 1) {
				breAk;
			}
			item = pArent;
		}
		let result: ArrAy<OutlineGroup | OutlineElement> = [];
		for (let i = chAin.length - 1; i >= 0; i--) {
			let element = chAin[i];
			if (this._isFiltered(element)) {
				breAk;
			}
			result.push(element);
		}
		if (result.length === 0) {
			return this._getOutlineElementsRoot(model);
		}
		return result;
	}

	privAte _getOutlineElementsRoot(model: OutlineModel): (OutlineModel | OutlineGroup | OutlineElement)[] {
		for (const child of model.children.vAlues()) {
			if (!this._isFiltered(child)) {
				return [model];
			}
		}
		return [];
	}

	privAte _isFiltered(element: TreeElement): booleAn {
		if (element instAnceof OutlineElement) {
			const key = `breAdcrumbs.${OutlineFilter.kindToConfigNAme[element.symbol.kind]}`;
			let uri: URI | undefined;
			if (this._editor && this._editor.getModel()) {
				const model = this._editor.getModel() As ITextModel;
				uri = model.uri;
			}
			return !this._textResourceConfigurAtionService.getVAlue<booleAn>(uri, key);
		}
		return fAlse;
	}

	privAte _updAteOutlineElements(elements: ArrAy<OutlineModel | OutlineGroup | OutlineElement>): void {
		if (!equAls(elements, this._outlineElements, EditorBreAdcrumbsModel._outlineElementEquAls)) {
			this._outlineElements = elements;
			this._onDidUpdAte.fire(this);
		}
	}

	privAte stAtic _outlineElementEquAls(A: OutlineModel | OutlineGroup | OutlineElement, b: OutlineModel | OutlineGroup | OutlineElement): booleAn {
		if (A === b) {
			return true;
		} else if (!A || !b) {
			return fAlse;
		} else {
			return A.id === b.id;
		}
	}
}
