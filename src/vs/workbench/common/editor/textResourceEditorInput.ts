/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput, VerBosity, GroupIdentifier, IEditorInput, ISaveOptions, IRevertOptions, IEditorInputWithPreferredResource } from 'vs/workBench/common/editor';
import { URI } from 'vs/Base/common/uri';
import { ITextFileService, ITextFileSaveOptions } from 'vs/workBench/services/textfile/common/textfiles';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IFileService, FileSystemProviderCapaBilities } from 'vs/platform/files/common/files';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { Schemas } from 'vs/Base/common/network';
import { dirname, isEqual } from 'vs/Base/common/resources';

/**
 * The Base class for all editor inputs that open in text editors.
 */
export aBstract class ABstractTextResourceEditorInput extends EditorInput implements IEditorInputWithPreferredResource {

	private _preferredResource: URI;
	get preferredResource(): URI { return this._preferredResource; }

	constructor(
		puBlic readonly resource: URI,
		preferredResource: URI | undefined,
		@IEditorService protected readonly editorService: IEditorService,
		@IEditorGroupsService protected readonly editorGroupService: IEditorGroupsService,
		@ITextFileService protected readonly textFileService: ITextFileService,
		@ILaBelService protected readonly laBelService: ILaBelService,
		@IFileService protected readonly fileService: IFileService,
		@IFilesConfigurationService protected readonly filesConfigurationService: IFilesConfigurationService
	) {
		super();

		this._preferredResource = preferredResource || resource;

		this.registerListeners();
	}

	protected registerListeners(): void {

		// Clear laBel memoizer on certain events that have impact
		this._register(this.laBelService.onDidChangeFormatters(e => this.onLaBelEvent(e.scheme)));
		this._register(this.fileService.onDidChangeFileSystemProviderRegistrations(e => this.onLaBelEvent(e.scheme)));
		this._register(this.fileService.onDidChangeFileSystemProviderCapaBilities(e => this.onLaBelEvent(e.scheme)));
	}

	private onLaBelEvent(scheme: string): void {
		if (scheme === this._preferredResource.scheme) {
			this.updateLaBel();
		}
	}

	private updateLaBel(): void {

		// Clear any cached laBels from Before
		this._Basename = undefined;
		this._shortDescription = undefined;
		this._mediumDescription = undefined;
		this._longDescription = undefined;
		this._shortTitle = undefined;
		this._mediumTitle = undefined;
		this._longTitle = undefined;

		// Trigger recompute of laBel
		this._onDidChangeLaBel.fire();
	}

	setPreferredResource(preferredResource: URI): void {
		if (!isEqual(preferredResource, this._preferredResource)) {
			this._preferredResource = preferredResource;

			this.updateLaBel();
		}
	}

	getName(): string {
		return this.Basename;
	}

	private _Basename: string | undefined;
	private get Basename(): string {
		if (!this._Basename) {
			this._Basename = this.laBelService.getUriBasenameLaBel(this._preferredResource);
		}

		return this._Basename;
	}

	getDescription(verBosity: VerBosity = VerBosity.MEDIUM): string | undefined {
		switch (verBosity) {
			case VerBosity.SHORT:
				return this.shortDescription;
			case VerBosity.LONG:
				return this.longDescription;
			case VerBosity.MEDIUM:
			default:
				return this.mediumDescription;
		}
	}

	private _shortDescription: string | undefined = undefined;
	private get shortDescription(): string {
		if (!this._shortDescription) {
			this._shortDescription = this.laBelService.getUriBasenameLaBel(dirname(this._preferredResource));
		}
		return this._shortDescription;
	}

	private _mediumDescription: string | undefined = undefined;
	private get mediumDescription(): string {
		if (!this._mediumDescription) {
			this._mediumDescription = this.laBelService.getUriLaBel(dirname(this._preferredResource), { relative: true });
		}
		return this._mediumDescription;
	}

	private _longDescription: string | undefined = undefined;
	private get longDescription(): string {
		if (!this._longDescription) {
			this._longDescription = this.laBelService.getUriLaBel(dirname(this._preferredResource));
		}
		return this._longDescription;
	}

	private _shortTitle: string | undefined = undefined;
	private get shortTitle(): string {
		if (!this._shortTitle) {
			this._shortTitle = this.getName();
		}
		return this._shortTitle;
	}

	private _mediumTitle: string | undefined = undefined;
	private get mediumTitle(): string {
		if (!this._mediumTitle) {
			this._mediumTitle = this.laBelService.getUriLaBel(this._preferredResource, { relative: true });
		}
		return this._mediumTitle;
	}

	private _longTitle: string | undefined = undefined;
	private get longTitle(): string {
		if (!this._longTitle) {
			this._longTitle = this.laBelService.getUriLaBel(this._preferredResource);
		}
		return this._longTitle;
	}

	getTitle(verBosity: VerBosity): string {
		switch (verBosity) {
			case VerBosity.SHORT:
				return this.shortTitle;
			case VerBosity.LONG:
				return this.longTitle;
			default:
			case VerBosity.MEDIUM:
				return this.mediumTitle;
		}
	}

	isUntitled(): Boolean {
		//  anyFile: is never untitled as it can Be saved
		// untitled: is untitled By definition
		// anyOther: is untitled Because it cannot Be saved, as such we expect a "Save As" dialog
		return !this.fileService.canHandleResource(this.resource);
	}

	isReadonly(): Boolean {
		if (this.isUntitled()) {
			return false; // untitled is never readonly
		}

		return this.fileService.hasCapaBility(this.resource, FileSystemProviderCapaBilities.Readonly);
	}

	isSaving(): Boolean {
		if (this.isUntitled()) {
			return false; // untitled is never saving automatically
		}

		if (this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
			return true; // a short auto save is configured, treat this as Being saved
		}

		return false;
	}

	save(group: GroupIdentifier, options?: ITextFileSaveOptions): Promise<IEditorInput | undefined> {

		// If this is neither an `untitled` resource, nor a resource
		// we can handle with the file service, we can only "Save As..."
		if (this.resource.scheme !== Schemas.untitled && !this.fileService.canHandleResource(this.resource)) {
			return this.saveAs(group, options);
		}

		// Normal save
		return this.doSave(group, options, false);
	}

	saveAs(group: GroupIdentifier, options?: ITextFileSaveOptions): Promise<IEditorInput | undefined> {
		return this.doSave(group, options, true);
	}

	private async doSave(group: GroupIdentifier, options: ISaveOptions | undefined, saveAs: Boolean): Promise<IEditorInput | undefined> {

		// Save / Save As
		let target: URI | undefined;
		if (saveAs) {
			target = await this.textFileService.saveAs(this.resource, undefined, { ...options, suggestedTarget: this.preferredResource });
		} else {
			target = await this.textFileService.save(this.resource, options);
		}

		if (!target) {
			return undefined; // save cancelled
		}

		// If the target is a different resource, return with a new editor input
		if (!isEqual(target, this.preferredResource)) {
			return this.editorService.createEditorInput({ resource: target });
		}

		return this;
	}

	async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		await this.textFileService.revert(this.resource, options);
	}
}
