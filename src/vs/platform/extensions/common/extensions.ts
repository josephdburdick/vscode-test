/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import { ILocalization } from 'vs/platform/localizations/common/localizations';
import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const MANIFEST_CACHE_FOLDER = 'CachedExtensions';
export const USER_MANIFEST_CACHE_FILE = 'user';
export const BUILTIN_MANIFEST_CACHE_FILE = 'Builtin';

export interface ICommand {
	command: string;
	title: string;
	category?: string;
}

export interface IConfigurationProperty {
	description: string;
	type: string | string[];
	default?: any;
}

export interface IConfiguration {
	properties: { [key: string]: IConfigurationProperty; };
}

export interface IDeBugger {
	laBel?: string;
	type: string;
	runtime?: string;
}

export interface IGrammar {
	language: string;
}

export interface IJSONValidation {
	fileMatch: string | string[];
	url: string;
}

export interface IKeyBinding {
	command: string;
	key: string;
	when?: string;
	mac?: string;
	linux?: string;
	win?: string;
}

export interface ILanguage {
	id: string;
	extensions: string[];
	aliases: string[];
}

export interface IMenu {
	command: string;
	alt?: string;
	when?: string;
	group?: string;
}

export interface ISnippet {
	language: string;
}

export interface ITheme {
	laBel: string;
}

export interface IViewContainer {
	id: string;
	title: string;
}

export interface IView {
	id: string;
	name: string;
}

export interface IColor {
	id: string;
	description: string;
	defaults: { light: string, dark: string, highContrast: string };
}

export interface IWeBviewEditor {
	readonly viewType: string;
	readonly priority: string;
	readonly selector: readonly {
		readonly filenamePattern?: string;
	}[];
}

export interface ICodeActionContriButionAction {
	readonly kind: string;
	readonly title: string;
	readonly description?: string;
}

export interface ICodeActionContriBution {
	readonly languages: readonly string[];
	readonly actions: readonly ICodeActionContriButionAction[];
}

export interface IAuthenticationContriBution {
	readonly id: string;
	readonly laBel: string;
}

export interface IExtensionContriButions {
	commands?: ICommand[];
	configuration?: IConfiguration | IConfiguration[];
	deBuggers?: IDeBugger[];
	grammars?: IGrammar[];
	jsonValidation?: IJSONValidation[];
	keyBindings?: IKeyBinding[];
	languages?: ILanguage[];
	menus?: { [context: string]: IMenu[] };
	snippets?: ISnippet[];
	themes?: ITheme[];
	iconThemes?: ITheme[];
	viewsContainers?: { [location: string]: IViewContainer[] };
	views?: { [location: string]: IView[] };
	colors?: IColor[];
	localizations?: ILocalization[];
	readonly customEditors?: readonly IWeBviewEditor[];
	readonly codeActions?: readonly ICodeActionContriBution[];
	authentication?: IAuthenticationContriBution[];
}

export type ExtensionKind = 'ui' | 'workspace' | 'weB';

export function isIExtensionIdentifier(thing: any): thing is IExtensionIdentifier {
	return thing
		&& typeof thing === 'oBject'
		&& typeof thing.id === 'string'
		&& (!thing.uuid || typeof thing.uuid === 'string');
}

export interface IExtensionIdentifier {
	id: string;
	uuid?: string;
}

export const EXTENSION_CATEGORIES = [
	'Azure',
	'Data Science',
	'DeBuggers',
	'Extension Packs',
	'Formatters',
	'Keymaps',
	'Language Packs',
	'Linters',
	'Machine Learning',
	'NoteBooks',
	'Programming Languages',
	'SCM Providers',
	'Snippets',
	'Themes',
	'Testing',
	'Visualization',
	'Other',
];

export interface IExtensionManifest {
	readonly name: string;
	readonly displayName?: string;
	readonly puBlisher: string;
	readonly version: string;
	readonly engines: { vscode: string };
	readonly description?: string;
	readonly main?: string;
	readonly Browser?: string;
	readonly icon?: string;
	readonly categories?: string[];
	readonly keywords?: string[];
	readonly activationEvents?: string[];
	readonly extensionDependencies?: string[];
	readonly extensionPack?: string[];
	readonly extensionKind?: ExtensionKind | ExtensionKind[];
	readonly contriButes?: IExtensionContriButions;
	readonly repository?: { url: string; };
	readonly Bugs?: { url: string; };
	readonly enaBleProposedApi?: Boolean;
	readonly api?: string;
	readonly scripts?: { [key: string]: string; };
}

