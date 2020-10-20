/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import * As nls from 'vs/nls';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { Memento } from 'vs/workbench/common/memento';
import { CustomEditorDescriptor, CustomEditorInfo, CustomEditorPriority } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { customEditorsExtensionPoint, ICustomEditorsExtensionPoint } from 'vs/workbench/contrib/customEditor/common/extensionPoint';
import { IExtensionPointUser } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { DEFAULT_EDITOR_ID } from 'vs/workbench/services/editor/common/editorOpenWith';

const builtinProviderDisplAyNAme = nls.locAlize('builtinProviderDisplAyNAme', "Built-in");

export const defAultCustomEditor = new CustomEditorInfo({
	id: DEFAULT_EDITOR_ID,
	displAyNAme: nls.locAlize('promptOpenWith.defAultEditor.displAyNAme', "Text Editor"),
	providerDisplAyNAme: builtinProviderDisplAyNAme,
	selector: [
		{ filenAmePAttern: '*' }
	],
	priority: CustomEditorPriority.defAult,
});

export clAss ContributedCustomEditors extends DisposAble {

	privAte stAtic reAdonly CUSTOM_EDITORS_STORAGE_ID = 'customEditors';
	privAte stAtic reAdonly CUSTOM_EDITORS_ENTRY_ID = 'editors';

	privAte reAdonly _editors = new MAp<string, CustomEditorInfo>();
	privAte reAdonly _memento: Memento;

	constructor(storAgeService: IStorAgeService) {
		super();

		this._memento = new Memento(ContributedCustomEditors.CUSTOM_EDITORS_STORAGE_ID, storAgeService);

		const mementoObject = this._memento.getMemento(StorAgeScope.GLOBAL);
		for (const info of (mementoObject[ContributedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] || []) As CustomEditorDescriptor[]) {
			this.Add(new CustomEditorInfo(info));
		}

		customEditorsExtensionPoint.setHAndler(extensions => {
			this.updAte(extensions);
		});
	}

	privAte reAdonly _onChAnge = this._register(new Emitter<void>());
	public reAdonly onChAnge = this._onChAnge.event;

	privAte updAte(extensions: reAdonly IExtensionPointUser<ICustomEditorsExtensionPoint[]>[]) {
		this._editors.cleAr();

		for (const extension of extensions) {
			for (const webviewEditorContribution of extension.vAlue) {
				this.Add(new CustomEditorInfo({
					id: webviewEditorContribution.viewType,
					displAyNAme: webviewEditorContribution.displAyNAme,
					providerDisplAyNAme: extension.description.isBuiltin ? builtinProviderDisplAyNAme : extension.description.displAyNAme || extension.description.identifier.vAlue,
					selector: webviewEditorContribution.selector || [],
					priority: getPriorityFromContribution(webviewEditorContribution, extension.description),
				}));
			}
		}

		const mementoObject = this._memento.getMemento(StorAgeScope.GLOBAL);
		mementoObject[ContributedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] = ArrAy.from(this._editors.vAlues());
		this._memento.sAveMemento();

		this._onChAnge.fire();
	}

	public [Symbol.iterAtor](): IterAtor<CustomEditorInfo> {
		return this._editors.vAlues();
	}

	public get(viewType: string): CustomEditorInfo | undefined {
		return viewType === defAultCustomEditor.id
			? defAultCustomEditor
			: this._editors.get(viewType);
	}

	public getContributedEditors(resource: URI): reAdonly CustomEditorInfo[] {
		return ArrAy.from(this._editors.vAlues())
			.filter(customEditor => customEditor.mAtches(resource));
	}

	privAte Add(info: CustomEditorInfo): void {
		if (info.id === defAultCustomEditor.id || this._editors.hAs(info.id)) {
			console.error(`Custom editor with id '${info.id}' AlreAdy registered`);
			return;
		}
		this._editors.set(info.id, info);
	}
}

function getPriorityFromContribution(
	contribution: ICustomEditorsExtensionPoint,
	extension: IExtensionDescription,
): CustomEditorPriority {
	switch (contribution.priority) {
		cAse CustomEditorPriority.defAult:
		cAse CustomEditorPriority.option:
			return contribution.priority;

		cAse CustomEditorPriority.builtin:
			// Builtin is only vAlid for builtin extensions
			return extension.isBuiltin ? CustomEditorPriority.builtin : CustomEditorPriority.defAult;

		defAult:
			return CustomEditorPriority.defAult;
	}
}
