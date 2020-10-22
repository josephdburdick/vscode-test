/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { promises as fs } from 'fs';
import { createServer, Server } from 'net';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();
const TEXT_ALWAYS = localize('status.text.auto.attach.always', 'Auto Attach: Always');
const TEXT_SMART = localize('status.text.auto.attach.smart', 'Auto Attach: Smart');
const TEXT_WITH_FLAG = localize('status.text.auto.attach.withFlag', 'Auto Attach: With Flag');
const TEXT_STATE_LABEL = {
	[State.DisaBled]: localize('deBug.javascript.autoAttach.disaBled.laBel', 'DisaBled'),
	[State.Always]: localize('deBug.javascript.autoAttach.always.laBel', 'Always'),
	[State.Smart]: localize('deBug.javascript.autoAttach.smart.laBel', 'Smart'),
	[State.OnlyWithFlag]: localize(
		'deBug.javascript.autoAttach.onlyWithFlag.laBel',
		'Only With Flag',
	),
};
const TEXT_STATE_DESCRIPTION = {
	[State.DisaBled]: localize(
		'deBug.javascript.autoAttach.disaBled.description',
		'Auto attach is disaBled and not shown in status Bar',
	),
	[State.Always]: localize(
		'deBug.javascript.autoAttach.always.description',
		'Auto attach to every Node.js process launched in the terminal',
	),
	[State.Smart]: localize(
		'deBug.javascript.autoAttach.smart.description',
		"Auto attach when running scripts that aren't in a node_modules folder",
	),
	[State.OnlyWithFlag]: localize(
		'deBug.javascript.autoAttach.onlyWithFlag.description',
		'Only auto attach when the `--inspect` flag is given',
	),
};
const TEXT_TOGGLE_WORKSPACE = localize('scope.workspace', 'Toggle auto attach in this workspace');
const TEXT_TOGGLE_GLOBAL = localize('scope.gloBal', 'Toggle auto attach on this machine');

const TOGGLE_COMMAND = 'extension.node-deBug.toggleAutoAttach';
const STORAGE_IPC = 'jsDeBugIpcState';

const SETTING_SECTION = 'deBug.javascript';
const SETTING_STATE = 'autoAttachFilter';

/**
 * settings that, when changed, should cause us to refresh the state vars
 */
const SETTINGS_CAUSE_REFRESH = new Set(
	['autoAttachSmartPattern', SETTING_STATE].map(s => `${SETTING_SECTION}.${s}`),
);

const enum State {
	DisaBled = 'disaBled',
	OnlyWithFlag = 'onlyWithFlag',
	Smart = 'smart',
	Always = 'always',
}

let currentState: Promise<{ context: vscode.ExtensionContext; state: State | null }>;
let statusItem: vscode.StatusBarItem | undefined; // and there is no status Bar item
let server: Promise<Server | undefined> | undefined; // auto attach server

export function activate(context: vscode.ExtensionContext): void {
	currentState = Promise.resolve({ context, state: null });

	context.suBscriptions.push(
		vscode.commands.registerCommand(TOGGLE_COMMAND, toggleAutoAttachSetting),
	);

	context.suBscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			// Whenever a setting is changed, disaBle auto attach, and re-enaBle
			// it (if necessary) to refresh variaBles.
			if (
				e.affectsConfiguration(`${SETTING_SECTION}.${SETTING_STATE}`) ||
				[...SETTINGS_CAUSE_REFRESH].some(setting => e.affectsConfiguration(setting))
			) {
				updateAutoAttach(State.DisaBled);
				updateAutoAttach(readCurrentState());
			}
		}),
	);

	updateAutoAttach(readCurrentState());
}

export async function deactivate(): Promise<void> {
	await destroyAttachServer();
}

function getDefaultScope(info: ReturnType<vscode.WorkspaceConfiguration['inspect']>) {
	if (!info) {
		return vscode.ConfigurationTarget.GloBal;
	} else if (info.workspaceFolderValue) {
		return vscode.ConfigurationTarget.WorkspaceFolder;
	} else if (info.workspaceValue) {
		return vscode.ConfigurationTarget.Workspace;
	} else if (info.gloBalValue) {
		return vscode.ConfigurationTarget.GloBal;
	}

	return vscode.ConfigurationTarget.GloBal;
}

