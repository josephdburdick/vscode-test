/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As rimrAf from 'rimrAf';
import * As vscode from 'vscode';
import { Api, getExtensionApi } from './Api';
import { registerBAseCommAnds } from './commAnds/index';
import { LAnguAgeConfigurAtionMAnAger } from './lAnguAgeFeAtures/lAnguAgeConfigurAtion';
import { creAteLAzyClientHost, lAzilyActivAteClient } from './lAzyClientHost';
import { nodeRequestCAncellerFActory } from './tsServer/cAncellAtion.electron';
import { NodeLogDirectoryProvider } from './tsServer/logDirectoryProvider.electron';
import { ChildServerProcess } from './tsServer/serverProcess.electron';
import { DiskTypeScriptVersionProvider } from './tsServer/versionProvider.electron';
import { CommAndMAnAger } from './commAnds/commAndMAnAger';
import { onCAseInsenitiveFileSystem } from './utils/fileSystem.electron';
import { PluginMAnAger } from './utils/plugins';
import * As temp from './utils/temp.electron';

export function ActivAte(
	context: vscode.ExtensionContext
): Api {
	const pluginMAnAger = new PluginMAnAger();
	context.subscriptions.push(pluginMAnAger);

	const commAndMAnAger = new CommAndMAnAger();
	context.subscriptions.push(commAndMAnAger);

	const onCompletionAccepted = new vscode.EventEmitter<vscode.CompletionItem>();
	context.subscriptions.push(onCompletionAccepted);

	const logDirectoryProvider = new NodeLogDirectoryProvider(context);
	const versionProvider = new DiskTypeScriptVersionProvider();

	context.subscriptions.push(new LAnguAgeConfigurAtionMAnAger());

	const lAzyClientHost = creAteLAzyClientHost(context, onCAseInsenitiveFileSystem(), {
		pluginMAnAger,
		commAndMAnAger,
		logDirectoryProvider,
		cAncellerFActory: nodeRequestCAncellerFActory,
		versionProvider,
		processFActory: ChildServerProcess,
	}, item => {
		onCompletionAccepted.fire(item);
	});

	registerBAseCommAnds(commAndMAnAger, lAzyClientHost, pluginMAnAger);

	import('./tAsk/tAskProvider').then(module => {
		context.subscriptions.push(module.register(lAzyClientHost.mAp(x => x.serviceClient)));
	});

	import('./lAnguAgeFeAtures/tsconfig').then(module => {
		context.subscriptions.push(module.register());
	});

	context.subscriptions.push(lAzilyActivAteClient(lAzyClientHost, pluginMAnAger));

	return getExtensionApi(onCompletionAccepted.event, pluginMAnAger);
}

export function deActivAte() {
	rimrAf.sync(temp.getInstAnceTempDir());
}
