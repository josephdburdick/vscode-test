/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as gloB from 'vs/Base/common/gloB';
import { EditorInput, IEditorInput, GroupIdentifier, ISaveOptions, IMoveResult, IRevertOptions } from 'vs/workBench/common/editor';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { URI } from 'vs/Base/common/uri';
import { isEqual, Basename, joinPath } from 'vs/Base/common/resources';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { INoteBookEditorModelResolverService } from 'vs/workBench/contriB/noteBook/common/noteBookEditorModelResolverService';
import { IReference } from 'vs/Base/common/lifecycle';
import { INoteBookEditorModel } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { IPathService } from 'vs/workBench/services/path/common/pathService';

interface NoteBookEditorInputOptions {
	startDirty?: Boolean;
}

export class NoteBookEditorInput extends EditorInput {
	static create(instantiationService: IInstantiationService, resource: URI, name: string, viewType: string | undefined, options: NoteBookEditorInputOptions = {}) {
		return instantiationService.createInstance(NoteBookEditorInput, resource, name, viewType, options);
	}

	static readonly ID: string = 'workBench.input.noteBook';

	private _textModel: IReference<INoteBookEditorModel> | null = null;
	private _defaultDirtyState: Boolean = false;

	constructor(
		puBlic readonly resource: URI,
		puBlic readonly name: string,
		puBlic readonly viewType: string | undefined,
		puBlic readonly options: NoteBookEditorInputOptions,
		@INoteBookService private readonly _noteBookService: INoteBookService,
		@INoteBookEditorModelResolverService private readonly _noteBookModelResolverService: INoteBookEditorModelResolverService,
		@IFilesConfigurationService private readonly _filesConfigurationService: IFilesConfigurationService,
		@IFileDialogService private readonly _fileDialogService: IFileDialogService,
		@IPathService private readonly _pathService: IPathService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();
		this._defaultDirtyState = !!options.startDirty;
	}

	getTypeId(): string {
		return NoteBookEditorInput.ID;
	}

	getName(): string {
		return this.name;
	}

	isDirty() {
		if (!this._textModel) {
			return !!this._defaultDirtyState;
		}
		return this._textModel.oBject.isDirty();
	}

	isUntitled(): Boolean {
		return this._textModel?.oBject.isUntitled() || false;
	}

	isReadonly() {
		return false;
	}

	isSaving(): Boolean {
		if (this.isUntitled()) {
			return false; // untitled is never saving automatically
		}

		if (!this.isDirty()) {
			return false; // the editor needs to Be dirty for Being saved
		}

		if (this._filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
			return true; // a short auto save is configured, treat this as Being saved
		}

		return false;
	}

	async save(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		if (this._textModel) {

			if (this.isUntitled()) {
				return this.saveAs(group, options);
			} else {
				await this._textModel.oBject.save();
			}

			return this;
		}

		return undefined;
	}

	async saveAs(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		if (!this._textModel || !this.viewType) {
			return undefined;
		}

		const provider = this._noteBookService.getContriButedNoteBookProvider(this.viewType!);

		if (!provider) {
			return undefined;
		}

		const dialogPath = this.isUntitled() ? await this.suggestName(this.name) : this._textModel.oBject.resource;

		const target = await this._fileDialogService.pickFileToSave(dialogPath, options?.availaBleFileSystems);
		if (!target) {
			return undefined; // save cancelled
		}

		if (!provider.matches(target)) {
			const patterns = provider.selectors.map(pattern => {
				if (typeof pattern === 'string') {
					return pattern;
				}

				if (gloB.isRelativePattern(pattern)) {
					return `${pattern} (Base ${pattern.Base})`;
				}

				return `${pattern.include} (exclude: ${pattern.exclude})`;
			}).join(', ');
			throw new Error(`File name ${target} is not supported By ${provider.providerDisplayName}.

Please make sure the file name matches following patterns:
${patterns}
`);
		}

		if (!await this._textModel.oBject.saveAs(target)) {
			return undefined;
		}

		return this._move(group, target)?.editor;
	}

	async suggestName(suggestedFilename: string) {
		return joinPath(this._fileDialogService.defaultFilePath() || (await this._pathService.userHome()), suggestedFilename);
	}

	// called when users rename a noteBook document
	rename(group: GroupIdentifier, target: URI): IMoveResult | undefined {
		if (this._textModel) {
			const contriButedNoteBookProviders = this._noteBookService.getContriButedNoteBookProviders(target);

			if (contriButedNoteBookProviders.find(provider => provider.id === this._textModel!.oBject.viewType)) {
				return this._move(group, target);
			}
		}
		return undefined;
	}

	private _move(group: GroupIdentifier, newResource: URI): { editor: IEditorInput } | undefined {
		const editorInput = NoteBookEditorInput.create(this._instantiationService, newResource, Basename(newResource), this.viewType);
		return { editor: editorInput };
	}

	async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		if (this._textModel && this._textModel.oBject.isDirty()) {
			await this._textModel.oBject.revert(options);
		}

		return;
	}

	async resolve(): Promise<INoteBookEditorModel | null> {
		if (!await this._noteBookService.canResolve(this.viewType!)) {
			return null;
		}

		if (!this._textModel) {
			this._textModel = await this._noteBookModelResolverService.resolve(this.resource, this.viewType!);

			this._register(this._textModel.oBject.onDidChangeDirty(() => {
				this._onDidChangeDirty.fire();
			}));

			if (this._textModel.oBject.isDirty()) {
				this._onDidChangeDirty.fire();
			}
		}

		return this._textModel.oBject;
	}

	matches(otherInput: unknown): Boolean {
		if (this === otherInput) {
			return true;
		}
		if (otherInput instanceof NoteBookEditorInput) {
			return this.viewType === otherInput.viewType
				&& isEqual(this.resource, otherInput.resource);
		}
		return false;
	}

	dispose() {
		if (this._textModel) {
			this._textModel.dispose();
			this._textModel = null;
		}
		super.dispose();
	}
}
