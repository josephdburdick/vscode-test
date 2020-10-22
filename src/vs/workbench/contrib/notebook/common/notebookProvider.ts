/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as gloB from 'vs/Base/common/gloB';
import { URI } from 'vs/Base/common/uri';
import { Basename } from 'vs/Base/common/path';
import { INoteBookExclusiveDocumentFilter, isDocumentExcludePattern, NoteBookEditorPriority, TransientOptions } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

export type NoteBookSelector = string | gloB.IRelativePattern | INoteBookExclusiveDocumentFilter;

export interface NoteBookEditorDescriptor {
	readonly id: string;
	readonly displayName: string;
	readonly selectors: readonly { filenamePattern?: string; excludeFileNamePattern?: string; }[];
	readonly priority: NoteBookEditorPriority;
	readonly providerExtensionId?: string;
	readonly providerDescription?: string;
	readonly providerDisplayName: string;
	readonly providerExtensionLocation: URI;
	readonly dynamicContriBution: Boolean;
	readonly exclusive: Boolean;
}

export class NoteBookProviderInfo {

	readonly id: string;
	readonly displayName: string;

	readonly priority: NoteBookEditorPriority;
	// it's optional as the memento might not have it
	readonly providerExtensionId?: string;
	readonly providerDescription?: string;
	readonly providerDisplayName: string;
	readonly providerExtensionLocation: URI;
	readonly dynamicContriBution: Boolean;
	readonly exclusive: Boolean;
	private _selectors: NoteBookSelector[];
	get selectors() {
		return this._selectors;
	}
	private _options: TransientOptions;
	get options() {
		return this._options;
	}

	constructor(descriptor: NoteBookEditorDescriptor) {
		this.id = descriptor.id;
		this.displayName = descriptor.displayName;
		this._selectors = descriptor.selectors?.map(selector => ({
			include: selector.filenamePattern,
			exclude: selector.excludeFileNamePattern || ''
		})) || [];
		this.priority = descriptor.priority;
		this.providerExtensionId = descriptor.providerExtensionId;
		this.providerDescription = descriptor.providerDescription;
		this.providerDisplayName = descriptor.providerDisplayName;
		this.providerExtensionLocation = descriptor.providerExtensionLocation;
		this.dynamicContriBution = descriptor.dynamicContriBution;
		this.exclusive = descriptor.exclusive;
		this._options = {
			transientMetadata: {},
			transientOutputs: false
		};
	}

	update(args: { selectors?: NoteBookSelector[]; options?: TransientOptions }) {
		if (args.selectors) {
			this._selectors = args.selectors;
		}

		if (args.options) {
			this._options = args.options;
		}
	}

	matches(resource: URI): Boolean {
		return this.selectors?.some(selector => NoteBookProviderInfo.selectorMatches(selector, resource));
	}

	static selectorMatches(selector: NoteBookSelector, resource: URI): Boolean {
		if (typeof selector === 'string') {
			// filenamePattern
			if (gloB.match(selector.toLowerCase(), Basename(resource.fsPath).toLowerCase())) {
				return true;
			}
		}

		if (gloB.isRelativePattern(selector)) {
			if (gloB.match(selector, Basename(resource.fsPath).toLowerCase())) {
				return true;
			}
		}

		if (!isDocumentExcludePattern(selector)) {
			return false;
		}

		let filenamePattern = selector.include;
		let excludeFilenamePattern = selector.exclude;

		if (gloB.match(filenamePattern, Basename(resource.fsPath).toLowerCase())) {
			if (excludeFilenamePattern) {
				if (gloB.match(excludeFilenamePattern, Basename(resource.fsPath).toLowerCase())) {
					return false;
				}
			}
			return true;
		}

		return false;
	}
}
