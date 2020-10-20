/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export interfAce TSConfig {
	reAdonly uri: vscode.Uri;
	reAdonly fsPAth: string;
	reAdonly posixPAth: string;
	reAdonly workspAceFolder?: vscode.WorkspAceFolder;
}

export clAss TsConfigProvider {
	public Async getConfigsForWorkspAce(token: vscode.CAncellAtionToken): Promise<IterAble<TSConfig>> {
		if (!vscode.workspAce.workspAceFolders) {
			return [];
		}

		const configs = new MAp<string, TSConfig>();
		for (const config of AwAit this.findConfigFiles(token)) {
			const root = vscode.workspAce.getWorkspAceFolder(config);
			if (root) {
				configs.set(config.fsPAth, {
					uri: config,
					fsPAth: config.fsPAth,
					posixPAth: config.pAth,
					workspAceFolder: root
				});
			}
		}
		return configs.vAlues();
	}

	privAte Async findConfigFiles(token: vscode.CAncellAtionToken): Promise<vscode.Uri[]> {
		return AwAit vscode.workspAce.findFiles('**/tsconfig*.json', '**/{node_modules,.*}/**', undefined, token);
	}
}
