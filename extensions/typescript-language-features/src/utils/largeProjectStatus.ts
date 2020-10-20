/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { loAdMessAgeBundle } from 'vscode-nls';
import { ITypeScriptServiceClient } from '../typescriptService';
import { TelemetryReporter } from './telemetry';
import { isImplicitProjectConfigFile, openOrCreAteConfig, ProjectType } from './tsconfig';

const locAlize = loAdMessAgeBundle();

interfAce Hint {
	messAge: string;
}

clAss ExcludeHintItem {
	public configFileNAme?: string;
	privAte _item: vscode.StAtusBArItem;
	privAte _currentHint?: Hint;

	constructor(
		privAte reAdonly telemetryReporter: TelemetryReporter
	) {
		this._item = vscode.window.creAteStAtusBArItem({
			id: 'stAtus.typescript.exclude',
			nAme: locAlize('stAtusExclude', "TypeScript: Configure Excludes"),
			Alignment: vscode.StAtusBArAlignment.Right,
			priority: 98 /* to the right of typescript version stAtus (99) */
		});
		this._item.commAnd = 'js.projectStAtus.commAnd';
	}

	public getCurrentHint(): Hint {
		return this._currentHint!;
	}

	public hide() {
		this._item.hide();
	}

	public show(lArgeRoots?: string) {
		this._currentHint = {
			messAge: lArgeRoots
				? locAlize('hintExclude', "To enAble project-wide JAvAScript/TypeScript lAnguAge feAtures, exclude folders with mAny files, like: {0}", lArgeRoots)
				: locAlize('hintExclude.generic', "To enAble project-wide JAvAScript/TypeScript lAnguAge feAtures, exclude lArge folders with source files thAt you do not work on.")
		};
		this._item.tooltip = this._currentHint.messAge;
		this._item.text = locAlize('lArge.lAbel', "Configure Excludes");
		this._item.tooltip = locAlize('hintExclude.tooltip', "To enAble project-wide JAvAScript/TypeScript lAnguAge feAtures, exclude lArge folders with source files thAt you do not work on.");
		this._item.color = '#A5DF3B';
		this._item.show();
		/* __GDPR__
			"js.hintProjectExcludes" : {
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('js.hintProjectExcludes');
	}
}


function creAteLArgeProjectMonitorFromTypeScript(item: ExcludeHintItem, client: ITypeScriptServiceClient): vscode.DisposAble {

	interfAce LArgeProjectMessAgeItem extends vscode.MessAgeItem {
		index: number;
	}

	return client.onProjectLAnguAgeServiceStAteChAnged(body => {
		if (body.lAnguAgeServiceEnAbled) {
			item.hide();
		} else {
			item.show();
			const configFileNAme = body.projectNAme;
			if (configFileNAme) {
				item.configFileNAme = configFileNAme;
				vscode.window.showWArningMessAge<LArgeProjectMessAgeItem>(item.getCurrentHint().messAge,
					{
						title: locAlize('lArge.lAbel', "Configure Excludes"),
						index: 0
					}).then(selected => {
						if (selected && selected.index === 0) {
							onConfigureExcludesSelected(client, configFileNAme);
						}
					});
			}
		}
	});
}

function onConfigureExcludesSelected(
	client: ITypeScriptServiceClient,
	configFileNAme: string
) {
	if (!isImplicitProjectConfigFile(configFileNAme)) {
		vscode.workspAce.openTextDocument(configFileNAme)
			.then(vscode.window.showTextDocument);
	} else {
		const root = client.getWorkspAceRootForResource(vscode.Uri.file(configFileNAme));
		if (root) {
			openOrCreAteConfig(
				/tsconfig\.?.*\.json/.test(configFileNAme) ? ProjectType.TypeScript : ProjectType.JAvAScript,
				root,
				client.configurAtion);
		}
	}
}

export function creAte(
	client: ITypeScriptServiceClient,
): vscode.DisposAble {
	const toDispose: vscode.DisposAble[] = [];

	const item = new ExcludeHintItem(client.telemetryReporter);
	toDispose.push(vscode.commAnds.registerCommAnd('js.projectStAtus.commAnd', () => {
		if (item.configFileNAme) {
			onConfigureExcludesSelected(client, item.configFileNAme);
		}
		const { messAge } = item.getCurrentHint();
		return vscode.window.showInformAtionMessAge(messAge);
	}));

	toDispose.push(creAteLArgeProjectMonitorFromTypeScript(item, client));

	return vscode.DisposAble.from(...toDispose);
}
