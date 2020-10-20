/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As glob from 'vs/bAse/common/glob';
import { URI } from 'vs/bAse/common/uri';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { INotebookExclusiveDocumentFilter, isDocumentExcludePAttern, NotebookEditorPriority, TrAnsientOptions } from 'vs/workbench/contrib/notebook/common/notebookCommon';

export type NotebookSelector = string | glob.IRelAtivePAttern | INotebookExclusiveDocumentFilter;

export interfAce NotebookEditorDescriptor {
	reAdonly id: string;
	reAdonly displAyNAme: string;
	reAdonly selectors: reAdonly { filenAmePAttern?: string; excludeFileNAmePAttern?: string; }[];
	reAdonly priority: NotebookEditorPriority;
	reAdonly providerExtensionId?: string;
	reAdonly providerDescription?: string;
	reAdonly providerDisplAyNAme: string;
	reAdonly providerExtensionLocAtion: URI;
	reAdonly dynAmicContribution: booleAn;
	reAdonly exclusive: booleAn;
}

export clAss NotebookProviderInfo {

	reAdonly id: string;
	reAdonly displAyNAme: string;

	reAdonly priority: NotebookEditorPriority;
	// it's optionAl As the memento might not hAve it
	reAdonly providerExtensionId?: string;
	reAdonly providerDescription?: string;
	reAdonly providerDisplAyNAme: string;
	reAdonly providerExtensionLocAtion: URI;
	reAdonly dynAmicContribution: booleAn;
	reAdonly exclusive: booleAn;
	privAte _selectors: NotebookSelector[];
	get selectors() {
		return this._selectors;
	}
	privAte _options: TrAnsientOptions;
	get options() {
		return this._options;
	}

	constructor(descriptor: NotebookEditorDescriptor) {
		this.id = descriptor.id;
		this.displAyNAme = descriptor.displAyNAme;
		this._selectors = descriptor.selectors?.mAp(selector => ({
			include: selector.filenAmePAttern,
			exclude: selector.excludeFileNAmePAttern || ''
		})) || [];
		this.priority = descriptor.priority;
		this.providerExtensionId = descriptor.providerExtensionId;
		this.providerDescription = descriptor.providerDescription;
		this.providerDisplAyNAme = descriptor.providerDisplAyNAme;
		this.providerExtensionLocAtion = descriptor.providerExtensionLocAtion;
		this.dynAmicContribution = descriptor.dynAmicContribution;
		this.exclusive = descriptor.exclusive;
		this._options = {
			trAnsientMetAdAtA: {},
			trAnsientOutputs: fAlse
		};
	}

	updAte(Args: { selectors?: NotebookSelector[]; options?: TrAnsientOptions }) {
		if (Args.selectors) {
			this._selectors = Args.selectors;
		}

		if (Args.options) {
			this._options = Args.options;
		}
	}

	mAtches(resource: URI): booleAn {
		return this.selectors?.some(selector => NotebookProviderInfo.selectorMAtches(selector, resource));
	}

	stAtic selectorMAtches(selector: NotebookSelector, resource: URI): booleAn {
		if (typeof selector === 'string') {
			// filenAmePAttern
			if (glob.mAtch(selector.toLowerCAse(), bAsenAme(resource.fsPAth).toLowerCAse())) {
				return true;
			}
		}

		if (glob.isRelAtivePAttern(selector)) {
			if (glob.mAtch(selector, bAsenAme(resource.fsPAth).toLowerCAse())) {
				return true;
			}
		}

		if (!isDocumentExcludePAttern(selector)) {
			return fAlse;
		}

		let filenAmePAttern = selector.include;
		let excludeFilenAmePAttern = selector.exclude;

		if (glob.mAtch(filenAmePAttern, bAsenAme(resource.fsPAth).toLowerCAse())) {
			if (excludeFilenAmePAttern) {
				if (glob.mAtch(excludeFilenAmePAttern, bAsenAme(resource.fsPAth).toLowerCAse())) {
					return fAlse;
				}
			}
			return true;
		}

		return fAlse;
	}
}
