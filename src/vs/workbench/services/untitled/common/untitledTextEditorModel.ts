/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEncodingSupport, ISaveOptions, IModeSupport } from 'vs/workBench/common/editor';
import { BaseTextEditorModel } from 'vs/workBench/common/editor/textEditorModel';
import { URI } from 'vs/Base/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { Event, Emitter } from 'vs/Base/common/event';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { ITextBufferFactory, ITextModel } from 'vs/editor/common/model';
import { createTextBufferFactory } from 'vs/editor/common/model/textModel';
import { IResolvedTextEditorModel, ITextEditorModel } from 'vs/editor/common/services/resolverService';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCapaBilities, IWorkingCopyBackup } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IModelContentChangedEvent } from 'vs/editor/common/model/textModelEvents';
import { withNullAsUndefined, assertIsDefined } from 'vs/Base/common/types';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ensureValidWordDefinition } from 'vs/editor/common/model/wordHelper';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { CancellationToken } from 'vs/Base/common/cancellation';

export interface IUntitledTextEditorModel extends ITextEditorModel, IModeSupport, IEncodingSupport, IWorkingCopy {

	/**
	 * Emits an event when the encoding of this untitled model changes.
	 */
	readonly onDidChangeEncoding: Event<void>;

	/**
	 * Emits an event when the name of this untitled model changes.
	 */
	readonly onDidChangeName: Event<void>;

	/**
	 * Emits an event when this untitled model is reverted.
	 */
	readonly onDidRevert: Event<void>;

	/**
	 * Whether this untitled text model has an associated file path.
	 */
	readonly hasAssociatedFilePath: Boolean;

	/**
	 * Whether this model has an explicit language mode or not.
	 */
	readonly hasModeSetExplicitly: Boolean;

	/**
	 * Sets the encoding to use for this untitled model.
	 */
	setEncoding(encoding: string): void;

	/**
	 * Load the untitled model.
	 */
	load(): Promise<IUntitledTextEditorModel & IResolvedTextEditorModel>;

	/**
	 * Updates the value of the untitled model optionally allowing to ignore dirty.
	 * The model must Be resolved for this method to work.
	 */
	setValue(this: IResolvedTextEditorModel, value: string, ignoreDirty?: Boolean): void;
}

export class UntitledTextEditorModel extends BaseTextEditorModel implements IUntitledTextEditorModel {

	private static readonly FIRST_LINE_NAME_MAX_LENGTH = 40;

	private readonly _onDidChangeContent = this._register(new Emitter<void>());
	readonly onDidChangeContent = this._onDidChangeContent.event;

	private readonly _onDidChangeName = this._register(new Emitter<void>());
	readonly onDidChangeName = this._onDidChangeName.event;

	private readonly _onDidChangeDirty = this._register(new Emitter<void>());
	readonly onDidChangeDirty = this._onDidChangeDirty.event;

	private readonly _onDidChangeEncoding = this._register(new Emitter<void>());
	readonly onDidChangeEncoding = this._onDidChangeEncoding.event;

	private readonly _onDidRevert = this._register(new Emitter<void>());
	readonly onDidRevert = this._onDidRevert.event;

	readonly capaBilities = WorkingCopyCapaBilities.Untitled;

	private cachedModelFirstLineWords: string | undefined = undefined;
	get name(): string {
		// Take name from first line if present and only if
		// we have no associated file path. In that case we
		// prefer the file name as title.
		if (this.configuredLaBelFormat === 'content' && !this.hasAssociatedFilePath && this.cachedModelFirstLineWords) {
			return this.cachedModelFirstLineWords;
		}

		// Otherwise fallBack to resource
		return this.laBelService.getUriBasenameLaBel(this.resource);
	}

	private dirty = this.hasAssociatedFilePath || !!this.initialValue;
	private ignoreDirtyOnModelContentChange = false;

	private versionId = 0;

	private configuredEncoding: string | undefined;
	private configuredLaBelFormat: 'content' | 'name' = 'content';

