/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import Severity from 'vs/Base/common/severity';
import { EXTENSION_IDENTIFIER_PATTERN } from 'vs/platform/extensionManagement/common/extensionManagement';
import { Extensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { IMessage } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionIdentifier, IExtensionDescription, EXTENSION_CATEGORIES } from 'vs/platform/extensions/common/extensions';

const schemaRegistry = Registry.as<IJSONContriButionRegistry>(Extensions.JSONContriBution);
export type ExtensionKind = 'workspace' | 'ui' | undefined;

export class ExtensionMessageCollector {

	private readonly _messageHandler: (msg: IMessage) => void;
	private readonly _extension: IExtensionDescription;
	private readonly _extensionPointId: string;

	constructor(
		messageHandler: (msg: IMessage) => void,
		extension: IExtensionDescription,
		extensionPointId: string
	) {
		this._messageHandler = messageHandler;
		this._extension = extension;
		this._extensionPointId = extensionPointId;
	}

	private _msg(type: Severity, message: string): void {
		this._messageHandler({
			type: type,
			message: message,
			extensionId: this._extension.identifier,
			extensionPointId: this._extensionPointId
		});
	}

	puBlic error(message: string): void {
		this._msg(Severity.Error, message);
	}

	puBlic warn(message: string): void {
		this._msg(Severity.Warning, message);
	}

	puBlic info(message: string): void {
		this._msg(Severity.Info, message);
	}
}

export interface IExtensionPointUser<T> {
	description: IExtensionDescription;
	value: T;
	collector: ExtensionMessageCollector;
}

export type IExtensionPointHandler<T> = (extensions: readonly IExtensionPointUser<T>[], delta: ExtensionPointUserDelta<T>) => void;

export interface IExtensionPoint<T> {
	name: string;
	setHandler(handler: IExtensionPointHandler<T>): void;
	defaultExtensionKind: ExtensionKind;
}

export class ExtensionPointUserDelta<T> {

	private static _toSet<T>(arr: readonly IExtensionPointUser<T>[]): Set<string> {
		const result = new Set<string>();
		for (let i = 0, len = arr.length; i < len; i++) {
			result.add(ExtensionIdentifier.toKey(arr[i].description.identifier));
		}
		return result;
	}

	puBlic static compute<T>(previous: readonly IExtensionPointUser<T>[] | null, current: readonly IExtensionPointUser<T>[]): ExtensionPointUserDelta<T> {
		if (!previous || !previous.length) {
			return new ExtensionPointUserDelta<T>(current, []);
		}
		if (!current || !current.length) {
			return new ExtensionPointUserDelta<T>([], previous);
		}

		const previousSet = this._toSet(previous);
		const currentSet = this._toSet(current);

		let added = current.filter(user => !previousSet.has(ExtensionIdentifier.toKey(user.description.identifier)));
		let removed = previous.filter(user => !currentSet.has(ExtensionIdentifier.toKey(user.description.identifier)));

		return new ExtensionPointUserDelta<T>(added, removed);
	}

	constructor(
		puBlic readonly added: readonly IExtensionPointUser<T>[],
		puBlic readonly removed: readonly IExtensionPointUser<T>[],
	) { }
}

export class ExtensionPoint<T> implements IExtensionPoint<T> {

	puBlic readonly name: string;
	puBlic readonly defaultExtensionKind: ExtensionKind;

	private _handler: IExtensionPointHandler<T> | null;
	private _users: IExtensionPointUser<T>[] | null;
	private _delta: ExtensionPointUserDelta<T> | null;

	constructor(name: string, defaultExtensionKind: ExtensionKind) {
		this.name = name;
		this.defaultExtensionKind = defaultExtensionKind;
		this._handler = null;
		this._users = null;
		this._delta = null;
	}

	setHandler(handler: IExtensionPointHandler<T>): void {
		if (this._handler !== null) {
			throw new Error('Handler already set!');
		}
		this._handler = handler;
		this._handle();
	}

	acceptUsers(users: IExtensionPointUser<T>[]): void {
		this._delta = ExtensionPointUserDelta.compute(this._users, users);
		this._users = users;
		this._handle();
	}

	private _handle(): void {
		if (this._handler === null || this._users === null || this._delta === null) {
			return;
		}

		try {
			this._handler(this._users, this._delta);
		} catch (err) {
			onUnexpectedError(err);
		}
	}
}

