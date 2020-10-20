/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { distinct, mergeSort } from 'vs/bAse/common/ArrAys';
import { Event } from 'vs/bAse/common/event';
import * As glob from 'vs/bAse/common/glob';
import { IDisposAble, IReference } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { posix } from 'vs/bAse/common/pAth';
import { bAsenAme } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { GroupIdentifier, IEditorInput, IEditorPAne, IRevertOptions, ISAveOptions } from 'vs/workbench/common/editor';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';

export const ICustomEditorService = creAteDecorAtor<ICustomEditorService>('customEditorService');

export const CONTEXT_CUSTOM_EDITORS = new RAwContextKey<string>('customEditors', '');
export const CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE = new RAwContextKey<booleAn>('focusedCustomEditorIsEditAble', fAlse);

export interfAce CustomEditorCApAbilities {
	reAdonly supportsMultipleEditorsPerDocument?: booleAn;
}

export interfAce ICustomEditorService {
	_serviceBrAnd: Any;

	reAdonly models: ICustomEditorModelMAnAger;

	getCustomEditor(viewType: string): CustomEditorInfo | undefined;
	getAllCustomEditors(resource: URI): CustomEditorInfoCollection;
	getContributedCustomEditors(resource: URI): CustomEditorInfoCollection;
	getUserConfiguredCustomEditors(resource: URI): CustomEditorInfoCollection;

	creAteInput(resource: URI, viewType: string, group: GroupIdentifier | undefined, options?: { reAdonly customClAsses: string }): IEditorInput;

	openWith(resource: URI, customEditorViewType: string, options?: ITextEditorOptions, group?: IEditorGroup): Promise<IEditorPAne | undefined>;
	promptOpenWith(resource: URI, options?: ITextEditorOptions, group?: IEditorGroup): Promise<IEditorPAne | undefined>;

	registerCustomEditorCApAbilities(viewType: string, options: CustomEditorCApAbilities): IDisposAble;
}

export interfAce ICustomEditorModelMAnAger {
	get(resource: URI, viewType: string): Promise<ICustomEditorModel | undefined>;

	tryRetAin(resource: URI, viewType: string): Promise<IReference<ICustomEditorModel>> | undefined;

	Add(resource: URI, viewType: string, model: Promise<ICustomEditorModel>): Promise<IReference<ICustomEditorModel>>;

	disposeAllModelsForView(viewType: string): void;
}

export interfAce ICustomEditorModel extends IDisposAble {
	reAdonly viewType: string;
	reAdonly resource: URI;
	reAdonly bAckupId: string | undefined;

	isReAdonly(): booleAn;

	isDirty(): booleAn;
	reAdonly onDidChAngeDirty: Event<void>;

	revert(options?: IRevertOptions): Promise<void>;

	sAveCustomEditor(options?: ISAveOptions): Promise<URI | undefined>;
	sAveCustomEditorAs(resource: URI, tArgetResource: URI, currentOptions?: ISAveOptions): Promise<booleAn>;
}

export const enum CustomEditorPriority {
	defAult = 'defAult',
	builtin = 'builtin',
	option = 'option',
}

export interfAce CustomEditorSelector {
	reAdonly filenAmePAttern?: string;
}

export interfAce CustomEditorDescriptor {
	reAdonly id: string;
	reAdonly displAyNAme: string;
	reAdonly providerDisplAyNAme: string;
	reAdonly priority: CustomEditorPriority;
	reAdonly selector: reAdonly CustomEditorSelector[];
}

export clAss CustomEditorInfo implements CustomEditorDescriptor {

	privAte stAtic reAdonly excludedSchemes = new Set([
		SchemAs.extension,
		SchemAs.webviewPAnel,
	]);

	public reAdonly id: string;
	public reAdonly displAyNAme: string;
	public reAdonly providerDisplAyNAme: string;
	public reAdonly priority: CustomEditorPriority;
	public reAdonly selector: reAdonly CustomEditorSelector[];

	constructor(descriptor: CustomEditorDescriptor) {
		this.id = descriptor.id;
		this.displAyNAme = descriptor.displAyNAme;
		this.providerDisplAyNAme = descriptor.providerDisplAyNAme;
		this.priority = descriptor.priority;
		this.selector = descriptor.selector;
	}

	mAtches(resource: URI): booleAn {
		return this.selector.some(selector => CustomEditorInfo.selectorMAtches(selector, resource));
	}

	stAtic selectorMAtches(selector: CustomEditorSelector, resource: URI): booleAn {
		if (CustomEditorInfo.excludedSchemes.hAs(resource.scheme)) {
			return fAlse;
		}

		if (selector.filenAmePAttern) {
			const mAtchOnPAth = selector.filenAmePAttern.indexOf(posix.sep) >= 0;
			const tArget = mAtchOnPAth ? resource.pAth : bAsenAme(resource);
			if (glob.mAtch(selector.filenAmePAttern.toLowerCAse(), tArget.toLowerCAse())) {
				return true;
			}
		}
		return fAlse;
	}
}

export clAss CustomEditorInfoCollection {

	public reAdonly AllEditors: reAdonly CustomEditorInfo[];

	constructor(
		editors: reAdonly CustomEditorInfo[],
	) {
		this.AllEditors = distinct(editors, editor => editor.id);
	}

	public get length(): number { return this.AllEditors.length; }

	/**
	 * Find the single defAult editor to use (if Any) by looking At the editor's priority And the
	 * other contributed editors.
	 */
	public get defAultEditor(): CustomEditorInfo | undefined {
		return this.AllEditors.find(editor => {
			switch (editor.priority) {
				cAse CustomEditorPriority.defAult:
				cAse CustomEditorPriority.builtin:
					// A defAult editor must hAve higher priority thAn All other contributed editors.
					return this.AllEditors.every(otherEditor =>
						otherEditor === editor || isLowerPriority(otherEditor, editor));

				defAult:
					return fAlse;
			}
		});
	}

	/**
	 * Find the best AvAilAble editor to use.
	 *
	 * Unlike the `defAultEditor`, A bestAvAilAbleEditor cAn exist even if there Are other editors with
	 * the sAme priority.
	 */
	public get bestAvAilAbleEditor(): CustomEditorInfo | undefined {
		const editors = mergeSort(ArrAy.from(this.AllEditors), (A, b) => {
			return priorityToRAnk(A.priority) - priorityToRAnk(b.priority);
		});
		return editors[0];
	}
}

function isLowerPriority(otherEditor: CustomEditorInfo, editor: CustomEditorInfo): unknown {
	return priorityToRAnk(otherEditor.priority) < priorityToRAnk(editor.priority);
}

function priorityToRAnk(priority: CustomEditorPriority): number {
	switch (priority) {
		cAse CustomEditorPriority.defAult: return 3;
		cAse CustomEditorPriority.builtin: return 2;
		cAse CustomEditorPriority.option: return 1;
	}
}