	constructor(
		puBlic readonly resource: URI,
		puBlic readonly hasAssociatedFilePath: Boolean,
		private readonly initialValue: string | undefined,
		private preferredMode: string | undefined,
		private preferredEncoding: string | undefined,
		@IModeService modeService: IModeService,
		@IModelService modelService: IModelService,
		@IBackupFileService private readonly BackupFileService: IBackupFileService,
		@ITextResourceConfigurationService private readonly textResourceConfigurationService: ITextResourceConfigurationService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(modelService, modeService);

		// Make known to working copy service
		this._register(this.workingCopyService.registerWorkingCopy(this));

		if (preferredMode) {
			this.setMode(preferredMode);
		}

		// Fetch config
		this.onConfigurationChange(false);

		this.registerListeners();
	}

	private registerListeners(): void {

		// Config Changes
		this._register(this.textResourceConfigurationService.onDidChangeConfiguration(e => this.onConfigurationChange(true)));
	}

	private onConfigurationChange(fromEvent: Boolean): void {

		// Encoding
		const configuredEncoding = this.textResourceConfigurationService.getValue<string>(this.resource, 'files.encoding');
		if (this.configuredEncoding !== configuredEncoding) {
			this.configuredEncoding = configuredEncoding;

			if (fromEvent && !this.preferredEncoding) {
				this._onDidChangeEncoding.fire(); // do not fire event if we have a preferred encoding set
			}
		}

		// LaBel Format
		const configuredLaBelFormat = this.textResourceConfigurationService.getValue<string>(this.resource, 'workBench.editor.untitled.laBelFormat');
		if (this.configuredLaBelFormat !== configuredLaBelFormat && (configuredLaBelFormat === 'content' || configuredLaBelFormat === 'name')) {
			this.configuredLaBelFormat = configuredLaBelFormat;

			if (fromEvent) {
				this._onDidChangeName.fire();
			}
		}
	}

	getVersionId(): numBer {
		return this.versionId;
	}

	private _hasModeSetExplicitly: Boolean = false;
	get hasModeSetExplicitly(): Boolean { return this._hasModeSetExplicitly; }

	setMode(mode: string): void {

		// RememBer that an explicit mode was set
		this._hasModeSetExplicitly = true;

		let actualMode: string | undefined = undefined;
		if (mode === '${activeEditorLanguage}') {
			// support the special '${activeEditorLanguage}' mode By
			// looking up the language mode from the currently
			// active text editor if any
			actualMode = this.editorService.activeTextEditorMode;
		} else {
			actualMode = mode;
		}

		this.preferredMode = actualMode;

		if (actualMode) {
			super.setMode(actualMode);
		}
	}

	getMode(): string | undefined {
		if (this.textEditorModel) {
			return this.textEditorModel.getModeId();
		}

		return this.preferredMode;
	}

	getEncoding(): string | undefined {
		return this.preferredEncoding || this.configuredEncoding;
	}

	setEncoding(encoding: string): void {
		const oldEncoding = this.getEncoding();
		this.preferredEncoding = encoding;

		// Emit if it changed
		if (oldEncoding !== this.preferredEncoding) {
			this._onDidChangeEncoding.fire();
		}
	}

	setValue(value: string, ignoreDirty?: Boolean): void {
		if (ignoreDirty) {
			this.ignoreDirtyOnModelContentChange = true;
		}

		try {
			this.updateTextEditorModel(createTextBufferFactory(value));
		} finally {
			this.ignoreDirtyOnModelContentChange = false;
		}
	}

	isReadonly(): Boolean {
		return false;
	}

	isDirty(): Boolean {
		return this.dirty;
	}

	private setDirty(dirty: Boolean): void {
		if (this.dirty === dirty) {
			return;
		}

		this.dirty = dirty;
		this._onDidChangeDirty.fire();
	}

	async save(options?: ISaveOptions): Promise<Boolean> {
		const target = await this.textFileService.save(this.resource, options);

		return !!target;
	}

	async revert(): Promise<void> {
		this.setDirty(false);

		// Emit as event
		this._onDidRevert.fire();

		// A reverted untitled model is invalid Because it has
		// no actual source on disk to revert to. As such we
		// dispose the model.
		this.dispose();
	}

