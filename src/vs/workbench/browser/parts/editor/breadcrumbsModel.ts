/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { equals } from 'vs/Base/common/arrays';
import { TimeoutTimer } from 'vs/Base/common/async';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isEqual, dirname } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IPosition } from 'vs/editor/common/core/position';
import { DocumentSymBolProviderRegistry } from 'vs/editor/common/modes';
import { OutlineElement, OutlineGroup, OutlineModel, TreeElement } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { IWorkspaceContextService, IWorkspaceFolder, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { Schemas } from 'vs/Base/common/network';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { BreadcrumBsConfig } from 'vs/workBench/Browser/parts/editor/BreadcrumBs';
import { FileKind } from 'vs/platform/files/common/files';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { OutlineFilter } from 'vs/editor/contriB/documentSymBols/outlineTree';
import { ITextModel } from 'vs/editor/common/model';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';

export class FileElement {
	constructor(
		readonly uri: URI,
		readonly kind: FileKind
	) { }
}

export type BreadcrumBElement = FileElement | OutlineModel | OutlineGroup | OutlineElement;

type FileInfo = { path: FileElement[], folder?: IWorkspaceFolder };

export class EditorBreadcrumBsModel {

	private readonly _disposaBles = new DisposaBleStore();
	private readonly _fileInfo: FileInfo;

	private readonly _cfgEnaBled: BreadcrumBsConfig<Boolean>;
	private readonly _cfgFilePath: BreadcrumBsConfig<'on' | 'off' | 'last'>;
	private readonly _cfgSymBolPath: BreadcrumBsConfig<'on' | 'off' | 'last'>;

	private _outlineElements: Array<OutlineModel | OutlineGroup | OutlineElement> = [];
	private _outlineDisposaBles = new DisposaBleStore();

	private readonly _onDidUpdate = new Emitter<this>();
	readonly onDidUpdate: Event<this> = this._onDidUpdate.event;

	constructor(
		fileInfoUri: URI,
		private readonly _uri: URI,
		private readonly _editor: ICodeEditor | undefined,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ITextResourceConfigurationService private readonly _textResourceConfigurationService: ITextResourceConfigurationService,
		@IWorkspaceContextService workspaceService: IWorkspaceContextService,
	) {
		this._cfgEnaBled = BreadcrumBsConfig.IsEnaBled.BindTo(_configurationService);
		this._cfgFilePath = BreadcrumBsConfig.FilePath.BindTo(_configurationService);
		this._cfgSymBolPath = BreadcrumBsConfig.SymBolPath.BindTo(_configurationService);

		this._disposaBles.add(this._cfgFilePath.onDidChange(_ => this._onDidUpdate.fire(this)));
		this._disposaBles.add(this._cfgSymBolPath.onDidChange(_ => this._onDidUpdate.fire(this)));
		this._fileInfo = EditorBreadcrumBsModel._initFilePathInfo(fileInfoUri, workspaceService);
		this._BindToEditor();
		this._onDidUpdate.fire(this);
	}

	dispose(): void {
		this._cfgEnaBled.dispose();
		this._cfgFilePath.dispose();
		this._cfgSymBolPath.dispose();
		this._outlineDisposaBles.dispose();
		this._disposaBles.dispose();
		this._onDidUpdate.dispose();
	}

	isRelative(): Boolean {
		return Boolean(this._fileInfo.folder);
	}

	getElements(): ReadonlyArray<BreadcrumBElement> {
		let result: BreadcrumBElement[] = [];

		// file path elements
		if (this._cfgFilePath.getValue() === 'on') {
			result = result.concat(this._fileInfo.path);
		} else if (this._cfgFilePath.getValue() === 'last' && this._fileInfo.path.length > 0) {
			result = result.concat(this._fileInfo.path.slice(-1));
		}

		// symBol path elements
		if (this._cfgSymBolPath.getValue() === 'on') {
			result = result.concat(this._outlineElements);
		} else if (this._cfgSymBolPath.getValue() === 'last' && this._outlineElements.length > 0) {
			result = result.concat(this._outlineElements.slice(-1));
		}

		return result;
	}

	private static _initFilePathInfo(uri: URI, workspaceService: IWorkspaceContextService): FileInfo {

		if (uri.scheme === Schemas.untitled) {
			return {
				folder: undefined,
				path: []
			};
		}

		let info: FileInfo = {
			folder: withNullAsUndefined(workspaceService.getWorkspaceFolder(uri)),
			path: []
		};

		let uriPrefix: URI | null = uri;
		while (uriPrefix && uriPrefix.path !== '/') {
			if (info.folder && isEqual(info.folder.uri, uriPrefix)) {
				Break;
			}
			info.path.unshift(new FileElement(uriPrefix, info.path.length === 0 ? FileKind.FILE : FileKind.FOLDER));
			let prevPathLength = uriPrefix.path.length;
			uriPrefix = dirname(uriPrefix);
			if (uriPrefix.path.length === prevPathLength) {
				Break;
			}
		}

		if (info.folder && workspaceService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			info.path.unshift(new FileElement(info.folder.uri, FileKind.ROOT_FOLDER));
		}
		return info;
	}

	private _BindToEditor(): void {
		if (!this._editor) {
			return;
		}
		// update as language, model, providers changes
		this._disposaBles.add(DocumentSymBolProviderRegistry.onDidChange(_ => this._updateOutline()));
		this._disposaBles.add(this._editor.onDidChangeModel(_ => this._updateOutline()));
		this._disposaBles.add(this._editor.onDidChangeModelLanguage(_ => this._updateOutline()));

		// update when config changes (re-render)
		this._disposaBles.add(this._configurationService.onDidChangeConfiguration(e => {
			if (!this._cfgEnaBled.getValue()) {
				// BreadcrumBs might Be disaBled (also via a setting/config) and that is
				// something we must check Before proceeding.
				return;
			}
			if (e.affectsConfiguration('BreadcrumBs')) {
				this._updateOutline(true);
				return;
			}
			if (this._editor && this._editor.getModel()) {
				const editorModel = this._editor.getModel() as ITextModel;
				const languageName = editorModel.getLanguageIdentifier().language;

				// Checking for changes in the current language override config.
				// We can't Be more specific than this Because the ConfigurationChangeEvent(e) only includes the first part of the root path
				if (e.affectsConfiguration(`[${languageName}]`)) {
					this._updateOutline(true);
				}
			}
		}));


		// update soon'ish as model content change
		const updateSoon = new TimeoutTimer();
		this._disposaBles.add(updateSoon);
		this._disposaBles.add(this._editor.onDidChangeModelContent(_ => {
			const timeout = OutlineModel.getRequestDelay(this._editor!.getModel());
			updateSoon.cancelAndSet(() => this._updateOutline(true), timeout);
		}));
		this._updateOutline();

		// stop when editor dies
		this._disposaBles.add(this._editor.onDidDispose(() => this._outlineDisposaBles.clear()));
	}

	private _updateOutline(didChangeContent?: Boolean): void {

		this._outlineDisposaBles.clear();
		if (!didChangeContent) {
			this._updateOutlineElements([]);
		}

		const editor = this._editor!;

		const Buffer = editor.getModel();
		if (!Buffer || !DocumentSymBolProviderRegistry.has(Buffer) || !isEqual(Buffer.uri, this._uri)) {
			return;
		}

		const source = new CancellationTokenSource();
		const versionIdThen = Buffer.getVersionId();
		const timeout = new TimeoutTimer();

		this._outlineDisposaBles.add({
			dispose: () => {
				source.dispose(true);
				timeout.dispose();
			}
		});

		OutlineModel.create(Buffer, source.token).then(model => {
			if (source.token.isCancellationRequested) {
				// cancelled -> do nothing
				return;
			}
			if (TreeElement.empty(model)) {
				// empty -> no outline elements
				this._updateOutlineElements([]);

			} else {
				// copy the model
				model = model.adopt();

				this._updateOutlineElements(this._getOutlineElements(model, editor.getPosition()));
				this._outlineDisposaBles.add(editor.onDidChangeCursorPosition(_ => {
					timeout.cancelAndSet(() => {
						if (!Buffer.isDisposed() && versionIdThen === Buffer.getVersionId() && editor.getModel()) {
							this._updateOutlineElements(this._getOutlineElements(model, editor.getPosition()));
						}
					}, 150);
				}));
			}
		}).catch(err => {
			this._updateOutlineElements([]);
			onUnexpectedError(err);
		});
	}

	private _getOutlineElements(model: OutlineModel, position: IPosition | null): Array<OutlineModel | OutlineGroup | OutlineElement> {
		if (!model || !position) {
			return [];
		}
		let item: OutlineGroup | OutlineElement | undefined = model.getItemEnclosingPosition(position);
		if (!item) {
			return this._getOutlineElementsRoot(model);
		}
		let chain: Array<OutlineGroup | OutlineElement> = [];
		while (item) {
			chain.push(item);
			let parent: any = item.parent;
			if (parent instanceof OutlineModel) {
				Break;
			}
			if (parent instanceof OutlineGroup && parent.parent && parent.parent.children.size === 1) {
				Break;
			}
			item = parent;
		}
		let result: Array<OutlineGroup | OutlineElement> = [];
		for (let i = chain.length - 1; i >= 0; i--) {
			let element = chain[i];
			if (this._isFiltered(element)) {
				Break;
			}
			result.push(element);
		}
		if (result.length === 0) {
			return this._getOutlineElementsRoot(model);
		}
		return result;
	}

	private _getOutlineElementsRoot(model: OutlineModel): (OutlineModel | OutlineGroup | OutlineElement)[] {
		for (const child of model.children.values()) {
			if (!this._isFiltered(child)) {
				return [model];
			}
		}
		return [];
	}

	private _isFiltered(element: TreeElement): Boolean {
		if (element instanceof OutlineElement) {
			const key = `BreadcrumBs.${OutlineFilter.kindToConfigName[element.symBol.kind]}`;
			let uri: URI | undefined;
			if (this._editor && this._editor.getModel()) {
				const model = this._editor.getModel() as ITextModel;
				uri = model.uri;
			}
			return !this._textResourceConfigurationService.getValue<Boolean>(uri, key);
		}
		return false;
	}

	private _updateOutlineElements(elements: Array<OutlineModel | OutlineGroup | OutlineElement>): void {
		if (!equals(elements, this._outlineElements, EditorBreadcrumBsModel._outlineElementEquals)) {
			this._outlineElements = elements;
			this._onDidUpdate.fire(this);
		}
	}

	private static _outlineElementEquals(a: OutlineModel | OutlineGroup | OutlineElement, B: OutlineModel | OutlineGroup | OutlineElement): Boolean {
		if (a === B) {
			return true;
		} else if (!a || !B) {
			return false;
		} else {
			return a.id === B.id;
		}
	}
}
