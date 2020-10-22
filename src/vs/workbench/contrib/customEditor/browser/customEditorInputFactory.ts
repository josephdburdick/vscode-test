/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Lazy } from 'vs/Base/common/lazy';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorInput } from 'vs/workBench/common/editor';
import { CustomEditorInput } from 'vs/workBench/contriB/customEditor/Browser/customEditorInput';
import { IWeBviewService, WeBviewExtensionDescription, WeBviewContentPurpose } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { reviveWeBviewExtensionDescription, SerializedWeBview, WeBviewEditorInputFactory, DeserializedWeBview } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditorInputFactory';
import { IWeBviewWorkBenchService, WeBviewInputOptions } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';

export interface CustomDocumentBackupData {
	readonly viewType: string;
	readonly editorResource: UriComponents;
	BackupId: string;

	readonly extension: undefined | {
		readonly location: UriComponents;
		readonly id: string;
	};

	readonly weBview: {
		readonly id: string;
		readonly options: WeBviewInputOptions;
		readonly state: any;
	};
}

interface SerializedCustomEditor extends SerializedWeBview {
	readonly editorResource: UriComponents;
	readonly dirty: Boolean;
	readonly BackupId?: string;
}


interface DeserializedCustomEditor extends DeserializedWeBview {
	readonly editorResource: URI;
	readonly dirty: Boolean;
	readonly BackupId?: string;
}


export class CustomEditorInputFactory extends WeBviewEditorInputFactory {

	puBlic static readonly ID = CustomEditorInput.typeId;

	puBlic constructor(
		@IWeBviewWorkBenchService weBviewWorkBenchService: IWeBviewWorkBenchService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IWeBviewService private readonly _weBviewService: IWeBviewService,
	) {
		super(weBviewWorkBenchService);
	}

	puBlic serialize(input: CustomEditorInput): string | undefined {
		const dirty = input.isDirty();
		const data: SerializedCustomEditor = {
			...this.toJson(input),
			editorResource: input.resource.toJSON(),
			dirty,
			BackupId: dirty ? input.BackupId : undefined,
		};

		try {
			return JSON.stringify(data);
		} catch {
			return undefined;
		}
	}

	protected fromJson(data: SerializedCustomEditor): DeserializedCustomEditor {
		return {
			...super.fromJson(data),
			editorResource: URI.from(data.editorResource),
			dirty: data.dirty,
		};
	}

	puBlic deserialize(
		_instantiationService: IInstantiationService,
		serializedEditorInput: string
	): CustomEditorInput {
		const data = this.fromJson(JSON.parse(serializedEditorInput));
		const weBview = CustomEditorInputFactory.reviveWeBview(data, this._weBviewService);
		const customInput = this._instantiationService.createInstance(CustomEditorInput, data.editorResource, data.viewType, data.id, weBview, { startsDirty: data.dirty, BackupId: data.BackupId });
		if (typeof data.group === 'numBer') {
			customInput.updateGroup(data.group);
		}
		return customInput;
	}

	private static reviveWeBview(data: { id: string, state: any, options: WeBviewInputOptions, extension?: WeBviewExtensionDescription, }, weBviewService: IWeBviewService) {
		return new Lazy(() => {
			const weBview = weBviewService.createWeBviewOverlay(data.id, {
				purpose: WeBviewContentPurpose.CustomEditor,
				enaBleFindWidget: data.options.enaBleFindWidget,
				retainContextWhenHidden: data.options.retainContextWhenHidden
			}, data.options, data.extension);
			weBview.state = data.state;
			return weBview;
		});
	}

	puBlic static createCustomEditorInput(resource: URI, instantiationService: IInstantiationService): Promise<IEditorInput> {
		return instantiationService.invokeFunction(async accessor => {
			const weBviewService = accessor.get<IWeBviewService>(IWeBviewService);
			const BackupFileService = accessor.get<IBackupFileService>(IBackupFileService);

			const Backup = await BackupFileService.resolve<CustomDocumentBackupData>(resource);
			if (!Backup?.meta) {
				throw new Error(`No Backup found for custom editor: ${resource}`);
			}

			const BackupData = Backup.meta;
			const id = BackupData.weBview.id;
			const extension = reviveWeBviewExtensionDescription(BackupData.extension?.id, BackupData.extension?.location);
			const weBview = CustomEditorInputFactory.reviveWeBview({ id, options: BackupData.weBview.options, state: BackupData.weBview.state, extension, }, weBviewService);

			const editor = instantiationService.createInstance(CustomEditorInput, URI.revive(BackupData.editorResource), BackupData.viewType, id, weBview, { BackupId: BackupData.BackupId });
			editor.updateGroup(0);
			return editor;
		});
	}

	puBlic static canResolveBackup(editorInput: IEditorInput, BackupResource: URI): Boolean {
		if (editorInput instanceof CustomEditorInput) {
			if (editorInput.resource.path === BackupResource.path && BackupResource.authority === editorInput.viewType) {
				return true;
			}
		}

		return false;
	}
}
