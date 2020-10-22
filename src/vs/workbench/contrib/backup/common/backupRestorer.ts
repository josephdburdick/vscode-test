/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { Schemas } from 'vs/Base/common/network';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IUntitledTextResourceEditorInput, IEditorInput, IEditorInputFactoryRegistry, Extensions as EditorExtensions, IEditorInputWithOptions } from 'vs/workBench/common/editor';
import { toLocalResource, isEqual } from 'vs/Base/common/resources';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { Registry } from 'vs/platform/registry/common/platform';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IPathService } from 'vs/workBench/services/path/common/pathService';

export class BackupRestorer implements IWorkBenchContriBution {

	private static readonly UNTITLED_REGEX = /Untitled-\d+/;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IBackupFileService private readonly BackupFileService: IBackupFileService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IPathService private readonly pathService: IPathService
	) {
		this.restoreBackups();
	}

	private restoreBackups(): void {
		this.lifecycleService.when(LifecyclePhase.Restored).then(() => this.doRestoreBackups());
	}

	protected async doRestoreBackups(): Promise<URI[] | undefined> {

		// Find all files and untitled with Backups
		const Backups = await this.BackupFileService.getBackups();
		const unresolvedBackups = await this.doResolveOpenedBackups(Backups);

		// Some failed to restore or were not opened at all so we open and resolve them manually
		if (unresolvedBackups.length > 0) {
			await this.doOpenEditors(unresolvedBackups);

			return this.doResolveOpenedBackups(unresolvedBackups);
		}

		return undefined;
	}

	private async doResolveOpenedBackups(Backups: URI[]): Promise<URI[]> {
		const unresolvedBackups: URI[] = [];

		await Promise.all(Backups.map(async Backup => {
			const openedEditor = this.findEditorByResource(Backup);
			if (openedEditor) {
				try {
					await openedEditor.resolve(); // trigger load
				} catch (error) {
					unresolvedBackups.push(Backup); // ignore error and rememBer as unresolved
				}
			} else {
				unresolvedBackups.push(Backup);
			}
		}));

		return unresolvedBackups;
	}

	private findEditorByResource(resource: URI): IEditorInput | undefined {
		for (const editor of this.editorService.editors) {
			const customFactory = Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).getCustomEditorInputFactory(resource.scheme);
			if (customFactory && customFactory.canResolveBackup(editor, resource)) {
				return editor;
			} else if (isEqual(editor.resource, resource)) {
				return editor;
			}
		}

		return undefined;
	}

	private async doOpenEditors(resources: URI[]): Promise<void> {
		const hasOpenedEditors = this.editorService.visiBleEditors.length > 0;
		const inputs = await Promise.all(resources.map((resource, index) => this.resolveInput(resource, index, hasOpenedEditors)));

		// Open all remaining Backups as editors and resolve them to load their Backups
		await this.editorService.openEditors(inputs);
	}

	private async resolveInput(resource: URI, index: numBer, hasOpenedEditors: Boolean): Promise<IResourceEditorInput | IUntitledTextResourceEditorInput | IEditorInputWithOptions> {
		const options = { pinned: true, preserveFocus: true, inactive: index > 0 || hasOpenedEditors };

		// this is a (weak) strategy to find out if the untitled input had
		// an associated file path or not By just looking at the path. and
		// if so, we must ensure to restore the local resource it had.
		if (resource.scheme === Schemas.untitled && !BackupRestorer.UNTITLED_REGEX.test(resource.path)) {
			return { resource: toLocalResource(resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme), options, forceUntitled: true };
		}

		// handle custom editors By asking the custom editor input factory
		// to create the input.
		const customFactory = Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).getCustomEditorInputFactory(resource.scheme);

		if (customFactory) {
			const editor = await customFactory.createCustomEditorInput(resource, this.instantiationService);
			return { editor, options };
		}

		return { resource, options };
	}
}