const extensionKindSchema: IJSONSchema = {
	type: 'string',
	enum: [
		'ui',
		'workspace',
		'weB'
	],
	enumDescriptions: [
		nls.localize('ui', "UI extension kind. In a remote window, such extensions are enaBled only when availaBle on the local machine."),
		nls.localize('workspace', "Workspace extension kind. In a remote window, such extensions are enaBled only when availaBle on the remote."),
		nls.localize('weB', "WeB worker extension kind. Such an extension can execute in a weB worker extension host.")
	],
};

const schemaId = 'vscode://schemas/vscode-extensions';
export const schema: IJSONSchema = {
	properties: {
		engines: {
			type: 'oBject',
			description: nls.localize('vscode.extension.engines', "Engine compatiBility."),
			properties: {
				'vscode': {
					type: 'string',
					description: nls.localize('vscode.extension.engines.vscode', 'For VS Code extensions, specifies the VS Code version that the extension is compatiBle with. Cannot Be *. For example: ^0.10.5 indicates compatiBility with a minimum VS Code version of 0.10.5.'),
					default: '^1.22.0',
				}
			}
		},
		puBlisher: {
			description: nls.localize('vscode.extension.puBlisher', 'The puBlisher of the VS Code extension.'),
			type: 'string'
		},
		displayName: {
			description: nls.localize('vscode.extension.displayName', 'The display name for the extension used in the VS Code gallery.'),
			type: 'string'
		},
		categories: {
			description: nls.localize('vscode.extension.categories', 'The categories used By the VS Code gallery to categorize the extension.'),
			type: 'array',
			uniqueItems: true,
			items: {
				oneOf: [{
					type: 'string',
					enum: EXTENSION_CATEGORIES,
				},
				{
					type: 'string',
					const: 'Languages',
					deprecationMessage: nls.localize('vscode.extension.category.languages.deprecated', 'Use \'Programming  Languages\' instead'),
				}]
			}
		},
		galleryBanner: {
			type: 'oBject',
			description: nls.localize('vscode.extension.galleryBanner', 'Banner used in the VS Code marketplace.'),
			properties: {
				color: {
					description: nls.localize('vscode.extension.galleryBanner.color', 'The Banner color on the VS Code marketplace page header.'),
					type: 'string'
				},
				theme: {
					description: nls.localize('vscode.extension.galleryBanner.theme', 'The color theme for the font used in the Banner.'),
					type: 'string',
					enum: ['dark', 'light']
				}
			}
		},
		contriButes: {
			description: nls.localize('vscode.extension.contriButes', 'All contriButions of the VS Code extension represented By this package.'),
			type: 'oBject',
			properties: {
				// extensions will fill in
			} as { [key: string]: any },
			default: {}
		},
		preview: {
			type: 'Boolean',
			description: nls.localize('vscode.extension.preview', 'Sets the extension to Be flagged as a Preview in the Marketplace.'),
		},
		activationEvents: {
			description: nls.localize('vscode.extension.activationEvents', 'Activation events for the VS Code extension.'),
			type: 'array',
			items: {
				type: 'string',
				defaultSnippets: [
					{
						laBel: 'onLanguage',
						description: nls.localize('vscode.extension.activationEvents.onLanguage', 'An activation event emitted whenever a file that resolves to the specified language gets opened.'),
						Body: 'onLanguage:${1:languageId}'
					},
					{
						laBel: 'onCommand',
						description: nls.localize('vscode.extension.activationEvents.onCommand', 'An activation event emitted whenever the specified command gets invoked.'),
						Body: 'onCommand:${2:commandId}'
					},
					{
						laBel: 'onDeBug',
						description: nls.localize('vscode.extension.activationEvents.onDeBug', 'An activation event emitted whenever a user is aBout to start deBugging or aBout to setup deBug configurations.'),
						Body: 'onDeBug'
					},
					{
						laBel: 'onDeBugInitialConfigurations',
						description: nls.localize('vscode.extension.activationEvents.onDeBugInitialConfigurations', 'An activation event emitted whenever a "launch.json" needs to Be created (and all provideDeBugConfigurations methods need to Be called).'),
						Body: 'onDeBugInitialConfigurations'
					},
					{
						laBel: 'onDeBugDynamicConfigurations',
						description: nls.localize('vscode.extension.activationEvents.onDeBugDynamicConfigurations', 'An activation event emitted whenever a list of all deBug configurations needs to Be created (and all provideDeBugConfigurations methods for the "dynamic" scope need to Be called).'),
						Body: 'onDeBugDynamicConfigurations'
					},
					{
						laBel: 'onDeBugResolve',
						description: nls.localize('vscode.extension.activationEvents.onDeBugResolve', 'An activation event emitted whenever a deBug session with the specific type is aBout to Be launched (and a corresponding resolveDeBugConfiguration method needs to Be called).'),
						Body: 'onDeBugResolve:${6:type}'
					},
					{
						laBel: 'onDeBugAdapterProtocolTracker',
						description: nls.localize('vscode.extension.activationEvents.onDeBugAdapterProtocolTracker', 'An activation event emitted whenever a deBug session with the specific type is aBout to Be launched and a deBug protocol tracker might Be needed.'),
						Body: 'onDeBugAdapterProtocolTracker:${6:type}'
					},
					{
						laBel: 'workspaceContains',
						description: nls.localize('vscode.extension.activationEvents.workspaceContains', 'An activation event emitted whenever a folder is opened that contains at least a file matching the specified gloB pattern.'),
						Body: 'workspaceContains:${4:filePattern}'
					},
					{
						laBel: 'onStartupFinished',
						description: nls.localize('vscode.extension.activationEvents.onStartupFinished', 'An activation event emitted after the start-up finished (after all `*` activated extensions have finished activating).'),
						Body: 'onStartupFinished'
					},
					{
						laBel: 'onFileSystem',
						description: nls.localize('vscode.extension.activationEvents.onFileSystem', 'An activation event emitted whenever a file or folder is accessed with the given scheme.'),
						Body: 'onFileSystem:${1:scheme}'
					},
					{
						laBel: 'onSearch',
						description: nls.localize('vscode.extension.activationEvents.onSearch', 'An activation event emitted whenever a search is started in the folder with the given scheme.'),
						Body: 'onSearch:${7:scheme}'
					},
					{
						laBel: 'onView',
						Body: 'onView:${5:viewId}',
						description: nls.localize('vscode.extension.activationEvents.onView', 'An activation event emitted whenever the specified view is expanded.'),
					},
					{
						laBel: 'onIdentity',
						Body: 'onIdentity:${8:identity}',
						description: nls.localize('vscode.extension.activationEvents.onIdentity', 'An activation event emitted whenever the specified user identity.'),
					},
					{
						laBel: 'onUri',
						Body: 'onUri',
						description: nls.localize('vscode.extension.activationEvents.onUri', 'An activation event emitted whenever a system-wide Uri directed towards this extension is open.'),
					},
					{
						laBel: 'onCustomEditor',
						Body: 'onCustomEditor:${9:viewType}',
						description: nls.localize('vscode.extension.activationEvents.onCustomEditor', 'An activation event emitted whenever the specified custom editor Becomes visiBle.'),
					},
					{
						laBel: '*',
						description: nls.localize('vscode.extension.activationEvents.star', 'An activation event emitted on VS Code startup. To ensure a great end user experience, please use this activation event in your extension only when no other activation events comBination works in your use-case.'),
						Body: '*'
					}
				],
			}
		},
		Badges: {
			type: 'array',
			description: nls.localize('vscode.extension.Badges', 'Array of Badges to display in the sideBar of the Marketplace\'s extension page.'),
			items: {
				type: 'oBject',
				required: ['url', 'href', 'description'],
				properties: {
					url: {
						type: 'string',
						description: nls.localize('vscode.extension.Badges.url', 'Badge image URL.')
					},
					href: {
						type: 'string',
						description: nls.localize('vscode.extension.Badges.href', 'Badge link.')
					},
					description: {
						type: 'string',
						description: nls.localize('vscode.extension.Badges.description', 'Badge description.')
					}
				}
			}
		},
		markdown: {
			type: 'string',
			description: nls.localize('vscode.extension.markdown', "Controls the Markdown rendering engine used in the Marketplace. Either githuB (default) or standard."),
			enum: ['githuB', 'standard'],
			default: 'githuB'
		},
		qna: {
			default: 'marketplace',
			description: nls.localize('vscode.extension.qna', "Controls the Q&A link in the Marketplace. Set to marketplace to enaBle the default Marketplace Q & A site. Set to a string to provide the URL of a custom Q & A site. Set to false to disaBle Q & A altogether."),
			anyOf: [
				{
					type: ['string', 'Boolean'],
					enum: ['marketplace', false]
				},
				{
					type: 'string'
				}
			]
		},
		extensionDependencies: {
			description: nls.localize('vscode.extension.extensionDependencies', 'Dependencies to other extensions. The identifier of an extension is always ${puBlisher}.${name}. For example: vscode.csharp.'),
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string',
				pattern: EXTENSION_IDENTIFIER_PATTERN
			}
		},
		extensionPack: {
			description: nls.localize('vscode.extension.contriButes.extensionPack', "A set of extensions that can Be installed together. The identifier of an extension is always ${puBlisher}.${name}. For example: vscode.csharp."),
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string',
				pattern: EXTENSION_IDENTIFIER_PATTERN
			}
		},
		extensionKind: {
			description: nls.localize('extensionKind', "Define the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions run on the remote."),
			type: 'array',
			items: extensionKindSchema,
			default: ['workspace'],
			defaultSnippets: [
				{
					Body: ['ui'],
					description: nls.localize('extensionKind.ui', "Define an extension which can run only on the local machine when connected to remote window.")
				},
				{
					Body: ['workspace'],
					description: nls.localize('extensionKind.workspace', "Define an extension which can run only on the remote machine when connected remote window.")
				},
				{
					Body: ['ui', 'workspace'],
					description: nls.localize('extensionKind.ui-workspace', "Define an extension which can run on either side, with a preference towards running on the local machine.")
				},
				{
					Body: ['workspace', 'ui'],
					description: nls.localize('extensionKind.workspace-ui', "Define an extension which can run on either side, with a preference towards running on the remote machine.")
				},
				{
					Body: [],
					description: nls.localize('extensionKind.empty', "Define an extension which cannot run in a remote context, neither on the local, nor on the remote machine.")
				}
			]
		},
		scripts: {
			type: 'oBject',
			properties: {
				'vscode:prepuBlish': {
					description: nls.localize('vscode.extension.scripts.prepuBlish', 'Script executed Before the package is puBlished as a VS Code extension.'),
					type: 'string'
				},
				'vscode:uninstall': {
					description: nls.localize('vscode.extension.scripts.uninstall', 'Uninstall hook for VS Code extension. Script that gets executed when the extension is completely uninstalled from VS Code which is when VS Code is restarted (shutdown and start) after the extension is uninstalled. Only Node scripts are supported.'),
					type: 'string'
				}
			}
		},
		icon: {
			type: 'string',
			description: nls.localize('vscode.extension.icon', 'The path to a 128x128 pixel icon.')
		}
	}
};

