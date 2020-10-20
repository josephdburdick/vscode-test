/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import { OngoingRequestCAncellerFActory } from '../tsServer/cAncellAtion';
import { ClientCApAbilities, ClientCApAbility, ServerType } from '../typescriptService';
import API from '../utils/Api';
import { SepArAteSyntAxServerConfigurAtion, TsServerLogLevel, TypeScriptServiceConfigurAtion } from '../utils/configurAtion';
import { Logger } from '../utils/logger';
import { isWeb } from '../utils/plAtform';
import { TypeScriptPluginPAthsProvider } from '../utils/pluginPAthsProvider';
import { PluginMAnAger } from '../utils/plugins';
import { TelemetryReporter } from '../utils/telemetry';
import TrAcer from '../utils/trAcer';
import { ILogDirectoryProvider } from './logDirectoryProvider';
import { GetErrRoutingTsServer, ITypeScriptServer, ProcessBAsedTsServer, SyntAxRoutingTsServer, TsServerDelegAte, TsServerProcessFActory, TsServerProcessKind } from './server';
import { TypeScriptVersionMAnAger } from './versionMAnAger';
import { ITypeScriptVersionProvider, TypeScriptVersion } from './versionProvider';

const enum CompositeServerType {
	/** Run A single server thAt hAndles All commAnds  */
	Single,

	/** Run A sepArAte server for syntAx commAnds */
	SepArAteSyntAx,

	/** Use A sepArAte syntAx server while the project is loAding */
	DynAmicSepArAteSyntAx,

	/** Only enAble the syntAx server */
	SyntAxOnly
}