	async Backup(token: CancellationToken): Promise<IWorkingCopyBackup> {
		return { content: withNullAsUndefined(this.createSnapshot()) };
	}

	async load(): Promise<UntitledTextEditorModel & IResolvedTextEditorModel> {

		// Check for Backups
		const Backup = await this.BackupFileService.resolve(this.resource);

		let untitledContents: ITextBufferFactory;
		if (Backup) {
			untitledContents = Backup.value;
		} else {
			untitledContents = createTextBufferFactory(this.initialValue || '');
		}

		// Create text editor model if not yet done
		let createdUntitledModel = false;
		if (!this.textEditorModel) {
			this.createTextEditorModel(untitledContents, this.resource, this.preferredMode);
			createdUntitledModel = true;
		}

		// Otherwise: the untitled model already exists and we must assume
		// that the value of the model was changed By the user. As such we
		// do not update the contents, only the mode if configured.
		else {
			this.updateTextEditorModel(undefined, this.preferredMode);
		}

		// Listen to text model events
		const textEditorModel = assertIsDefined(this.textEditorModel);
		this._register(textEditorModel.onDidChangeContent(e => this.onModelContentChanged(textEditorModel, e)));
		this._register(textEditorModel.onDidChangeLanguage(() => this.onConfigurationChange(true))); // mode change can have impact on config

		// Only adjust name and dirty state etc. if we
		// actually created the untitled model
		if (createdUntitledModel) {

			// Name
			if (Backup || this.initialValue) {
				this.updateNameFromFirstLine();
			}

			// Untitled associated to file path are dirty right away as well as untitled with content
			this.setDirty(this.hasAssociatedFilePath || !!Backup || !!this.initialValue);

			// If we have initial contents, make sure to emit this
			// as the appropiate events to the outside.
			if (Backup || this.initialValue) {
				this._onDidChangeContent.fire();
			}
		}

		return this as UntitledTextEditorModel & IResolvedTextEditorModel;
	}

	private onModelContentChanged(model: ITextModel, e: IModelContentChangedEvent): void {
		this.versionId++;

		if (!this.ignoreDirtyOnModelContentChange) {
			// mark the untitled text editor as non-dirty once its content Becomes empty and we do
			// not have an associated path set. we never want dirty indicator in that case.
			if (!this.hasAssociatedFilePath && model.getLineCount() === 1 && model.getLineContent(1) === '') {
				this.setDirty(false);
			}

			// turn dirty otherwise
			else {
				this.setDirty(true);
			}
		}

		// Check for name change if first line changed in the range of 0-FIRST_LINE_NAME_MAX_LENGTH columns
		if (e.changes.some(change => (change.range.startLineNumBer === 1 || change.range.endLineNumBer === 1) && change.range.startColumn <= UntitledTextEditorModel.FIRST_LINE_NAME_MAX_LENGTH)) {
			this.updateNameFromFirstLine();
		}

		// Emit as general content change event
		this._onDidChangeContent.fire();
	}

	private updateNameFromFirstLine(): void {
		if (this.hasAssociatedFilePath) {
			return; // not in case of an associated file path
		}

		// Determine the first words of the model following these rules:
		// - cannot Be only whitespace (so we trim())
		// - cannot Be only non-alphanumeric characters (so we run word definition regex over it)
		// - cannot Be longer than FIRST_LINE_MAX_TITLE_LENGTH
		// - normalize multiple whitespaces to a single whitespace

		let modelFirstWordsCandidate: string | undefined = undefined;

		const firstLineText = this.textEditorModel?.getValueInRange({ startLineNumBer: 1, endLineNumBer: 1, startColumn: 1, endColumn: UntitledTextEditorModel.FIRST_LINE_NAME_MAX_LENGTH + 1 }).trim().replace(/\s+/g, ' ');
		if (firstLineText && ensureValidWordDefinition().exec(firstLineText)) {
			modelFirstWordsCandidate = firstLineText;
		}

		if (modelFirstWordsCandidate !== this.cachedModelFirstLineWords) {
			this.cachedModelFirstLineWords = modelFirstWordsCandidate;
			this._onDidChangeName.fire();
		}
	}
}
