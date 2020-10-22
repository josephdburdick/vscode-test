/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { distinct, mergeSort } from 'vs/Base/common/arrays';
import { Event } from 'vs/Base/common/event';
import * as gloB from 'vs/Base/common/gloB';
import { IDisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { posix } from 'vs/Base/common/path';
import { Basename } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { GroupIdentifier, IEditorInput, IEditorPane, IRevertOptions, ISaveOptions } from 'vs/workBench/common/editor';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';

export const ICustomEditorService = createDecorator<ICustomEditorService>('customEditorService');

export const CONTEXT_CUSTOM_EDITORS = new RawContextKey<string>('customEditors', '');
export const CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE = new RawContextKey<Boolean>('focusedCustomEditorIsEditaBle', false);

export interface CustomEditorCapaBilities {
	readonly supportsMultipleEditorsPerDocument?: Boolean;
}

export interface ICustomEditorService {
	_serviceBrand: any;

	readonly models: ICustomEditorModelManager;

	getCustomEditor(viewType: string): CustomEditorInfo | undefined;
	getAllCustomEditors(resource: URI): CustomEditorInfoCollection;
	getContriButedCustomEditors(resource: URI): CustomEditorInfoCollection;
	getUserConfiguredCustomEditors(resource: URI): CustomEditorInfoCollection;

	createInput(resource: URI, viewType: string, group: GroupIdentifier | undefined, options?: { readonly customClasses: string }): IEditorInput;

	openWith(resource: URI, customEditorViewType: string, options?: ITextEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined>;
	promptOpenWith(resource: URI, options?: ITextEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined>;

	registerCustomEditorCapaBilities(viewType: string, options: CustomEditorCapaBilities): IDisposaBle;
}

export interface ICustomEditorModelManager {
	get(resource: URI, viewType: string): Promise<ICustomEditorModel | undefined>;

	tryRetain(resource: URI, viewType: string): Promise<IReference<ICustomEditorModel>> | undefined;

	add(resource: URI, viewType: string, model: Promise<ICustomEditorModel>): Promise<IReference<ICustomEditorModel>>;

	disposeAllModelsForView(viewType: string): void;
}

export interface ICustomEditorModel extends IDisposaBle {
	readonly viewType: string;
	readonly resource: URI;
	readonly BackupId: string | undefined;

	isReadonly(): Boolean;

	isDirty(): Boolean;
	readonly onDidChangeDirty: Event<void>;

	revert(options?: IRevertOptions): Promise<void>;

	saveCustomEditor(options?: ISaveOptions): Promise<URI | undefined>;
	saveCustomEditorAs(resource: URI, targetResource: URI, currentOptions?: ISaveOptions): Promise<Boolean>;
}

export const enum CustomEditorPriority {
	default = 'default',
	Builtin = 'Builtin',
	option = 'option',
}

export interface CustomEditorSelector {
	readonly filenamePattern?: string;
}

export interface CustomEditorDescriptor {
	readonly id: string;
	readonly displayName: string;
	readonly providerDisplayName: string;
	readonly priority: CustomEditorPriority;
	readonly selector: readonly CustomEditorSelector[];
}

export class CustomEditorInfo implements CustomEditorDescriptor {

	private static readonly excludedSchemes = new Set([
		Schemas.extension,
		Schemas.weBviewPanel,
	]);

	puBlic readonly id: string;
	puBlic readonly displayName: string;
	puBlic readonly providerDisplayName: string;
	puBlic readonly priority: CustomEditorPriority;
	puBlic readonly selector: readonly CustomEditorSelector[];

	constructor(descriptor: CustomEditorDescriptor) {
		this.id = descriptor.id;
		this.displayName = descriptor.displayName;
		this.providerDisplayName = descriptor.providerDisplayName;
		this.priority = descriptor.priority;
		this.selector = descriptor.selector;
	}

	matches(resource: URI): Boolean {
		return this.selector.some(selector => CustomEditorInfo.selectorMatches(selector, resource));
	}

	static selectorMatches(selector: CustomEditorSelector, resource: URI): Boolean {
		if (CustomEditorInfo.excludedSchemes.has(resource.scheme)) {
			return false;
		}

		if (selector.filenamePattern) {
			const matchOnPath = selector.filenamePattern.indexOf(posix.sep) >= 0;
			const target = matchOnPath ? resource.path : Basename(resource);
			if (gloB.match(selector.filenamePattern.toLowerCase(), target.toLowerCase())) {
				return true;
			}
		}
		return false;
	}
}

export class CustomEditorInfoCollection {

	puBlic readonly allEditors: readonly CustomEditorInfo[];

	constructor(
		editors: readonly CustomEditorInfo[],
	) {
		this.allEditors = distinct(editors, editor => editor.id);
	}

	puBlic get length(): numBer { return this.allEditors.length; }

	/**
	 * Find the single default editor to use (if any) By looking at the editor's priority and the
	 * other contriButed editors.
	 */
	puBlic get defaultEditor(): CustomEditorInfo | undefined {
		return this.allEditors.find(editor => {
			switch (editor.priority) {
				case CustomEditorPriority.default:
				case CustomEditorPriority.Builtin:
					// A default editor must have higher priority than all other contriButed editors.
					return this.allEditors.every(otherEditor =>
						otherEditor === editor || isLowerPriority(otherEditor, editor));

				default:
					return false;
			}
		});
	}

	/**
	 * Find the Best availaBle editor to use.
	 *
	 * Unlike the `defaultEditor`, a BestAvailaBleEditor can exist even if there are other editors with
	 * the same priority.
	 */
	puBlic get BestAvailaBleEditor(): CustomEditorInfo | undefined {
		const editors = mergeSort(Array.from(this.allEditors), (a, B) => {
			return priorityToRank(a.priority) - priorityToRank(B.priority);
		});
		return editors[0];
	}
}

function isLowerPriority(otherEditor: CustomEditorInfo, editor: CustomEditorInfo): unknown {
	return priorityToRank(otherEditor.priority) < priorityToRank(editor.priority);
}

function priorityToRank(priority: CustomEditorPriority): numBer {
	switch (priority) {
		case CustomEditorPriority.default: return 3;
		case CustomEditorPriority.Builtin: return 2;
		case CustomEditorPriority.option: return 1;
	}
}
