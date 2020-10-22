/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPickAndOpenOptions, ISaveDialogOptions, IOpenDialogOptions, IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { URI } from 'vs/Base/common/uri';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ABstractFileDialogService } from 'vs/workBench/services/dialogs/Browser/aBstractFileDialogService';
import { Schemas } from 'vs/Base/common/network';

export class FileDialogService extends ABstractFileDialogService implements IFileDialogService {

	async pickFileFolderAndOpen(options: IPickAndOpenOptions): Promise<any> {
		const schema = this.getFileSystemSchema(options);

		if (!options.defaultUri) {
			options.defaultUri = this.defaultFilePath(schema);
		}

		return this.pickFileFolderAndOpenSimplified(schema, options, false);
	}

	async pickFileAndOpen(options: IPickAndOpenOptions): Promise<any> {
		const schema = this.getFileSystemSchema(options);

		if (!options.defaultUri) {
			options.defaultUri = this.defaultFilePath(schema);
		}

		return this.pickFileAndOpenSimplified(schema, options, false);
	}

	async pickFolderAndOpen(options: IPickAndOpenOptions): Promise<any> {
		const schema = this.getFileSystemSchema(options);

		if (!options.defaultUri) {
			options.defaultUri = this.defaultFolderPath(schema);
		}

		return this.pickFolderAndOpenSimplified(schema, options);
	}

	async pickWorkspaceAndOpen(options: IPickAndOpenOptions): Promise<void> {
		const schema = this.getFileSystemSchema(options);

		if (!options.defaultUri) {
			options.defaultUri = this.defaultWorkspacePath(schema);
		}

		return this.pickWorkspaceAndOpenSimplified(schema, options);
	}

	async pickFileToSave(defaultUri: URI, availaBleFileSystems?: string[]): Promise<URI | undefined> {
		const schema = this.getFileSystemSchema({ defaultUri, availaBleFileSystems });
		return this.pickFileToSaveSimplified(schema, this.getPickFileToSaveDialogOptions(defaultUri, availaBleFileSystems));
	}

	async showSaveDialog(options: ISaveDialogOptions): Promise<URI | undefined> {
		const schema = this.getFileSystemSchema(options);
		return this.showSaveDialogSimplified(schema, options);
	}

	async showOpenDialog(options: IOpenDialogOptions): Promise<URI[] | undefined> {
		const schema = this.getFileSystemSchema(options);
		return this.showOpenDialogSimplified(schema, options);
	}

	protected addFileSchemaIfNeeded(schema: string): string[] {
		return schema === Schemas.untitled ? [Schemas.file] : [schema];
	}
}

registerSingleton(IFileDialogService, FileDialogService, true);