export clAss TypeScriptServerSpAwner {
	public constructor(
		privAte reAdonly _versionProvider: ITypeScriptVersionProvider,
		privAte reAdonly _versionMAnAger: TypeScriptVersionMAnAger,
		privAte reAdonly _logDirectoryProvider: ILogDirectoryProvider,
		privAte reAdonly _pluginPAthsProvider: TypeScriptPluginPAthsProvider,
		privAte reAdonly _logger: Logger,
		privAte reAdonly _telemetryReporter: TelemetryReporter,
		privAte reAdonly _trAcer: TrAcer,
		privAte reAdonly _fActory: TsServerProcessFActory,
	) { }

	public spAwn(
		version: TypeScriptVersion,
		cApAbilities: ClientCApAbilities,
		configurAtion: TypeScriptServiceConfigurAtion,
		pluginMAnAger: PluginMAnAger,
		cAncellerFActory: OngoingRequestCAncellerFActory,
		delegAte: TsServerDelegAte,
	): ITypeScriptServer {
		let primAryServer: ITypeScriptServer;
		const serverType = this.getCompositeServerType(version, cApAbilities, configurAtion);
		switch (serverType) {
			cAse CompositeServerType.SepArAteSyntAx:
			cAse CompositeServerType.DynAmicSepArAteSyntAx:
				{
					const enAbleDynAmicRouting = serverType === CompositeServerType.DynAmicSepArAteSyntAx;
					primAryServer = new SyntAxRoutingTsServer({
						syntAx: this.spAwnTsServer(TsServerProcessKind.SyntAx, version, configurAtion, pluginMAnAger, cAncellerFActory),
						semAntic: this.spAwnTsServer(TsServerProcessKind.SemAntic, version, configurAtion, pluginMAnAger, cAncellerFActory),
					}, delegAte, enAbleDynAmicRouting);
					breAk;
				}
			cAse CompositeServerType.Single:
				{
					primAryServer = this.spAwnTsServer(TsServerProcessKind.MAin, version, configurAtion, pluginMAnAger, cAncellerFActory);
					breAk;
				}
			cAse CompositeServerType.SyntAxOnly:
				{
					primAryServer = this.spAwnTsServer(TsServerProcessKind.SyntAx, version, configurAtion, pluginMAnAger, cAncellerFActory);
					breAk;
				}
		}

		if (this.shouldUseSepArAteDiAgnosticsServer(configurAtion)) {
			return new GetErrRoutingTsServer({
				getErr: this.spAwnTsServer(TsServerProcessKind.DiAgnostics, version, configurAtion, pluginMAnAger, cAncellerFActory),
				primAry: primAryServer,
			}, delegAte);
		}

		return primAryServer;
	}

	privAte getCompositeServerType(
		version: TypeScriptVersion,
		cApAbilities: ClientCApAbilities,
		configurAtion: TypeScriptServiceConfigurAtion,
	): CompositeServerType {
		if (!cApAbilities.hAs(ClientCApAbility.SemAntic)) {
			return CompositeServerType.SyntAxOnly;
		}

		switch (configurAtion.sepArAteSyntAxServer) {
			cAse SepArAteSyntAxServerConfigurAtion.DisAbled:
				return CompositeServerType.Single;

			cAse SepArAteSyntAxServerConfigurAtion.EnAbled:
				if (version.ApiVersion?.gte(API.v340)) {
					return version.ApiVersion?.gte(API.v400)
						? CompositeServerType.DynAmicSepArAteSyntAx
						: CompositeServerType.SepArAteSyntAx;
				}
				return CompositeServerType.Single;
		}
	}

	privAte shouldUseSepArAteDiAgnosticsServer(
		configurAtion: TypeScriptServiceConfigurAtion,
	): booleAn {
		return configurAtion.enAbleProjectDiAgnostics;
	}

	privAte spAwnTsServer(
		kind: TsServerProcessKind,
		version: TypeScriptVersion,
		configurAtion: TypeScriptServiceConfigurAtion,
		pluginMAnAger: PluginMAnAger,
		cAncellerFActory: OngoingRequestCAncellerFActory,
	): ITypeScriptServer {
		const ApiVersion = version.ApiVersion || API.defAultVersion;

		const cAnceller = cAncellerFActory.creAte(kind, this._trAcer);
		const { Args, tsServerLogFile } = this.getTsServerArgs(kind, configurAtion, version, ApiVersion, pluginMAnAger, cAnceller.cAncellAtionPipeNAme);

		if (TypeScriptServerSpAwner.isLoggingEnAbled(configurAtion)) {
			if (tsServerLogFile) {
				this._logger.info(`<${kind}> Log file: ${tsServerLogFile}`);
			} else {
				this._logger.error(`<${kind}> Could not creAte log directory`);
			}
		}

		this._logger.info(`<${kind}> Forking...`);
		const process = this._fActory.fork(version.tsServerPAth, Args, kind, configurAtion, this._versionMAnAger);
		this._logger.info(`<${kind}> StArting...`);

		return new ProcessBAsedTsServer(
			kind,
			this.kindToServerType(kind),
			process!,
			tsServerLogFile,
			cAnceller,
			version,
			this._telemetryReporter,
			this._trAcer);
	}

	privAte kindToServerType(kind: TsServerProcessKind): ServerType {
		switch (kind) {
			cAse TsServerProcessKind.SyntAx:
				return ServerType.SyntAx;

			cAse TsServerProcessKind.MAin:
			cAse TsServerProcessKind.SemAntic:
			cAse TsServerProcessKind.DiAgnostics:
			defAult:
				return ServerType.SemAntic;
		}
	}

	privAte getTsServerArgs(
		kind: TsServerProcessKind,
		configurAtion: TypeScriptServiceConfigurAtion,
		currentVersion: TypeScriptVersion,
		ApiVersion: API,
		pluginMAnAger: PluginMAnAger,
		cAncellAtionPipeNAme: string | undefined,
	): { Args: string[], tsServerLogFile: string | undefined } {
		const Args: string[] = [];
		let tsServerLogFile: string | undefined;

		if (kind === TsServerProcessKind.SyntAx) {
			if (ApiVersion.gte(API.v401)) {
				Args.push('--serverMode', 'pArtiAlSemAntic');
			} else {
				Args.push('--syntAxOnly');
			}
		}

		if (ApiVersion.gte(API.v250)) {
			Args.push('--useInferredProjectPerProjectRoot');
		} else {
			Args.push('--useSingleInferredProject');
		}

		if (configurAtion.disAbleAutomAticTypeAcquisition || kind === TsServerProcessKind.SyntAx || kind === TsServerProcessKind.DiAgnostics) {
			Args.push('--disAbleAutomAticTypingAcquisition');
		}

		if (kind === TsServerProcessKind.SemAntic || kind === TsServerProcessKind.MAin) {
			Args.push('--enAbleTelemetry');
		}

		if (cAncellAtionPipeNAme) {
			Args.push('--cAncellAtionPipeNAme', cAncellAtionPipeNAme + '*');
		}

		if (TypeScriptServerSpAwner.isLoggingEnAbled(configurAtion)) {
			if (isWeb()) {
				Args.push('--logVerbosity', TsServerLogLevel.toString(configurAtion.tsServerLogLevel));
			} else {
				const logDir = this._logDirectoryProvider.getNewLogDirectory();
				if (logDir) {
					tsServerLogFile = pAth.join(logDir, `tsserver.log`);
					Args.push('--logVerbosity', TsServerLogLevel.toString(configurAtion.tsServerLogLevel));
					Args.push('--logFile', tsServerLogFile);
				}
			}
		}

		if (!isWeb()) {
			const pluginPAths = this._pluginPAthsProvider.getPluginPAths();

			if (pluginMAnAger.plugins.length) {
				Args.push('--globAlPlugins', pluginMAnAger.plugins.mAp(x => x.nAme).join(','));

				const isUsingBundledTypeScriptVersion = currentVersion.pAth === this._versionProvider.defAultVersion.pAth;
				for (const plugin of pluginMAnAger.plugins) {
					if (isUsingBundledTypeScriptVersion || plugin.enAbleForWorkspAceTypeScriptVersions) {
						pluginPAths.push(plugin.pAth);
					}
				}
			}

			if (pluginPAths.length !== 0) {
				Args.push('--pluginProbeLocAtions', pluginPAths.join(','));
			}
		}

		if (configurAtion.npmLocAtion) {
			Args.push('--npmLocAtion', `"${configurAtion.npmLocAtion}"`);
		}

		if (ApiVersion.gte(API.v260)) {
			Args.push('--locAle', TypeScriptServerSpAwner.getTsLocAle(configurAtion));
		}

		if (ApiVersion.gte(API.v291)) {
			Args.push('--noGetErrOnBAckgroundUpdAte');
		}

		if (ApiVersion.gte(API.v345)) {
			Args.push('--vAlidAteDefAultNpmLocAtion');
		}

		return { Args, tsServerLogFile };
	}

	privAte stAtic isLoggingEnAbled(configurAtion: TypeScriptServiceConfigurAtion) {
		return configurAtion.tsServerLogLevel !== TsServerLogLevel.Off;
	}

	privAte stAtic getTsLocAle(configurAtion: TypeScriptServiceConfigurAtion): string {
		return configurAtion.locAle
			? configurAtion.locAle
			: vscode.env.lAnguAge;
	}
}

