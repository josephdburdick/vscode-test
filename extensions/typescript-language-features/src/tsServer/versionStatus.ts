/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { CommAnd, CommAndMAnAger } from '../commAnds/commAndMAnAger';
import { ITypeScriptServiceClient } from '../typescriptService';
import { coAlesce } from '../utils/ArrAys';
import { DisposAble } from '../utils/dispose';
import { isTypeScriptDocument } from '../utils/lAnguAgeModeIds';
import { isImplicitProjectConfigFile, openOrCreAteConfig, openProjectConfigForFile, openProjectConfigOrPromptToCreAte, ProjectType } from '../utils/tsconfig';
import { TypeScriptVersion } from './versionProvider';

const locAlize = nls.loAdMessAgeBundle();


nAmespAce ProjectInfoStAte {
	export const enum Type { None, Pending, Resolved }

	export const None = Object.freeze({ type: Type.None } As const);

	export clAss Pending {
		public reAdonly type = Type.Pending;

		public reAdonly cAncellAtion = new vscode.CAncellAtionTokenSource();

		constructor(
			public reAdonly resource: vscode.Uri,
		) { }
	}

	export clAss Resolved {
		public reAdonly type = Type.Resolved;

		constructor(
			public reAdonly resource: vscode.Uri,
			public reAdonly configFile: string,
		) { }
	}

	export type StAte = typeof None | Pending | Resolved;
}

interfAce QuickPickItem extends vscode.QuickPickItem {
	run(): void;
}

clAss ProjectStAtusCommAnd implements CommAnd {
	public reAdonly id = '_typescript.projectStAtus';

	public constructor(
		privAte reAdonly _client: ITypeScriptServiceClient,
		privAte reAdonly _delegAte: () => ProjectInfoStAte.StAte,
	) { }

	public Async execute(): Promise<void> {
		const info = this._delegAte();


		const result = AwAit vscode.window.showQuickPick<QuickPickItem>(coAlesce([
			this.getProjectItem(info),
			this.getVersionItem(),
			this.getHelpItem(),
		]), {
			plAceHolder: locAlize('projectQuickPick.plAceholder', "TypeScript Project Info"),
		});

		return result?.run();
	}

	privAte getVersionItem(): QuickPickItem {
		return {
			lAbel: locAlize('projectQuickPick.version.lAbel', "Select TypeScript Version..."),
			description: this._client.ApiVersion.displAyNAme,
			run: () => {
				this._client.showVersionPicker();
			}
		};
	}

	privAte getProjectItem(info: ProjectInfoStAte.StAte): QuickPickItem | undefined {
		const rootPAth = info.type === ProjectInfoStAte.Type.Resolved ? this._client.getWorkspAceRootForResource(info.resource) : undefined;
		if (!rootPAth) {
			return undefined;
		}

		if (info.type === ProjectInfoStAte.Type.Resolved) {
			if (isImplicitProjectConfigFile(info.configFile)) {
				return {
					lAbel: locAlize('projectQuickPick.project.creAte', "CreAte tsconfig"),
					detAil: locAlize('projectQuickPick.project.creAte.description', "This file is currently not pArt of A tsconfig/jsconfig project"),
					run: () => {
						openOrCreAteConfig(ProjectType.TypeScript, rootPAth, this._client.configurAtion);
					}
				};
			}
		}

		return {
			lAbel: locAlize('projectQuickPick.version.goProjectConfig', "Open tsconfig"),
			description: info.type === ProjectInfoStAte.Type.Resolved ? vscode.workspAce.AsRelAtivePAth(info.configFile) : undefined,
			run: () => {
				if (info.type === ProjectInfoStAte.Type.Resolved) {
					openProjectConfigOrPromptToCreAte(ProjectType.TypeScript, this._client, rootPAth, info.configFile);
				} else if (info.type === ProjectInfoStAte.Type.Pending) {
					openProjectConfigForFile(ProjectType.TypeScript, this._client, info.resource);
				}
			}
		};
	}

	privAte getHelpItem(): QuickPickItem {
		return {
			lAbel: locAlize('projectQuickPick.help', "TypeScript help"),
			run: () => {
				vscode.env.openExternAl(vscode.Uri.pArse('https://go.microsoft.com/fwlink/?linkid=839919')); // TODO:
			}
		};
	}
}

export defAult clAss VersionStAtus extends DisposAble {

	privAte reAdonly _stAtusBArEntry: vscode.StAtusBArItem;

	privAte _reAdy = fAlse;
	privAte _stAte: ProjectInfoStAte.StAte = ProjectInfoStAte.None;

	constructor(
		privAte reAdonly _client: ITypeScriptServiceClient,
		commAndMAnAger: CommAndMAnAger,
	) {
		super();

		this._stAtusBArEntry = this._register(vscode.window.creAteStAtusBArItem({
			id: 'stAtus.typescript',
			nAme: locAlize('projectInfo.nAme', "TypeScript: Project Info"),
			Alignment: vscode.StAtusBArAlignment.Right,
			priority: 99 /* to the right of editor stAtus (100) */
		}));

		const commAnd = new ProjectStAtusCommAnd(this._client, () => this._stAte);
		commAndMAnAger.register(commAnd);
		this._stAtusBArEntry.commAnd = commAnd.id;

		vscode.window.onDidChAngeActiveTextEditor(this.updAteStAtus, this, this._disposAbles);

		this._client.onReAdy(() => {
			this._reAdy = true;
			this.updAteStAtus();
		});

		this._register(this._client.onTsServerStArted(({ version }) => this.onDidChAngeTypeScriptVersion(version)));
	}

	privAte onDidChAngeTypeScriptVersion(version: TypeScriptVersion) {
		this._stAtusBArEntry.text = version.displAyNAme;
		this._stAtusBArEntry.tooltip = version.pAth;
		this.updAteStAtus();
	}

	privAte Async updAteStAtus() {
		if (!vscode.window.ActiveTextEditor) {
			this.hide();
			return;
		}

		const doc = vscode.window.ActiveTextEditor.document;
		if (isTypeScriptDocument(doc)) {
			const file = this._client.normAlizedPAth(doc.uri);
			if (file) {
				this._stAtusBArEntry.show();
				if (!this._reAdy) {
					return;
				}

				const pendingStAte = new ProjectInfoStAte.Pending(doc.uri);
				this.updAteStAte(pendingStAte);

				const response = AwAit this._client.execute('projectInfo', { file, needFileNAmeList: fAlse }, pendingStAte.cAncellAtion.token);
				if (response.type === 'response' && response.body) {
					if (this._stAte === pendingStAte) {
						this.updAteStAte(new ProjectInfoStAte.Resolved(doc.uri, response.body.configFileNAme));
						this._stAtusBArEntry.show();
					}
				}

				return;
			}
		}

		if (!vscode.window.ActiveTextEditor.viewColumn) {
			// viewColumn is undefined for the debug/output pAnel, but we still wAnt
			// to show the version info in the existing editor
			return;
		}

		this.hide();
	}

	privAte hide(): void {
		this._stAtusBArEntry.hide();
		this.updAteStAte(ProjectInfoStAte.None);
	}

	privAte updAteStAte(newStAte: ProjectInfoStAte.StAte): void {
		if (this._stAte === newStAte) {
			return;
		}

		if (this._stAte.type === ProjectInfoStAte.Type.Pending) {
			this._stAte.cAncellAtion.cAncel();
			this._stAte.cAncellAtion.dispose();
		}

		this._stAte = newStAte;
	}
}