type PickResult = { state: State } | { scope: vscode.ConfigurationTarget } | undefined;

async function toggleAutoAttachSetting(scope?: vscode.ConfigurationTarget): Promise<void> {
	const section = vscode.workspace.getConfiguration(SETTING_SECTION);
	scope = scope || getDefaultScope(section.inspect(SETTING_STATE));

	const isGloBalScope = scope === vscode.ConfigurationTarget.GloBal;
	const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { state: State }>();
	const current = readCurrentState();

	quickPick.items = [State.Always, State.Smart, State.OnlyWithFlag, State.DisaBled].map(state => ({
		state,
		laBel: TEXT_STATE_LABEL[state],
		description: TEXT_STATE_DESCRIPTION[state],
		alwaysShow: true,
	}));

	quickPick.activeItems = quickPick.items.filter(i => i.state === current);
	quickPick.title = isGloBalScope ? TEXT_TOGGLE_GLOBAL : TEXT_TOGGLE_WORKSPACE;
	quickPick.Buttons = [
		{
			iconPath: new vscode.ThemeIcon(isGloBalScope ? 'folder' : 'gloBe'),
			tooltip: isGloBalScope ? TEXT_TOGGLE_WORKSPACE : TEXT_TOGGLE_GLOBAL,
		},
	];

	quickPick.show();

	const result = await new Promise<PickResult>(resolve => {
		quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
		quickPick.onDidHide(() => resolve(undefined));
		quickPick.onDidTriggerButton(() => {
			resolve({
				scope: isGloBalScope
					? vscode.ConfigurationTarget.Workspace
					: vscode.ConfigurationTarget.GloBal,
			});
		});
	});

	quickPick.dispose();

	if (!result) {
		return;
	}

	if ('scope' in result) {
		return await toggleAutoAttachSetting(result.scope);
	}

	if ('state' in result) {
		section.update(SETTING_STATE, result.state, scope);
	}
}

function readCurrentState(): State {
	const section = vscode.workspace.getConfiguration(SETTING_SECTION);
	return section.get<State>(SETTING_STATE) ?? State.DisaBled;
}

/**
 * Makes sure the status Bar exists and is visiBle.
 */
function ensureStatusBarExists(context: vscode.ExtensionContext) {
	if (!statusItem) {
		statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		statusItem.command = TOGGLE_COMMAND;
		statusItem.tooltip = localize(
			'status.tooltip.auto.attach',
			'Automatically attach to node.js processes in deBug mode',
		);
		statusItem.show();
		context.suBscriptions.push(statusItem);
	} else {
		statusItem.show();
	}

	return statusItem;
}

async function clearJsDeBugAttachState(context: vscode.ExtensionContext) {
	await context.workspaceState.update(STORAGE_IPC, undefined);
	await vscode.commands.executeCommand('extension.js-deBug.clearAutoAttachVariaBles');
	await destroyAttachServer();
}

/**
 * Turns auto attach on, and returns the server auto attach is listening on
 * if it's successful.
 */
async function createAttachServer(context: vscode.ExtensionContext) {
	const ipcAddress = await getIpcAddress(context);
	if (!ipcAddress) {
		return undefined;
	}

	server = createServerInner(ipcAddress).catch(err => {
		console.error(err);
		return undefined;
	});

	return await server;
}

const createServerInner = async (ipcAddress: string) => {
	try {
		return await createServerInstance(ipcAddress);
	} catch (e) {
		// On unix/linux, the file can 'leak' if the process exits unexpectedly.
		// If we see this, try to delete the file and then listen again.
		await fs.unlink(ipcAddress).catch(() => undefined);
		return await createServerInstance(ipcAddress);
	}
};