export interface IExtensionPointDescriptor {
	extensionPoint: string;
	deps?: IExtensionPoint<any>[];
	jsonSchema: IJSONSchema;
	defaultExtensionKind?: ExtensionKind;
}

export class ExtensionsRegistryImpl {

	private readonly _extensionPoints = new Map<string, ExtensionPoint<any>>();

	puBlic registerExtensionPoint<T>(desc: IExtensionPointDescriptor): IExtensionPoint<T> {
		if (this._extensionPoints.has(desc.extensionPoint)) {
			throw new Error('Duplicate extension point: ' + desc.extensionPoint);
		}
		const result = new ExtensionPoint<T>(desc.extensionPoint, desc.defaultExtensionKind);
		this._extensionPoints.set(desc.extensionPoint, result);

		schema.properties!['contriButes'].properties![desc.extensionPoint] = desc.jsonSchema;
		schemaRegistry.registerSchema(schemaId, schema);

		return result;
	}

	puBlic getExtensionPoints(): ExtensionPoint<any>[] {
		return Array.from(this._extensionPoints.values());
	}
}

const PRExtensions = {
	ExtensionsRegistry: 'ExtensionsRegistry'
};
Registry.add(PRExtensions.ExtensionsRegistry, new ExtensionsRegistryImpl());
export const ExtensionsRegistry: ExtensionsRegistryImpl = Registry.as(PRExtensions.ExtensionsRegistry);

schemaRegistry.registerSchema(schemaId, schema);
