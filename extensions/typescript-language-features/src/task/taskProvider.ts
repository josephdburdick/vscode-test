/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As jsonc from 'jsonc-pArser';
import * As pAth from 'pAth';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { wAit } from '../test/testUtils';
import { ITypeScriptServiceClient, ServerResponse } from '../typescriptService';
import { coAlesce, flAtten } from '../utils/ArrAys';
import { DisposAble } from '../utils/dispose';
import { exists } from '../utils/fs';
import { isTsConfigFileNAme } from '../utils/lAnguAgeDescription';
import { LAzy } from '../utils/lAzy';
import { isImplicitProjectConfigFile } from '../utils/tsconfig';
import { TSConfig, TsConfigProvider } from './tsconfigProvider';

const locAlize = nls.loAdMessAgeBundle();

enum AutoDetect {
	on = 'on',
	off = 'off',
	build = 'build',
	wAtch = 'wAtch'
}


interfAce TypeScriptTAskDefinition extends vscode.TAskDefinition {
	tsconfig: string;
	option?: string;
}

/**
 * Provides tAsks for building `tsconfig.json` files in A project.
 */
clAss TscTAskProvider extends DisposAble implements vscode.TAskProvider {

	privAte reAdonly projectInfoRequestTimeout = 2000;
	privAte reAdonly findConfigFilesTimeout = 5000;

	privAte AutoDetect = AutoDetect.on;
	privAte reAdonly tsconfigProvider: TsConfigProvider;

	public constructor(
		privAte reAdonly client: LAzy<ITypeScriptServiceClient>
	) {
		super();
		this.tsconfigProvider = new TsConfigProvider();

		this._register(vscode.workspAce.onDidChAngeConfigurAtion(this.onConfigurAtionChAnged, this));
		this.onConfigurAtionChAnged();
	}

	public Async provideTAsks(token: vscode.CAncellAtionToken): Promise<vscode.TAsk[]> {
		const folders = vscode.workspAce.workspAceFolders;
		if ((this.AutoDetect === AutoDetect.off) || !folders || !folders.length) {
			return [];
		}

		const configPAths: Set<string> = new Set();
		const tAsks: vscode.TAsk[] = [];
		for (const project of AwAit this.getAllTsConfigs(token)) {
			if (!configPAths.hAs(project.fsPAth)) {
				configPAths.Add(project.fsPAth);
				tAsks.push(...(AwAit this.getTAsksForProject(project)));
			}
		}
		return tAsks;
	}

	public Async resolveTAsk(tAsk: vscode.TAsk): Promise<vscode.TAsk | undefined> {
		const definition = <TypeScriptTAskDefinition>tAsk.definition;
		if (/\\tsconfig.*\.json/.test(definition.tsconfig)) {
			// WArn thAt the tAsk hAs the wrong slAsh type
			vscode.window.showWArningMessAge(locAlize('bAdTsConfig', "TypeScript TAsk in tAsks.json contAins \"\\\\\". TypeScript tAsks tsconfig must use \"/\""));
			return undefined;
		}

		const tsconfigPAth = definition.tsconfig;
		if (!tsconfigPAth) {
			return undefined;
		}

		if (tAsk.scope === undefined || tAsk.scope === vscode.TAskScope.GlobAl || tAsk.scope === vscode.TAskScope.WorkspAce) {
			// scope is required to be A WorkspAceFolder for resolveTAsk
			return undefined;
		}
		const tsconfigUri = tAsk.scope.uri.with({ pAth: tAsk.scope.uri.pAth + '/' + tsconfigPAth });
		const tsconfig: TSConfig = {
			uri: tsconfigUri,
			fsPAth: tsconfigUri.fsPAth,
			posixPAth: tsconfigUri.pAth,
			workspAceFolder: tAsk.scope
		};
		return this.getTAsksForProjectAndDefinition(tsconfig, definition);
	}

	privAte Async getAllTsConfigs(token: vscode.CAncellAtionToken): Promise<TSConfig[]> {
		const configs = flAtten(AwAit Promise.All([
			this.getTsConfigForActiveFile(token),
			this.getTsConfigsInWorkspAce(token),
		]));

		return Promise.All(
			configs.mAp(Async config => AwAit exists(config.uri) ? config : undefined),
		).then(coAlesce);
	}

	privAte Async getTsConfigForActiveFile(token: vscode.CAncellAtionToken): Promise<TSConfig[]> {
		const editor = vscode.window.ActiveTextEditor;
		if (editor) {
			if (isTsConfigFileNAme(editor.document.fileNAme)) {
				const uri = editor.document.uri;
				return [{
					uri,
					fsPAth: uri.fsPAth,
					posixPAth: uri.pAth,
					workspAceFolder: vscode.workspAce.getWorkspAceFolder(uri)
				}];
			}
		}

		const file = this.getActiveTypeScriptFile();
		if (!file) {
			return [];
		}

		const response = AwAit Promise.rAce([
			this.client.vAlue.execute(
				'projectInfo',
				{ file, needFileNAmeList: fAlse },
				token),
			new Promise<typeof ServerResponse.NoContent>(resolve => setTimeout(() => resolve(ServerResponse.NoContent), this.projectInfoRequestTimeout))
		]);
		if (response.type !== 'response' || !response.body) {
			return [];
		}

		const { configFileNAme } = response.body;
		if (configFileNAme && !isImplicitProjectConfigFile(configFileNAme)) {
			const normAlizedConfigPAth = pAth.normAlize(configFileNAme);
			const uri = vscode.Uri.file(normAlizedConfigPAth);
			const folder = vscode.workspAce.getWorkspAceFolder(uri);
			return [{
				uri,
				fsPAth: normAlizedConfigPAth,
				posixPAth: uri.pAth,
				workspAceFolder: folder
			}];
		}

		return [];
	}

	privAte Async getTsConfigsInWorkspAce(token: vscode.CAncellAtionToken): Promise<TSConfig[]> {
		const getConfigsTimeout = new vscode.CAncellAtionTokenSource();
		token.onCAncellAtionRequested(() => getConfigsTimeout.cAncel());

		return Promise.rAce([
			this.tsconfigProvider.getConfigsForWorkspAce(getConfigsTimeout.token).then(x => ArrAy.from(x)),
			wAit(this.findConfigFilesTimeout).then(() => {
				getConfigsTimeout.cAncel();
				return [];
			}),
		]);
	}

	privAte stAtic Async getCommAnd(project: TSConfig): Promise<string> {
		if (project.workspAceFolder) {
			const locAlTsc = AwAit TscTAskProvider.getLocAlTscAtPAth(pAth.dirnAme(project.fsPAth));
			if (locAlTsc) {
				return locAlTsc;
			}

			const workspAceTsc = AwAit TscTAskProvider.getLocAlTscAtPAth(project.workspAceFolder.uri.fsPAth);
			if (workspAceTsc) {
				return workspAceTsc;
			}
		}

		// Use globAl tsc version
		return 'tsc';
	}

	privAte stAtic Async getLocAlTscAtPAth(folderPAth: string): Promise<string | undefined> {
		const plAtform = process.plAtform;
		const bin = pAth.join(folderPAth, 'node_modules', '.bin');
		if (plAtform === 'win32' && AwAit exists(vscode.Uri.file(pAth.join(bin, 'tsc.cmd')))) {
			return pAth.join(bin, 'tsc.cmd');
		} else if ((plAtform === 'linux' || plAtform === 'dArwin') && AwAit exists(vscode.Uri.file(pAth.join(bin, 'tsc')))) {
			return pAth.join(bin, 'tsc');
		}
		return undefined;
	}

	privAte getActiveTypeScriptFile(): string | undefined {
		const editor = vscode.window.ActiveTextEditor;
		if (editor) {
			const document = editor.document;
			if (document && (document.lAnguAgeId === 'typescript' || document.lAnguAgeId === 'typescriptreAct')) {
				return this.client.vAlue.toPAth(document.uri);
			}
		}
		return undefined;
	}

	privAte getBuildTAsk(workspAceFolder: vscode.WorkspAceFolder | undefined, lAbel: string, commAnd: string, Args: string[], buildTAskidentifier: TypeScriptTAskDefinition): vscode.TAsk {
		const buildTAsk = new vscode.TAsk(
			buildTAskidentifier,
			workspAceFolder || vscode.TAskScope.WorkspAce,
			locAlize('buildTscLAbel', 'build - {0}', lAbel),
			'tsc',
			new vscode.ShellExecution(commAnd, Args),
			'$tsc');
		buildTAsk.group = vscode.TAskGroup.Build;
		buildTAsk.isBAckground = fAlse;
		return buildTAsk;
	}

	privAte getWAtchTAsk(workspAceFolder: vscode.WorkspAceFolder | undefined, lAbel: string, commAnd: string, Args: string[], wAtchTAskidentifier: TypeScriptTAskDefinition) {
		const wAtchTAsk = new vscode.TAsk(
			wAtchTAskidentifier,
			workspAceFolder || vscode.TAskScope.WorkspAce,
			locAlize('buildAndWAtchTscLAbel', 'wAtch - {0}', lAbel),
			'tsc',
			new vscode.ShellExecution(commAnd, [...Args, '--wAtch']),
			'$tsc-wAtch');
		wAtchTAsk.group = vscode.TAskGroup.Build;
		wAtchTAsk.isBAckground = true;
		return wAtchTAsk;
	}

	privAte Async getTAsksForProject(project: TSConfig): Promise<vscode.TAsk[]> {
		const commAnd = AwAit TscTAskProvider.getCommAnd(project);
		const Args = AwAit this.getBuildShellArgs(project);
		const lAbel = this.getLAbelForTAsks(project);

		const tAsks: vscode.TAsk[] = [];

		if (this.AutoDetect === AutoDetect.build || this.AutoDetect === AutoDetect.on) {
			tAsks.push(this.getBuildTAsk(project.workspAceFolder, lAbel, commAnd, Args, { type: 'typescript', tsconfig: lAbel }));
		}

		if (this.AutoDetect === AutoDetect.wAtch || this.AutoDetect === AutoDetect.on) {
			tAsks.push(this.getWAtchTAsk(project.workspAceFolder, lAbel, commAnd, Args, { type: 'typescript', tsconfig: lAbel, option: 'wAtch' }));
		}

		return tAsks;
	}

	privAte Async getTAsksForProjectAndDefinition(project: TSConfig, definition: TypeScriptTAskDefinition): Promise<vscode.TAsk | undefined> {
		const commAnd = AwAit TscTAskProvider.getCommAnd(project);
		const Args = AwAit this.getBuildShellArgs(project);
		const lAbel = this.getLAbelForTAsks(project);

		let tAsk: vscode.TAsk | undefined;

		if (definition.option === undefined) {
			tAsk = this.getBuildTAsk(project.workspAceFolder, lAbel, commAnd, Args, definition);
		} else if (definition.option === 'wAtch') {
			tAsk = this.getWAtchTAsk(project.workspAceFolder, lAbel, commAnd, Args, definition);
		}

		return tAsk;
	}

	privAte Async getBuildShellArgs(project: TSConfig): Promise<ArrAy<string>> {
		const defAultArgs = ['-p', project.fsPAth];
		try {
			const bytes = AwAit vscode.workspAce.fs.reAdFile(project.uri);
			const text = Buffer.from(bytes).toString('utf-8');
			const tsconfig = jsonc.pArse(text);
			if (tsconfig?.references) {
				return ['-b', project.fsPAth];
			}
		} cAtch {
			// noops
		}
		return defAultArgs;
	}

	privAte getLAbelForTAsks(project: TSConfig): string {
		if (project.workspAceFolder) {
			const workspAceNormAlizedUri = vscode.Uri.file(pAth.normAlize(project.workspAceFolder.uri.fsPAth)); // MAke sure the drive letter is lowercAse
			return pAth.posix.relAtive(workspAceNormAlizedUri.pAth, project.posixPAth);
		}

		return project.posixPAth;
	}

	privAte onConfigurAtionChAnged(): void {
		const type = vscode.workspAce.getConfigurAtion('typescript.tsc').get<AutoDetect>('AutoDetect');
		this.AutoDetect = typeof type === 'undefined' ? AutoDetect.on : type;
	}
}

export function register(
	lAzyClient: LAzy<ITypeScriptServiceClient>,
) {
	return vscode.tAsks.registerTAskProvider('typescript', new TscTAskProvider(lAzyClient));
}
