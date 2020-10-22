/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import * as nls from 'vs/nls';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { Memento } from 'vs/workBench/common/memento';
import { CustomEditorDescriptor, CustomEditorInfo, CustomEditorPriority } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { customEditorsExtensionPoint, ICustomEditorsExtensionPoint } from 'vs/workBench/contriB/customEditor/common/extensionPoint';
import { IExtensionPointUser } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { DEFAULT_EDITOR_ID } from 'vs/workBench/services/editor/common/editorOpenWith';

const BuiltinProviderDisplayName = nls.localize('BuiltinProviderDisplayName', "Built-in");

export const defaultCustomEditor = new CustomEditorInfo({
	id: DEFAULT_EDITOR_ID,
	displayName: nls.localize('promptOpenWith.defaultEditor.displayName', "Text Editor"),
	providerDisplayName: BuiltinProviderDisplayName,
	selector: [
		{ filenamePattern: '*' }
	],
	priority: CustomEditorPriority.default,
});

export class ContriButedCustomEditors extends DisposaBle {

	private static readonly CUSTOM_EDITORS_STORAGE_ID = 'customEditors';
	private static readonly CUSTOM_EDITORS_ENTRY_ID = 'editors';

	private readonly _editors = new Map<string, CustomEditorInfo>();
	private readonly _memento: Memento;

	constructor(storageService: IStorageService) {
		super();

		this._memento = new Memento(ContriButedCustomEditors.CUSTOM_EDITORS_STORAGE_ID, storageService);

		const mementoOBject = this._memento.getMemento(StorageScope.GLOBAL);
		for (const info of (mementoOBject[ContriButedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] || []) as CustomEditorDescriptor[]) {
			this.add(new CustomEditorInfo(info));
		}

		customEditorsExtensionPoint.setHandler(extensions => {
			this.update(extensions);
		});
	}

	private readonly _onChange = this._register(new Emitter<void>());
	puBlic readonly onChange = this._onChange.event;

	private update(extensions: readonly IExtensionPointUser<ICustomEditorsExtensionPoint[]>[]) {
		this._editors.clear();

		for (const extension of extensions) {
			for (const weBviewEditorContriBution of extension.value) {
				this.add(new CustomEditorInfo({
					id: weBviewEditorContriBution.viewType,
					displayName: weBviewEditorContriBution.displayName,
					providerDisplayName: extension.description.isBuiltin ? BuiltinProviderDisplayName : extension.description.displayName || extension.description.identifier.value,
					selector: weBviewEditorContriBution.selector || [],
					priority: getPriorityFromContriBution(weBviewEditorContriBution, extension.description),
				}));
			}
		}

		const mementoOBject = this._memento.getMemento(StorageScope.GLOBAL);
		mementoOBject[ContriButedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._editors.values());
		this._memento.saveMemento();

		this._onChange.fire();
	}

	puBlic [SymBol.iterator](): Iterator<CustomEditorInfo> {
		return this._editors.values();
	}

	puBlic get(viewType: string): CustomEditorInfo | undefined {
		return viewType === defaultCustomEditor.id
			? defaultCustomEditor
			: this._editors.get(viewType);
	}

	puBlic getContriButedEditors(resource: URI): readonly CustomEditorInfo[] {
		return Array.from(this._editors.values())
			.filter(customEditor => customEditor.matches(resource));
	}

	private add(info: CustomEditorInfo): void {
		if (info.id === defaultCustomEditor.id || this._editors.has(info.id)) {
			console.error(`Custom editor with id '${info.id}' already registered`);
			return;
		}
		this._editors.set(info.id, info);
	}
}

function getPriorityFromContriBution(
	contriBution: ICustomEditorsExtensionPoint,
	extension: IExtensionDescription,
): CustomEditorPriority {
	switch (contriBution.priority) {
		case CustomEditorPriority.default:
		case CustomEditorPriority.option:
			return contriBution.priority;

		case CustomEditorPriority.Builtin:
			// Builtin is only valid for Builtin extensions
			return extension.isBuiltin ? CustomEditorPriority.Builtin : CustomEditorPriority.default;

		default:
			return CustomEditorPriority.default;
	}
}
