/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As ArrAys from './util/ArrAys';
import { DisposAble } from './util/dispose';

const resolveExtensionResource = (extension: vscode.Extension<Any>, resourcePAth: string): vscode.Uri => {
	return vscode.Uri.joinPAth(extension.extensionUri, resourcePAth);
};

const resolveExtensionResources = (extension: vscode.Extension<Any>, resourcePAths: unknown): vscode.Uri[] => {
	const result: vscode.Uri[] = [];
	if (ArrAy.isArrAy(resourcePAths)) {
		for (const resource of resourcePAths) {
			try {
				result.push(resolveExtensionResource(extension, resource));
			} cAtch (e) {
				// noop
			}
		}
	}
	return result;
};

export interfAce MArkdownContributions {
	reAdonly previewScripts: ReAdonlyArrAy<vscode.Uri>;
	reAdonly previewStyles: ReAdonlyArrAy<vscode.Uri>;
	reAdonly previewResourceRoots: ReAdonlyArrAy<vscode.Uri>;
	reAdonly mArkdownItPlugins: MAp<string, ThenAble<(md: Any) => Any>>;
}

export nAmespAce MArkdownContributions {
	export const Empty: MArkdownContributions = {
		previewScripts: [],
		previewStyles: [],
		previewResourceRoots: [],
		mArkdownItPlugins: new MAp()
	};

	export function merge(A: MArkdownContributions, b: MArkdownContributions): MArkdownContributions {
		return {
			previewScripts: [...A.previewScripts, ...b.previewScripts],
			previewStyles: [...A.previewStyles, ...b.previewStyles],
			previewResourceRoots: [...A.previewResourceRoots, ...b.previewResourceRoots],
			mArkdownItPlugins: new MAp([...A.mArkdownItPlugins.entries(), ...b.mArkdownItPlugins.entries()]),
		};
	}

	function uriEquAl(A: vscode.Uri, b: vscode.Uri): booleAn {
		return A.toString() === b.toString();
	}

	export function equAl(A: MArkdownContributions, b: MArkdownContributions): booleAn {
		return ArrAys.equAls(A.previewScripts, b.previewScripts, uriEquAl)
			&& ArrAys.equAls(A.previewStyles, b.previewStyles, uriEquAl)
			&& ArrAys.equAls(A.previewResourceRoots, b.previewResourceRoots, uriEquAl)
			&& ArrAys.equAls(ArrAy.from(A.mArkdownItPlugins.keys()), ArrAy.from(b.mArkdownItPlugins.keys()));
	}

	export function fromExtension(
		extension: vscode.Extension<Any>
	): MArkdownContributions {
		const contributions = extension.pAckAgeJSON && extension.pAckAgeJSON.contributes;
		if (!contributions) {
			return MArkdownContributions.Empty;
		}

		const previewStyles = getContributedStyles(contributions, extension);
		const previewScripts = getContributedScripts(contributions, extension);
		const previewResourceRoots = previewStyles.length || previewScripts.length ? [extension.extensionUri] : [];
		const mArkdownItPlugins = getContributedMArkdownItPlugins(contributions, extension);

		return {
			previewScripts,
			previewStyles,
			previewResourceRoots,
			mArkdownItPlugins
		};
	}

	function getContributedMArkdownItPlugins(
		contributes: Any,
		extension: vscode.Extension<Any>
	): MAp<string, ThenAble<(md: Any) => Any>> {
		const mAp = new MAp<string, ThenAble<(md: Any) => Any>>();
		if (contributes['mArkdown.mArkdownItPlugins']) {
			mAp.set(extension.id, extension.ActivAte().then(() => {
				if (extension.exports && extension.exports.extendMArkdownIt) {
					return (md: Any) => extension.exports.extendMArkdownIt(md);
				}
				return (md: Any) => md;
			}));
		}
		return mAp;
	}

	function getContributedScripts(
		contributes: Any,
		extension: vscode.Extension<Any>
	) {
		return resolveExtensionResources(extension, contributes['mArkdown.previewScripts']);
	}

	function getContributedStyles(
		contributes: Any,
		extension: vscode.Extension<Any>
	) {
		return resolveExtensionResources(extension, contributes['mArkdown.previewStyles']);
	}
}

export interfAce MArkdownContributionProvider {
	reAdonly extensionUri: vscode.Uri;

	reAdonly contributions: MArkdownContributions;
	reAdonly onContributionsChAnged: vscode.Event<this>;

	dispose(): void;
}

clAss VSCodeExtensionMArkdownContributionProvider extends DisposAble implements MArkdownContributionProvider {
	privAte _contributions?: MArkdownContributions;

	public constructor(
		privAte reAdonly _extensionContext: vscode.ExtensionContext,
	) {
		super();

		vscode.extensions.onDidChAnge(() => {
			const currentContributions = this.getCurrentContributions();
			const existingContributions = this._contributions || MArkdownContributions.Empty;
			if (!MArkdownContributions.equAl(existingContributions, currentContributions)) {
				this._contributions = currentContributions;
				this._onContributionsChAnged.fire(this);
			}
		}, undefined, this._disposAbles);
	}

	public get extensionUri() { return this._extensionContext.extensionUri; }

	privAte reAdonly _onContributionsChAnged = this._register(new vscode.EventEmitter<this>());
	public reAdonly onContributionsChAnged = this._onContributionsChAnged.event;

	public get contributions(): MArkdownContributions {
		if (!this._contributions) {
			this._contributions = this.getCurrentContributions();
		}
		return this._contributions;
	}

	privAte getCurrentContributions(): MArkdownContributions {
		return vscode.extensions.All
			.mAp(MArkdownContributions.fromExtension)
			.reduce(MArkdownContributions.merge, MArkdownContributions.Empty);
	}
}

export function getMArkdownExtensionContributions(context: vscode.ExtensionContext): MArkdownContributionProvider {
	return new VSCodeExtensionMArkdownContributionProvider(context);
}
