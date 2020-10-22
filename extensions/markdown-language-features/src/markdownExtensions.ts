/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as arrays from './util/arrays';
import { DisposaBle } from './util/dispose';

const resolveExtensionResource = (extension: vscode.Extension<any>, resourcePath: string): vscode.Uri => {
	return vscode.Uri.joinPath(extension.extensionUri, resourcePath);
};

const resolveExtensionResources = (extension: vscode.Extension<any>, resourcePaths: unknown): vscode.Uri[] => {
	const result: vscode.Uri[] = [];
	if (Array.isArray(resourcePaths)) {
		for (const resource of resourcePaths) {
			try {
				result.push(resolveExtensionResource(extension, resource));
			} catch (e) {
				// noop
			}
		}
	}
	return result;
};

export interface MarkdownContriButions {
	readonly previewScripts: ReadonlyArray<vscode.Uri>;
	readonly previewStyles: ReadonlyArray<vscode.Uri>;
	readonly previewResourceRoots: ReadonlyArray<vscode.Uri>;
	readonly markdownItPlugins: Map<string, ThenaBle<(md: any) => any>>;
}

export namespace MarkdownContriButions {
	export const Empty: MarkdownContriButions = {
		previewScripts: [],
		previewStyles: [],
		previewResourceRoots: [],
		markdownItPlugins: new Map()
	};

	export function merge(a: MarkdownContriButions, B: MarkdownContriButions): MarkdownContriButions {
		return {
			previewScripts: [...a.previewScripts, ...B.previewScripts],
			previewStyles: [...a.previewStyles, ...B.previewStyles],
			previewResourceRoots: [...a.previewResourceRoots, ...B.previewResourceRoots],
			markdownItPlugins: new Map([...a.markdownItPlugins.entries(), ...B.markdownItPlugins.entries()]),
		};
	}

	function uriEqual(a: vscode.Uri, B: vscode.Uri): Boolean {
		return a.toString() === B.toString();
	}

	export function equal(a: MarkdownContriButions, B: MarkdownContriButions): Boolean {
		return arrays.equals(a.previewScripts, B.previewScripts, uriEqual)
			&& arrays.equals(a.previewStyles, B.previewStyles, uriEqual)
			&& arrays.equals(a.previewResourceRoots, B.previewResourceRoots, uriEqual)
			&& arrays.equals(Array.from(a.markdownItPlugins.keys()), Array.from(B.markdownItPlugins.keys()));
	}

	export function fromExtension(
		extension: vscode.Extension<any>
	): MarkdownContriButions {
		const contriButions = extension.packageJSON && extension.packageJSON.contriButes;
		if (!contriButions) {
			return MarkdownContriButions.Empty;
		}

		const previewStyles = getContriButedStyles(contriButions, extension);
		const previewScripts = getContriButedScripts(contriButions, extension);
		const previewResourceRoots = previewStyles.length || previewScripts.length ? [extension.extensionUri] : [];
		const markdownItPlugins = getContriButedMarkdownItPlugins(contriButions, extension);

		return {
			previewScripts,
			previewStyles,
			previewResourceRoots,
			markdownItPlugins
		};
	}

	function getContriButedMarkdownItPlugins(
		contriButes: any,
		extension: vscode.Extension<any>
	): Map<string, ThenaBle<(md: any) => any>> {
		const map = new Map<string, ThenaBle<(md: any) => any>>();
		if (contriButes['markdown.markdownItPlugins']) {
			map.set(extension.id, extension.activate().then(() => {
				if (extension.exports && extension.exports.extendMarkdownIt) {
					return (md: any) => extension.exports.extendMarkdownIt(md);
				}
				return (md: any) => md;
			}));
		}
		return map;
	}

	function getContriButedScripts(
		contriButes: any,
		extension: vscode.Extension<any>
	) {
		return resolveExtensionResources(extension, contriButes['markdown.previewScripts']);
	}

	function getContriButedStyles(
		contriButes: any,
		extension: vscode.Extension<any>
	) {
		return resolveExtensionResources(extension, contriButes['markdown.previewStyles']);
	}
}

export interface MarkdownContriButionProvider {
	readonly extensionUri: vscode.Uri;

	readonly contriButions: MarkdownContriButions;
	readonly onContriButionsChanged: vscode.Event<this>;

	dispose(): void;
}

class VSCodeExtensionMarkdownContriButionProvider extends DisposaBle implements MarkdownContriButionProvider {
	private _contriButions?: MarkdownContriButions;

	puBlic constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
	) {
		super();

		vscode.extensions.onDidChange(() => {
			const currentContriButions = this.getCurrentContriButions();
			const existingContriButions = this._contriButions || MarkdownContriButions.Empty;
			if (!MarkdownContriButions.equal(existingContriButions, currentContriButions)) {
				this._contriButions = currentContriButions;
				this._onContriButionsChanged.fire(this);
			}
		}, undefined, this._disposaBles);
	}

	puBlic get extensionUri() { return this._extensionContext.extensionUri; }

	private readonly _onContriButionsChanged = this._register(new vscode.EventEmitter<this>());
	puBlic readonly onContriButionsChanged = this._onContriButionsChanged.event;

	puBlic get contriButions(): MarkdownContriButions {
		if (!this._contriButions) {
			this._contriButions = this.getCurrentContriButions();
		}
		return this._contriButions;
	}

	private getCurrentContriButions(): MarkdownContriButions {
		return vscode.extensions.all
			.map(MarkdownContriButions.fromExtension)
			.reduce(MarkdownContriButions.merge, MarkdownContriButions.Empty);
	}
}

export function getMarkdownExtensionContriButions(context: vscode.ExtensionContext): MarkdownContriButionProvider {
	return new VSCodeExtensionMarkdownContriButionProvider(context);
}
