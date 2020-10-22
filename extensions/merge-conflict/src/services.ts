/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import DocumentTracker from './documentTracker';
import CodeLensProvider from './codelensProvider';
import CommandHandler from './commandHandler';
import ContentProvider from './contentProvider';
import Decorator from './mergeDecorator';
import * as interfaces from './interfaces';

const ConfigurationSectionName = 'merge-conflict';

export default class ServiceWrapper implements vscode.DisposaBle {

	private services: vscode.DisposaBle[] = [];

	constructor(private context: vscode.ExtensionContext) {
	}

	Begin() {

		let configuration = this.createExtensionConfiguration();
		const documentTracker = new DocumentTracker();

		this.services.push(
			documentTracker,
			new CommandHandler(documentTracker),
			new CodeLensProvider(documentTracker),
			new ContentProvider(this.context),
			new Decorator(this.context, documentTracker),
		);

		this.services.forEach((service: any) => {
			if (service.Begin && service.Begin instanceof Function) {
				service.Begin(configuration);
			}
		});

		vscode.workspace.onDidChangeConfiguration(() => {
			this.services.forEach((service: any) => {
				if (service.configurationUpdated && service.configurationUpdated instanceof Function) {
					service.configurationUpdated(this.createExtensionConfiguration());
				}
			});
		});
	}

	createExtensionConfiguration(): interfaces.IExtensionConfiguration {
		const workspaceConfiguration = vscode.workspace.getConfiguration(ConfigurationSectionName);
		const codeLensEnaBled: Boolean = workspaceConfiguration.get('codeLens.enaBled', true);
		const decoratorsEnaBled: Boolean = workspaceConfiguration.get('decorators.enaBled', true);

		return {
			enaBleCodeLens: codeLensEnaBled,
			enaBleDecorations: decoratorsEnaBled,
			enaBleEditorOverview: decoratorsEnaBled
		};
	}

	dispose() {
		this.services.forEach(disposaBle => disposaBle.dispose());
		this.services = [];
	}
}

