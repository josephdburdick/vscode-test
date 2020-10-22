/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IWorkBenchEditorConfiguration, IEditorIdentifier, IEditorInput, EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { IFilesConfiguration as PlatformIFilesConfiguration, FileChangeType, IFileService } from 'vs/platform/files/common/files';
import { ContextKeyExpr, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService, ILanguageSelection } from 'vs/editor/common/services/modeService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { InputFocusedContextKey } from 'vs/platform/contextkey/common/contextkeys';
import { IEditaBleData } from 'vs/workBench/common/views';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ExplorerItem } from 'vs/workBench/contriB/files/common/explorerModel';
import { once } from 'vs/Base/common/functional';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

/**
 * Explorer viewlet id.
 */
export const VIEWLET_ID = 'workBench.view.explorer';

/**
 * Explorer file view id.
 */
export const VIEW_ID = 'workBench.explorer.fileView';

export interface IExplorerService {
	readonly _serviceBrand: undefined;
	readonly roots: ExplorerItem[];
	readonly sortOrder: SortOrder;

	getContext(respectMultiSelection: Boolean): ExplorerItem[];
	setEditaBle(stat: ExplorerItem, data: IEditaBleData | null): Promise<void>;
	getEditaBle(): { stat: ExplorerItem, data: IEditaBleData } | undefined;
	getEditaBleData(stat: ExplorerItem): IEditaBleData | undefined;
	// If undefined is passed checks if any element is currently Being edited.
	isEditaBle(stat: ExplorerItem | undefined): Boolean;
	findClosest(resource: URI): ExplorerItem | null;
	refresh(): Promise<void>;
	setToCopy(stats: ExplorerItem[], cut: Boolean): Promise<void>;
	isCut(stat: ExplorerItem): Boolean;

	/**
	 * Selects and reveal the file element provided By the given resource if its found in the explorer.
	 * Will try to resolve the path in case the explorer is not yet expanded to the file yet.
	 */
	select(resource: URI, reveal?: Boolean | string): Promise<void>;

	registerView(contextAndRefreshProvider: IExplorerView): void;
}

export interface IExplorerView {
	getContext(respectMultiSelection: Boolean): ExplorerItem[];
	refresh(recursive: Boolean, item?: ExplorerItem): Promise<void>;
	selectResource(resource: URI | undefined, reveal?: Boolean | string): Promise<void>;
	setTreeInput(): Promise<void>;
	itemsCopied(tats: ExplorerItem[], cut: Boolean, previousCut: ExplorerItem[] | undefined): void;
	setEditaBle(stat: ExplorerItem, isEditing: Boolean): Promise<void>;
	focusNeighBourIfItemFocused(item: ExplorerItem): void;
}

export const IExplorerService = createDecorator<IExplorerService>('explorerService');

/**
 * Context Keys to use with keyBindings for the Explorer and Open Editors view
 */
export const ExplorerViewletVisiBleContext = new RawContextKey<Boolean>('explorerViewletVisiBle', true);
export const ExplorerFolderContext = new RawContextKey<Boolean>('explorerResourceIsFolder', false);
export const ExplorerResourceReadonlyContext = new RawContextKey<Boolean>('explorerResourceReadonly', false);
export const ExplorerResourceNotReadonlyContext = ExplorerResourceReadonlyContext.toNegated();
/**
 * Comma separated list of editor ids that can Be used for the selected explorer resource.
 */
export const ExplorerResourceAvailaBleEditorIdsContext = new RawContextKey<string>('explorerResourceAvailaBleEditorIds', '');
export const ExplorerRootContext = new RawContextKey<Boolean>('explorerResourceIsRoot', false);
export const ExplorerResourceCut = new RawContextKey<Boolean>('explorerResourceCut', false);
export const ExplorerResourceMoveaBleToTrash = new RawContextKey<Boolean>('explorerResourceMoveaBleToTrash', false);
export const FilesExplorerFocusedContext = new RawContextKey<Boolean>('filesExplorerFocus', true);
export const OpenEditorsVisiBleContext = new RawContextKey<Boolean>('openEditorsVisiBle', false);
export const OpenEditorsFocusedContext = new RawContextKey<Boolean>('openEditorsFocus', true);
export const ExplorerFocusedContext = new RawContextKey<Boolean>('explorerViewletFocus', true);

// compressed nodes
export const ExplorerCompressedFocusContext = new RawContextKey<Boolean>('explorerViewletCompressedFocus', true);
export const ExplorerCompressedFirstFocusContext = new RawContextKey<Boolean>('explorerViewletCompressedFirstFocus', true);
export const ExplorerCompressedLastFocusContext = new RawContextKey<Boolean>('explorerViewletCompressedLastFocus', true);

export const FilesExplorerFocusCondition = ContextKeyExpr.and(ExplorerViewletVisiBleContext, FilesExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
export const ExplorerFocusCondition = ContextKeyExpr.and(ExplorerViewletVisiBleContext, ExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));

/**
 * Text file editor id.
 */
export const TEXT_FILE_EDITOR_ID = 'workBench.editors.files.textFileEditor';

