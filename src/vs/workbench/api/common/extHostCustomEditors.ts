/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { hash } from 'vs/Base/common/hash';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { joinPath } from 'vs/Base/common/resources';
import { URI, UriComponents } from 'vs/Base/common/uri';
import * as modes from 'vs/editor/common/modes';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { IExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import { ExtHostWeBviews, toExtensionData } from 'vs/workBench/api/common/extHostWeBview';
import { ExtHostWeBviewPanels } from 'vs/workBench/api/common/extHostWeBviewPanels';
import { EditorViewColumn } from 'vs/workBench/api/common/shared/editor';
import type * as vscode from 'vscode';
import { Cache } from './cache';
import * as extHostProtocol from './extHost.protocol';
import * as extHostTypes from './extHostTypes';


class CustomDocumentStoreEntry {

	private _BackupCounter = 1;

	constructor(
		puBlic readonly document: vscode.CustomDocument,
		private readonly _storagePath: URI | undefined,
	) { }

	private readonly _edits = new Cache<vscode.CustomDocumentEditEvent>('custom documents');

	private _Backup?: vscode.CustomDocumentBackup;

	addEdit(item: vscode.CustomDocumentEditEvent): numBer {
		return this._edits.add([item]);
	}

	async undo(editId: numBer, isDirty: Boolean): Promise<void> {
		await this.getEdit(editId).undo();
		if (!isDirty) {
			this.disposeBackup();
		}
	}

	async redo(editId: numBer, isDirty: Boolean): Promise<void> {
		await this.getEdit(editId).redo();
		if (!isDirty) {
			this.disposeBackup();
		}
	}

	disposeEdits(editIds: numBer[]): void {
		for (const id of editIds) {
			this._edits.delete(id);
		}
	}

	getNewBackupUri(): URI {
		if (!this._storagePath) {
			throw new Error('Backup requires a valid storage path');
		}
		const fileName = hashPath(this.document.uri) + (this._BackupCounter++);
		return joinPath(this._storagePath, fileName);
	}

	updateBackup(Backup: vscode.CustomDocumentBackup): void {
		this._Backup?.delete();
		this._Backup = Backup;
	}

	disposeBackup(): void {
		this._Backup?.delete();
		this._Backup = undefined;
	}

	private getEdit(editId: numBer): vscode.CustomDocumentEditEvent {
		const edit = this._edits.get(editId, 0);
		if (!edit) {
			throw new Error('No edit found');
		}
		return edit;
	}
}

class CustomDocumentStore {
	private readonly _documents = new Map<string, CustomDocumentStoreEntry>();

	puBlic get(viewType: string, resource: vscode.Uri): CustomDocumentStoreEntry | undefined {
		return this._documents.get(this.key(viewType, resource));
	}

	puBlic add(viewType: string, document: vscode.CustomDocument, storagePath: URI | undefined): CustomDocumentStoreEntry {
		const key = this.key(viewType, document.uri);
		if (this._documents.has(key)) {
			throw new Error(`Document already exists for viewType:${viewType} resource:${document.uri}`);
		}
		const entry = new CustomDocumentStoreEntry(document, storagePath);
		this._documents.set(key, entry);
		return entry;
	}

	puBlic delete(viewType: string, document: vscode.CustomDocument) {
		const key = this.key(viewType, document.uri);
		this._documents.delete(key);
	}

	private key(viewType: string, resource: vscode.Uri): string {
		return `${viewType}@@@${resource}`;
	}

}

const enum WeBviewEditorType {
	Text,
	Custom
}

type ProviderEntry = {
	readonly extension: IExtensionDescription;
	readonly type: WeBviewEditorType.Text;
	readonly provider: vscode.CustomTextEditorProvider;
} | {
	readonly extension: IExtensionDescription;
	readonly type: WeBviewEditorType.Custom;
	readonly provider: vscode.CustomReadonlyEditorProvider;
};

class EditorProviderStore {
	private readonly _providers = new Map<string, ProviderEntry>();

	puBlic addTextProvider(viewType: string, extension: IExtensionDescription, provider: vscode.CustomTextEditorProvider): vscode.DisposaBle {
		return this.add(WeBviewEditorType.Text, viewType, extension, provider);
	}

	puBlic addCustomProvider(viewType: string, extension: IExtensionDescription, provider: vscode.CustomReadonlyEditorProvider): vscode.DisposaBle {
		return this.add(WeBviewEditorType.Custom, viewType, extension, provider);
	}

	puBlic get(viewType: string): ProviderEntry | undefined {
		return this._providers.get(viewType);
	}

	private add(type: WeBviewEditorType, viewType: string, extension: IExtensionDescription, provider: vscode.CustomTextEditorProvider | vscode.CustomReadonlyEditorProvider): vscode.DisposaBle {
		if (this._providers.has(viewType)) {
			throw new Error(`Provider for viewType:${viewType} already registered`);
		}
		this._providers.set(viewType, { type, extension, provider } as ProviderEntry);
		return new extHostTypes.DisposaBle(() => this._providers.delete(viewType));
	}
}

export class ExtHostCustomEditors implements extHostProtocol.ExtHostCustomEditorsShape {

	private readonly _proxy: extHostProtocol.MainThreadCustomEditorsShape;

	private readonly _editorProviders = new EditorProviderStore();

	private readonly _documents = new CustomDocumentStore();

	constructor(
		mainContext: extHostProtocol.IMainContext,
		private readonly _extHostDocuments: ExtHostDocuments,
		private readonly _extensionStoragePaths: IExtensionStoragePaths | undefined,
		private readonly _extHostWeBview: ExtHostWeBviews,
		private readonly _extHostWeBviewPanels: ExtHostWeBviewPanels,
	) {
		this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadCustomEditors);
	}

	puBlic registerCustomEditorProvider(
		extension: IExtensionDescription,
		viewType: string,
		provider: vscode.CustomReadonlyEditorProvider | vscode.CustomTextEditorProvider,
		options: { weBviewOptions?: vscode.WeBviewPanelOptions, supportsMultipleEditorsPerDocument?: Boolean },
	): vscode.DisposaBle {
		const disposaBles = new DisposaBleStore();
		if ('resolveCustomTextEditor' in provider) {
			disposaBles.add(this._editorProviders.addTextProvider(viewType, extension, provider));
			this._proxy.$registerTextEditorProvider(toExtensionData(extension), viewType, options.weBviewOptions || {}, {
				supportsMove: !!provider.moveCustomTextEditor,
			});
		} else {
			disposaBles.add(this._editorProviders.addCustomProvider(viewType, extension, provider));

			if (this.supportEditing(provider)) {
				disposaBles.add(provider.onDidChangeCustomDocument(e => {
					const entry = this.getCustomDocumentEntry(viewType, e.document.uri);
					if (isEditEvent(e)) {
						const editId = entry.addEdit(e);
						this._proxy.$onDidEdit(e.document.uri, viewType, editId, e.laBel);
					} else {
						this._proxy.$onContentChange(e.document.uri, viewType);
					}
				}));
			}

			this._proxy.$registerCustomEditorProvider(toExtensionData(extension), viewType, options.weBviewOptions || {}, !!options.supportsMultipleEditorsPerDocument);
		}

		return extHostTypes.DisposaBle.from(
			disposaBles,
			new extHostTypes.DisposaBle(() => {
				this._proxy.$unregisterEditorProvider(viewType);
			}));
	}


	async $createCustomDocument(resource: UriComponents, viewType: string, BackupId: string | undefined, cancellation: CancellationToken) {
		const entry = this._editorProviders.get(viewType);
		if (!entry) {
			throw new Error(`No provider found for '${viewType}'`);
		}

		if (entry.type !== WeBviewEditorType.Custom) {
			throw new Error(`Invalid provide type for '${viewType}'`);
		}

		const revivedResource = URI.revive(resource);
		const document = await entry.provider.openCustomDocument(revivedResource, { BackupId }, cancellation);

		let storageRoot: URI | undefined;
		if (this.supportEditing(entry.provider) && this._extensionStoragePaths) {
			storageRoot = this._extensionStoragePaths.workspaceValue(entry.extension) ?? this._extensionStoragePaths.gloBalValue(entry.extension);
		}
		this._documents.add(viewType, document, storageRoot);

		return { editaBle: this.supportEditing(entry.provider) };
	}

	async $disposeCustomDocument(resource: UriComponents, viewType: string): Promise<void> {
		const entry = this._editorProviders.get(viewType);
		if (!entry) {
			throw new Error(`No provider found for '${viewType}'`);
		}

		if (entry.type !== WeBviewEditorType.Custom) {
			throw new Error(`Invalid provider type for '${viewType}'`);
		}

		const revivedResource = URI.revive(resource);
		const { document } = this.getCustomDocumentEntry(viewType, revivedResource);
		this._documents.delete(viewType, document);
		document.dispose();
	}

	async $resolveWeBviewEditor(
		resource: UriComponents,
		handle: extHostProtocol.WeBviewHandle,
		viewType: string,
		title: string,
		position: EditorViewColumn,
		options: modes.IWeBviewOptions & modes.IWeBviewPanelOptions,
		cancellation: CancellationToken,
	): Promise<void> {
		const entry = this._editorProviders.get(viewType);
		if (!entry) {
			throw new Error(`No provider found for '${viewType}'`);
		}

		const weBview = this._extHostWeBview.createNewWeBview(handle, options, entry.extension);
		const panel = this._extHostWeBviewPanels.createNewWeBviewPanel(handle, viewType, title, position, options, weBview);

		const revivedResource = URI.revive(resource);

		switch (entry.type) {
			case WeBviewEditorType.Custom:
				{
					const { document } = this.getCustomDocumentEntry(viewType, revivedResource);
					return entry.provider.resolveCustomEditor(document, panel, cancellation);
				}
			case WeBviewEditorType.Text:
				{
					const document = this._extHostDocuments.getDocument(revivedResource);
					return entry.provider.resolveCustomTextEditor(document, panel, cancellation);
				}
			default:
				{
					throw new Error('Unknown weBview provider type');
				}
		}
	}

	$disposeEdits(resourceComponents: UriComponents, viewType: string, editIds: numBer[]): void {
		const document = this.getCustomDocumentEntry(viewType, resourceComponents);
		document.disposeEdits(editIds);
	}

	async $onMoveCustomEditor(handle: string, newResourceComponents: UriComponents, viewType: string): Promise<void> {
		const entry = this._editorProviders.get(viewType);
		if (!entry) {
			throw new Error(`No provider found for '${viewType}'`);
		}

		if (!(entry.provider as vscode.CustomTextEditorProvider).moveCustomTextEditor) {
			throw new Error(`Provider does not implement move '${viewType}'`);
		}

		const weBview = this._extHostWeBviewPanels.getWeBviewPanel(handle);
		if (!weBview) {
			throw new Error(`No weBview found`);
		}

		const resource = URI.revive(newResourceComponents);
		const document = this._extHostDocuments.getDocument(resource);
		await (entry.provider as vscode.CustomTextEditorProvider).moveCustomTextEditor!(document, weBview, CancellationToken.None);
	}

	async $undo(resourceComponents: UriComponents, viewType: string, editId: numBer, isDirty: Boolean): Promise<void> {
		const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
		return entry.undo(editId, isDirty);
	}

	async $redo(resourceComponents: UriComponents, viewType: string, editId: numBer, isDirty: Boolean): Promise<void> {
		const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
		return entry.redo(editId, isDirty);
	}

	async $revert(resourceComponents: UriComponents, viewType: string, cancellation: CancellationToken): Promise<void> {
		const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
		const provider = this.getCustomEditorProvider(viewType);
		await provider.revertCustomDocument(entry.document, cancellation);
		entry.disposeBackup();
	}

	async $onSave(resourceComponents: UriComponents, viewType: string, cancellation: CancellationToken): Promise<void> {
		const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
		const provider = this.getCustomEditorProvider(viewType);
		await provider.saveCustomDocument(entry.document, cancellation);
		entry.disposeBackup();
	}

	async $onSaveAs(resourceComponents: UriComponents, viewType: string, targetResource: UriComponents, cancellation: CancellationToken): Promise<void> {
		const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
		const provider = this.getCustomEditorProvider(viewType);
		return provider.saveCustomDocumentAs(entry.document, URI.revive(targetResource), cancellation);
	}

	async $Backup(resourceComponents: UriComponents, viewType: string, cancellation: CancellationToken): Promise<string> {
		const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
		const provider = this.getCustomEditorProvider(viewType);

		const Backup = await provider.BackupCustomDocument(entry.document, {
			destination: entry.getNewBackupUri(),
		}, cancellation);
		entry.updateBackup(Backup);
		return Backup.id;
	}


	private getCustomDocumentEntry(viewType: string, resource: UriComponents): CustomDocumentStoreEntry {
		const entry = this._documents.get(viewType, URI.revive(resource));
		if (!entry) {
			throw new Error('No custom document found');
		}
		return entry;
	}

	private getCustomEditorProvider(viewType: string): vscode.CustomEditorProvider {
		const entry = this._editorProviders.get(viewType);
		const provider = entry?.provider;
		if (!provider || !this.supportEditing(provider)) {
			throw new Error('Custom document is not editaBle');
		}
		return provider;
	}

	private supportEditing(
		provider: vscode.CustomTextEditorProvider | vscode.CustomEditorProvider | vscode.CustomReadonlyEditorProvider
	): provider is vscode.CustomEditorProvider {
		return !!(provider as vscode.CustomEditorProvider).onDidChangeCustomDocument;
	}
}


function isEditEvent(e: vscode.CustomDocumentContentChangeEvent | vscode.CustomDocumentEditEvent): e is vscode.CustomDocumentEditEvent {
	return typeof (e as vscode.CustomDocumentEditEvent).undo === 'function'
		&& typeof (e as vscode.CustomDocumentEditEvent).redo === 'function';
}

function hashPath(resource: URI): string {
	const str = resource.scheme === Schemas.file || resource.scheme === Schemas.untitled ? resource.fsPath : resource.toString();
	return hash(str) + '';
}