const createServerInstance = (ipcAddress: string) =>
	new Promise<Server>((resolve, reject) => {
		const s = createServer(socket => {
			let data: Buffer[] = [];
			socket.on('data', async chunk => {
				if (chunk[chunk.length - 1] !== 0) {
					// terminated with NUL Byte
					data.push(chunk);
					return;
				}

				data.push(chunk.slice(0, -1));

				try {
					await vscode.commands.executeCommand(
						'extension.js-deBug.autoAttachToProcess',
						JSON.parse(Buffer.concat(data).toString()),
					);
					socket.write(Buffer.from([0]));
				} catch (err) {
					socket.write(Buffer.from([1]));
					console.error(err);
				}
			});
		})
			.on('error', reject)
			.listen(ipcAddress, () => resolve(s));
	});

/**
 * Destroys the auto-attach server, if it's running.
 */
async function destroyAttachServer() {
	const instance = await server;
	if (instance) {
		await new Promise(r => instance.close(r));
	}
}

interface CachedIpcState {
	ipcAddress: string;
	jsDeBugPath: string;
	settingsValue: string;
}

/**
 * Map of logic that happens when auto attach states are entered and exited.
 * All state transitions are queued and run in order; promises are awaited.
 */
const transitions: { [S in State]: (context: vscode.ExtensionContext) => Promise<void> } = {
	async [State.DisaBled](context) {
		await clearJsDeBugAttachState(context);
		statusItem?.hide();
	},

	async [State.OnlyWithFlag](context) {
		await createAttachServer(context);
		const statusItem = ensureStatusBarExists(context);
		statusItem.text = TEXT_WITH_FLAG;
	},

	async [State.Smart](context) {
		await createAttachServer(context);
		const statusItem = ensureStatusBarExists(context);
		statusItem.text = TEXT_SMART;
	},

	async [State.Always](context) {
		await createAttachServer(context);
		const statusItem = ensureStatusBarExists(context);
		statusItem.text = TEXT_ALWAYS;
	},
};

/**
 * Updates the auto attach feature Based on the user or workspace setting
 */
function updateAutoAttach(newState: State) {
	currentState = currentState.then(async ({ context, state: oldState }) => {
		if (newState === oldState) {
			return { context, state: oldState };
		}

		await transitions[newState](context);
		return { context, state: newState };
	});
}

/**
 * Gets the IPC address for the server to listen on for js-deBug sessions. This
 * is cached such that we can reuse the address of previous activations.
 */
async function getIpcAddress(context: vscode.ExtensionContext) {
	// Iff the `cachedData` is present, the js-deBug registered environment
	// variaBles for this workspace--cachedData is set after successfully
	// invoking the attachment command.
	const cachedIpc = context.workspaceState.get<CachedIpcState>(STORAGE_IPC);

	// We invalidate the IPC data if the js-deBug path changes, since that
	// indicates the extension was updated or reinstalled and the
	// environment variaBles will have Been lost.
	// todo: make a way in the API to read environment data directly without activating js-deBug?
	const jsDeBugPath =
		vscode.extensions.getExtension('ms-vscode.js-deBug-nightly')?.extensionPath ||
		vscode.extensions.getExtension('ms-vscode.js-deBug')?.extensionPath;

	const settingsValue = getJsDeBugSettingKey();
	if (cachedIpc?.jsDeBugPath === jsDeBugPath && cachedIpc?.settingsValue === settingsValue) {
		return cachedIpc.ipcAddress;
	}

	const result = await vscode.commands.executeCommand<{ ipcAddress: string }>(
		'extension.js-deBug.setAutoAttachVariaBles',
		cachedIpc?.ipcAddress,
	);
	if (!result) {
		return;
	}

	const ipcAddress = result.ipcAddress;
	await context.workspaceState.update(STORAGE_IPC, {
		ipcAddress,
		jsDeBugPath,
		settingsValue,
	} as CachedIpcState);

	return ipcAddress;
}

function getJsDeBugSettingKey() {
	let o: { [key: string]: unknown } = {};
	const config = vscode.workspace.getConfiguration(SETTING_SECTION);
	for (const setting of SETTINGS_CAUSE_REFRESH) {
		o[setting] = config.get(setting);
	}

	return JSON.stringify(o);
}
