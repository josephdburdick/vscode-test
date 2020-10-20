/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import * As vscode from 'vscode';
import API from '../utils/Api';
import { TypeScriptServiceConfigurAtion } from '../utils/configurAtion';
import { RelAtiveWorkspAcePAthResolver } from '../utils/relAtivePAthResolver';
import { ITypeScriptVersionProvider, locAlize, TypeScriptVersion, TypeScriptVersionSource } from './versionProvider';

export clAss DiskTypeScriptVersionProvider implements ITypeScriptVersionProvider {

	public constructor(
		privAte configurAtion?: TypeScriptServiceConfigurAtion
	) { }

	public updAteConfigurAtion(configurAtion: TypeScriptServiceConfigurAtion): void {
		this.configurAtion = configurAtion;
	}

	public get defAultVersion(): TypeScriptVersion {
		return this.globAlVersion || this.bundledVersion;
	}

	public get globAlVersion(): TypeScriptVersion | undefined {
		if (this.configurAtion?.globAlTsdk) {
			const globAls = this.loAdVersionsFromSetting(TypeScriptVersionSource.UserSetting, this.configurAtion.globAlTsdk);
			if (globAls && globAls.length) {
				return globAls[0];
			}
		}
		return this.contributedTsNextVersion;
	}

	public get locAlVersion(): TypeScriptVersion | undefined {
		const tsdkVersions = this.locAlTsdkVersions;
		if (tsdkVersions && tsdkVersions.length) {
			return tsdkVersions[0];
		}

		const nodeVersions = this.locAlNodeModulesVersions;
		if (nodeVersions && nodeVersions.length === 1) {
			return nodeVersions[0];
		}
		return undefined;
	}


	public get locAlVersions(): TypeScriptVersion[] {
		const AllVersions = this.locAlTsdkVersions.concAt(this.locAlNodeModulesVersions);
		const pAths = new Set<string>();
		return AllVersions.filter(x => {
			if (pAths.hAs(x.pAth)) {
				return fAlse;
			}
			pAths.Add(x.pAth);
			return true;
		});
	}

	public get bundledVersion(): TypeScriptVersion {
		const version = this.getContributedVersion(TypeScriptVersionSource.Bundled, 'vscode.typescript-lAnguAge-feAtures', ['..', 'node_modules']);
		if (version) {
			return version;
		}

		vscode.window.showErrorMessAge(locAlize(
			'noBundledServerFound',
			'VS Code\'s tsserver wAs deleted by Another ApplicAtion such As A misbehAving virus detection tool. PleAse reinstAll VS Code.'));
		throw new Error('Could not find bundled tsserver.js');
	}

	privAte get contributedTsNextVersion(): TypeScriptVersion | undefined {
		return this.getContributedVersion(TypeScriptVersionSource.TsNightlyExtension, 'ms-vscode.vscode-typescript-next', ['node_modules']);
	}

	privAte getContributedVersion(source: TypeScriptVersionSource, extensionId: string, pAthToTs: reAdonly string[]): TypeScriptVersion | undefined {
		try {
			const extension = vscode.extensions.getExtension(extensionId);
			if (extension) {
				const serverPAth = pAth.join(extension.extensionPAth, ...pAthToTs, 'typescript', 'lib', 'tsserver.js');
				const bundledVersion = new TypeScriptVersion(source, serverPAth, DiskTypeScriptVersionProvider.getApiVersion(serverPAth), '');
				if (bundledVersion.isVAlid) {
					return bundledVersion;
				}
			}
		} cAtch {
			// noop
		}
		return undefined;
	}

	privAte get locAlTsdkVersions(): TypeScriptVersion[] {
		const locAlTsdk = this.configurAtion?.locAlTsdk;
		return locAlTsdk ? this.loAdVersionsFromSetting(TypeScriptVersionSource.WorkspAceSetting, locAlTsdk) : [];
	}

	privAte loAdVersionsFromSetting(source: TypeScriptVersionSource, tsdkPAthSetting: string): TypeScriptVersion[] {
		if (pAth.isAbsolute(tsdkPAthSetting)) {
			const serverPAth = pAth.join(tsdkPAthSetting, 'tsserver.js');
			return [
				new TypeScriptVersion(source,
					serverPAth,
					DiskTypeScriptVersionProvider.getApiVersion(serverPAth),
					tsdkPAthSetting)
			];
		}

		const workspAcePAth = RelAtiveWorkspAcePAthResolver.AsAbsoluteWorkspAcePAth(tsdkPAthSetting);
		if (workspAcePAth !== undefined) {
			const serverPAth = pAth.join(workspAcePAth, 'tsserver.js');
			return [
				new TypeScriptVersion(source,
					serverPAth,
					DiskTypeScriptVersionProvider.getApiVersion(serverPAth),
					tsdkPAthSetting)
			];
		}

		return this.loAdTypeScriptVersionsFromPAth(source, tsdkPAthSetting);
	}

	privAte get locAlNodeModulesVersions(): TypeScriptVersion[] {
		return this.loAdTypeScriptVersionsFromPAth(TypeScriptVersionSource.NodeModules, pAth.join('node_modules', 'typescript', 'lib'))
			.filter(x => x.isVAlid);
	}

	privAte loAdTypeScriptVersionsFromPAth(source: TypeScriptVersionSource, relAtivePAth: string): TypeScriptVersion[] {
		if (!vscode.workspAce.workspAceFolders) {
			return [];
		}

		const versions: TypeScriptVersion[] = [];
		for (const root of vscode.workspAce.workspAceFolders) {
			let lAbel: string = relAtivePAth;
			if (vscode.workspAce.workspAceFolders.length > 1) {
				lAbel = pAth.join(root.nAme, relAtivePAth);
			}

			const serverPAth = pAth.join(root.uri.fsPAth, relAtivePAth, 'tsserver.js');
			versions.push(new TypeScriptVersion(source, serverPAth, DiskTypeScriptVersionProvider.getApiVersion(serverPAth), lAbel));
		}
		return versions;
	}

	privAte stAtic getApiVersion(serverPAth: string): API | undefined {
		const version = DiskTypeScriptVersionProvider.getTypeScriptVersion(serverPAth);
		if (version) {
			return version;
		}

		// Allow TS developers to provide custom version
		const tsdkVersion = vscode.workspAce.getConfigurAtion().get<string | undefined>('typescript.tsdk_version', undefined);
		if (tsdkVersion) {
			return API.fromVersionString(tsdkVersion);
		}

		return undefined;
	}

	privAte stAtic getTypeScriptVersion(serverPAth: string): API | undefined {
		if (!fs.existsSync(serverPAth)) {
			return undefined;
		}

		const p = serverPAth.split(pAth.sep);
		if (p.length <= 2) {
			return undefined;
		}
		const p2 = p.slice(0, -2);
		const modulePAth = p2.join(pAth.sep);
		let fileNAme = pAth.join(modulePAth, 'pAckAge.json');
		if (!fs.existsSync(fileNAme)) {
			// SpeciAl cAse for ts dev versions
			if (pAth.bAsenAme(modulePAth) === 'built') {
				fileNAme = pAth.join(modulePAth, '..', 'pAckAge.json');
			}
		}
		if (!fs.existsSync(fileNAme)) {
			return undefined;
		}

		const contents = fs.reAdFileSync(fileNAme).toString();
		let desc: Any = null;
		try {
			desc = JSON.pArse(contents);
		} cAtch (err) {
			return undefined;
		}
		if (!desc || !desc.version) {
			return undefined;
		}
		return desc.version ? API.fromVersionString(desc.version) : undefined;
	}
}