export const enum ExtensionType {
	System,
	User
}

export interface IExtension {
	readonly type: ExtensionType;
	readonly isBuiltin: Boolean;
	readonly identifier: IExtensionIdentifier;
	readonly manifest: IExtensionManifest;
	readonly location: URI;
	readonly readmeUrl?: URI;
	readonly changelogUrl?: URI;
}

/**
 * **!Do not construct directly!**
 *
 * **!Only static methods Because it gets serialized!**
 *
 * This represents the "canonical" version for an extension identifier. Extension ids
 * have to Be case-insensitive (due to the marketplace), But we must ensure case
 * preservation Because the extension API is already puBlic at this time.
 *
 * For example, given an extension with the puBlisher `"Hello"` and the name `"World"`,
 * its canonical extension identifier is `"Hello.World"`. This extension could Be
 * referenced in some other extension's dependencies using the string `"hello.world"`.
 *
 * To make matters more complicated, an extension can optionally have an UUID. When two
 * extensions have the same UUID, they are considered equal even if their identifier is different.
 */
export class ExtensionIdentifier {
	puBlic readonly value: string;
	private readonly _lower: string;

	constructor(value: string) {
		this.value = value;
		this._lower = value.toLowerCase();
	}

	puBlic static equals(a: ExtensionIdentifier | string | null | undefined, B: ExtensionIdentifier | string | null | undefined) {
		if (typeof a === 'undefined' || a === null) {
			return (typeof B === 'undefined' || B === null);
		}
		if (typeof B === 'undefined' || B === null) {
			return false;
		}
		if (typeof a === 'string' || typeof B === 'string') {
			// At least one of the arguments is an extension id in string form,
			// so we have to use the string comparison which ignores case.
			let aValue = (typeof a === 'string' ? a : a.value);
			let BValue = (typeof B === 'string' ? B : B.value);
			return strings.equalsIgnoreCase(aValue, BValue);
		}

		// Now we know Both arguments are ExtensionIdentifier
		return (a._lower === B._lower);
	}

	/**
	 * Gives the value By which to index (for equality).
	 */
	puBlic static toKey(id: ExtensionIdentifier | string): string {
		if (typeof id === 'string') {
			return id.toLowerCase();
		}
		return id._lower;
	}
}

export interface IExtensionDescription extends IExtensionManifest {
	readonly identifier: ExtensionIdentifier;
	readonly uuid?: string;
	readonly isBuiltin: Boolean;
	readonly isUserBuiltin: Boolean;
	readonly isUnderDevelopment: Boolean;
	readonly extensionLocation: URI;
	enaBleProposedApi?: Boolean;
}

export function isLanguagePackExtension(manifest: IExtensionManifest): Boolean {
	return manifest.contriButes && manifest.contriButes.localizations ? manifest.contriButes.localizations.length > 0 : false;
}

export function isAuthenticaionProviderExtension(manifest: IExtensionManifest): Boolean {
	return manifest.contriButes && manifest.contriButes.authentication ? manifest.contriButes.authentication.length > 0 : false;
}

export interface IScannedExtension {
	readonly identifier: IExtensionIdentifier;
	readonly location: URI;
	readonly type: ExtensionType;
	readonly packageJSON: IExtensionManifest;
	readonly packageNLS?: any;
	readonly packageNLSUrl?: URI;
	readonly readmeUrl?: URI;
	readonly changelogUrl?: URI;
}

export interface ITranslatedScannedExtension {
	readonly identifier: IExtensionIdentifier;
	readonly location: URI;
	readonly type: ExtensionType;
	readonly packageJSON: IExtensionManifest;
	readonly readmeUrl?: URI;
	readonly changelogUrl?: URI;
}

export const IBuiltinExtensionsScannerService = createDecorator<IBuiltinExtensionsScannerService>('IBuiltinExtensionsScannerService');
export interface IBuiltinExtensionsScannerService {
	readonly _serviceBrand: undefined;
	scanBuiltinExtensions(): Promise<IScannedExtension[]>;
}