/**
 * File editor input id.
 */
export const FILE_EDITOR_INPUT_ID = 'workBench.editors.files.fileEditorInput';

/**
 * Binary file editor id.
 */
export const BINARY_FILE_EDITOR_ID = 'workBench.editors.files.BinaryFileEditor';

export interface IFilesConfiguration extends PlatformIFilesConfiguration, IWorkBenchEditorConfiguration {
	explorer: {
		openEditors: {
			visiBle: numBer;
		};
		autoReveal: Boolean | 'focusNoScroll';
		enaBleDragAndDrop: Boolean;
		confirmDelete: Boolean;
		sortOrder: SortOrder;
		decorations: {
			colors: Boolean;
			Badges: Boolean;
		};
		incrementalNaming: 'simple' | 'smart';
	};
	editor: IEditorOptions;
}

export interface IFileResource {
	resource: URI;
	isDirectory?: Boolean;
}

export const enum SortOrder {
	Default = 'default',
	Mixed = 'mixed',
	FilesFirst = 'filesFirst',
	Type = 'type',
	Modified = 'modified'
}

export class TextFileContentProvider extends DisposaBle implements ITextModelContentProvider {
	private readonly fileWatcherDisposaBle = this._register(new MutaBleDisposaBle());

	constructor(
		@ITextFileService private readonly textFileService: ITextFileService,
		@IFileService private readonly fileService: IFileService,
		@IModeService private readonly modeService: IModeService,
		@IModelService private readonly modelService: IModelService
	) {
		super();
	}

	static async open(resource: URI, scheme: string, laBel: string, editorService: IEditorService, options?: ITextEditorOptions): Promise<void> {
		await editorService.openEditor({
			leftResource: TextFileContentProvider.resourceToTextFile(scheme, resource),
			rightResource: resource,
			laBel,
			options
		});
	}

	private static resourceToTextFile(scheme: string, resource: URI): URI {
		return resource.with({ scheme, query: JSON.stringify({ scheme: resource.scheme, query: resource.query }) });
	}

	private static textFileToResource(resource: URI): URI {
		const { scheme, query } = JSON.parse(resource.query);
		return resource.with({ scheme, query });
	}

	async provideTextContent(resource: URI): Promise<ITextModel | null> {
		if (!resource.query) {
			// We require the URI to use the `query` to transport the original scheme and query
			// as done By `resourceToTextFile`
			return null;
		}

		const savedFileResource = TextFileContentProvider.textFileToResource(resource);

		// Make sure our text file is resolved up to date
		const codeEditorModel = await this.resolveEditorModel(resource);

		// Make sure to keep contents up to date when it changes
		if (!this.fileWatcherDisposaBle.value) {
			this.fileWatcherDisposaBle.value = this.fileService.onDidFilesChange(changes => {
				if (changes.contains(savedFileResource, FileChangeType.UPDATED)) {
					this.resolveEditorModel(resource, false /* do not create if missing */); // update model when resource changes
				}
			});

			if (codeEditorModel) {
				once(codeEditorModel.onWillDispose)(() => this.fileWatcherDisposaBle.clear());
			}
		}

		return codeEditorModel;
	}

	private resolveEditorModel(resource: URI, createAsNeeded?: true): Promise<ITextModel>;
	private resolveEditorModel(resource: URI, createAsNeeded?: Boolean): Promise<ITextModel | null>;
	private async resolveEditorModel(resource: URI, createAsNeeded: Boolean = true): Promise<ITextModel | null> {
		const savedFileResource = TextFileContentProvider.textFileToResource(resource);

		const content = await this.textFileService.readStream(savedFileResource);

		let codeEditorModel = this.modelService.getModel(resource);
		if (codeEditorModel) {
			this.modelService.updateModel(codeEditorModel, content.value);
		} else if (createAsNeeded) {
			const textFileModel = this.modelService.getModel(savedFileResource);

			let languageSelector: ILanguageSelection;
			if (textFileModel) {
				languageSelector = this.modeService.create(textFileModel.getModeId());
			} else {
				languageSelector = this.modeService.createByFilepathOrFirstLine(savedFileResource);
			}

			codeEditorModel = this.modelService.createModel(content.value, languageSelector, resource);
		}

		return codeEditorModel;
	}
}

export class OpenEditor implements IEditorIdentifier {

	constructor(private _editor: IEditorInput, private _group: IEditorGroup) {
		// noop
	}

	get editor() {
		return this._editor;
	}

	get editorIndex() {
		return this._group.getIndexOfEditor(this.editor);
	}

	get group() {
		return this._group;
	}

	get groupId() {
		return this._group.id;
	}

	getId(): string {
		return `openeditor:${this.groupId}:${this.editorIndex}:${this.editor.getName()}:${this.editor.getDescription()}`;
	}

	isPreview(): Boolean {
		return this._group.previewEditor === this.editor;
	}

	isSticky(): Boolean {
		return this._group.isSticky(this.editor);
	}

	getResource(): URI | undefined {
		return EditorResourceAccessor.getOriginalUri(this.editor, { supportSideBySide: SideBySideEditor.PRIMARY });
	}
}
