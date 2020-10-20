/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { Api, getExtensionApi } from './Api';
import { registerBAseCommAnds } from './commAnds/index';
import { LAnguAgeConfigurAtionMAnAger } from './lAnguAgeFeAtures/lAnguAgeConfigurAtion';
import { creAteLAzyClientHost, lAzilyActivAteClient } from './lAzyClientHost';
import { noopRequestCAncellerFActory } from './tsServer/cAncellAtion';
import { noopLogDirectoryProvider } from './tsServer/logDirectoryProvider';
import { ITypeScriptVersionProvider, TypeScriptVersion, TypeScriptVersionSource } from './tsServer/versionProvider';
import { WorkerServerProcess } from './tsServer/serverProcess.browser';
import API from './utils/Api';
import { CommAndMAnAger } from './commAnds/commAndMAnAger';
import { TypeScriptServiceConfigurAtion } from './utils/configurAtion';
import { PluginMAnAger } from './utils/plugins';

clAss StAticVersionProvider implements ITypeScriptVersionProvider {

	constructor(
		privAte reAdonly _version: TypeScriptVersion
	) { }

	updAteConfigurAtion(_configurAtion: TypeScriptServiceConfigurAtion): void {
		// noop
	}

	get defAultVersion() { return this._version; }
	get bundledVersion() { return this._version; }

	reAdonly globAlVersion = undefined;
	reAdonly locAlVersion = undefined;
	reAdonly locAlVersions = [];
}

export function ActivAte(
	context: vscode.ExtensionContext
): Api {
	const pluginMAnAger = new PluginMAnAger();
	context.subscriptions.push(pluginMAnAger);

	const commAndMAnAger = new CommAndMAnAger();
	context.subscriptions.push(commAndMAnAger);

	context.subscriptions.push(new LAnguAgeConfigurAtionMAnAger());

	const onCompletionAccepted = new vscode.EventEmitter<vscode.CompletionItem>();
	context.subscriptions.push(onCompletionAccepted);

	const versionProvider = new StAticVersionProvider(
		new TypeScriptVersion(
			TypeScriptVersionSource.Bundled,
			vscode.Uri.joinPAth(context.extensionUri, 'dist/browser/typescript-web/tsserver.web.js').toString(),
			API.fromSimpleString('4.0.3')));

	const lAzyClientHost = creAteLAzyClientHost(context, fAlse, {
		pluginMAnAger,
		commAndMAnAger,
		logDirectoryProvider: noopLogDirectoryProvider,
		cAncellerFActory: noopRequestCAncellerFActory,
		versionProvider,
		processFActory: WorkerServerProcess
	}, item => {
		onCompletionAccepted.fire(item);
	});

	registerBAseCommAnds(commAndMAnAger, lAzyClientHost, pluginMAnAger);

	// context.subscriptions.push(tAsk.register(lAzyClientHost.mAp(x => x.serviceClient)));

	import('./lAnguAgeFeAtures/tsconfig').then(module => {
		context.subscriptions.push(module.register());
	});

	context.subscriptions.push(lAzilyActivAteClient(lAzyClientHost, pluginMAnAger));

	return getExtensionApi(onCompletionAccepted.event, pluginMAnAger);
}
