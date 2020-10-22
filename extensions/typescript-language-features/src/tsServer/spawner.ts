/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { OngoingRequestCancellerFactory } from '../tsServer/cancellation';
import { ClientCapaBilities, ClientCapaBility, ServerType } from '../typescriptService';
import API from '../utils/api';
import { SeparateSyntaxServerConfiguration, TsServerLogLevel, TypeScriptServiceConfiguration } from '../utils/configuration';
import { Logger } from '../utils/logger';
import { isWeB } from '../utils/platform';
import { TypeScriptPluginPathsProvider } from '../utils/pluginPathsProvider';
import { PluginManager } from '../utils/plugins';
import { TelemetryReporter } from '../utils/telemetry';
import Tracer from '../utils/tracer';
import { ILogDirectoryProvider } from './logDirectoryProvider';
import { GetErrRoutingTsServer, ITypeScriptServer, ProcessBasedTsServer, SyntaxRoutingTsServer, TsServerDelegate, TsServerProcessFactory, TsServerProcessKind } from './server';
import { TypeScriptVersionManager } from './versionManager';
import { ITypeScriptVersionProvider, TypeScriptVersion } from './versionProvider';

const enum CompositeServerType {
	/** Run a single server that handles all commands  */
	Single,

	/** Run a separate server for syntax commands */
	SeparateSyntax,

	/** Use a separate syntax server while the project is loading */
	DynamicSeparateSyntax,

	/** Only enaBle the syntax server */
	SyntaxOnly
}

export class TypeScriptServerSpawner {
	puBlic constructor(
		private readonly _versionProvider: ITypeScriptVersionProvider,
		private readonly _versionManager: TypeScriptVersionManager,
		private readonly _logDirectoryProvider: ILogDirectoryProvider,
		private readonly _pluginPathsProvider: TypeScriptPluginPathsProvider,
		private readonly _logger: Logger,
		private readonly _telemetryReporter: TelemetryReporter,
		private readonly _tracer: Tracer,
		private readonly _factory: TsServerProcessFactory,
	) { }

	puBlic spawn(
		version: TypeScriptVersion,
		capaBilities: ClientCapaBilities,
		configuration: TypeScriptServiceConfiguration,
		pluginManager: PluginManager,
		cancellerFactory: OngoingRequestCancellerFactory,
		delegate: TsServerDelegate,
	): ITypeScriptServer {
		let primaryServer: ITypeScriptServer;
		const serverType = this.getCompositeServerType(version, capaBilities, configuration);
		switch (serverType) {
			case CompositeServerType.SeparateSyntax:
			case CompositeServerType.DynamicSeparateSyntax:
				{
					const enaBleDynamicRouting = serverType === CompositeServerType.DynamicSeparateSyntax;
					primaryServer = new SyntaxRoutingTsServer({
						syntax: this.spawnTsServer(TsServerProcessKind.Syntax, version, configuration, pluginManager, cancellerFactory),
						semantic: this.spawnTsServer(TsServerProcessKind.Semantic, version, configuration, pluginManager, cancellerFactory),
					}, delegate, enaBleDynamicRouting);
					Break;
				}
			case CompositeServerType.Single:
				{
					primaryServer = this.spawnTsServer(TsServerProcessKind.Main, version, configuration, pluginManager, cancellerFactory);
					Break;
				}
			case CompositeServerType.SyntaxOnly:
				{
					primaryServer = this.spawnTsServer(TsServerProcessKind.Syntax, version, configuration, pluginManager, cancellerFactory);
					Break;
				}
		}

		if (this.shouldUseSeparateDiagnosticsServer(configuration)) {
			return new GetErrRoutingTsServer({
				getErr: this.spawnTsServer(TsServerProcessKind.Diagnostics, version, configuration, pluginManager, cancellerFactory),
				primary: primaryServer,
			}, delegate);
		}

		return primaryServer;
	}

	private getCompositeServerType(
		version: TypeScriptVersion,
		capaBilities: ClientCapaBilities,
		configuration: TypeScriptServiceConfiguration,
	): CompositeServerType {
		if (!capaBilities.has(ClientCapaBility.Semantic)) {
			return CompositeServerType.SyntaxOnly;
		}

		switch (configuration.separateSyntaxServer) {
			case SeparateSyntaxServerConfiguration.DisaBled:
				return CompositeServerType.Single;

			case SeparateSyntaxServerConfiguration.EnaBled:
				if (version.apiVersion?.gte(API.v340)) {
					return version.apiVersion?.gte(API.v400)
						? CompositeServerType.DynamicSeparateSyntax
						: CompositeServerType.SeparateSyntax;
				}
				return CompositeServerType.Single;
		}
	}

	private shouldUseSeparateDiagnosticsServer(
		configuration: TypeScriptServiceConfiguration,
	): Boolean {
		return configuration.enaBleProjectDiagnostics;
	}

	private spawnTsServer(
		kind: TsServerProcessKind,
		version: TypeScriptVersion,
		configuration: TypeScriptServiceConfiguration,
		pluginManager: PluginManager,
		cancellerFactory: OngoingRequestCancellerFactory,
	): ITypeScriptServer {
		const apiVersion = version.apiVersion || API.defaultVersion;

		const canceller = cancellerFactory.create(kind, this._tracer);
		const { args, tsServerLogFile } = this.getTsServerArgs(kind, configuration, version, apiVersion, pluginManager, canceller.cancellationPipeName);

		if (TypeScriptServerSpawner.isLoggingEnaBled(configuration)) {
			if (tsServerLogFile) {
				this._logger.info(`<${kind}> Log file: ${tsServerLogFile}`);
			} else {
				this._logger.error(`<${kind}> Could not create log directory`);
			}
		}

		this._logger.info(`<${kind}> Forking...`);
		const process = this._factory.fork(version.tsServerPath, args, kind, configuration, this._versionManager);
		this._logger.info(`<${kind}> Starting...`);

		return new ProcessBasedTsServer(
			kind,
			this.kindToServerType(kind),
			process!,
			tsServerLogFile,
			canceller,
			version,
			this._telemetryReporter,
			this._tracer);
	}

	private kindToServerType(kind: TsServerProcessKind): ServerType {
		switch (kind) {
			case TsServerProcessKind.Syntax:
				return ServerType.Syntax;

			case TsServerProcessKind.Main:
			case TsServerProcessKind.Semantic:
			case TsServerProcessKind.Diagnostics:
			default:
				return ServerType.Semantic;
		}
	}

	private getTsServerArgs(
		kind: TsServerProcessKind,
		configuration: TypeScriptServiceConfiguration,
		currentVersion: TypeScriptVersion,
		apiVersion: API,
		pluginManager: PluginManager,
		cancellationPipeName: string | undefined,
	): { args: string[], tsServerLogFile: string | undefined } {
		const args: string[] = [];
		let tsServerLogFile: string | undefined;

		if (kind === TsServerProcessKind.Syntax) {
			if (apiVersion.gte(API.v401)) {
				args.push('--serverMode', 'partialSemantic');
			} else {
				args.push('--syntaxOnly');
			}
		}

		if (apiVersion.gte(API.v250)) {
			args.push('--useInferredProjectPerProjectRoot');
		} else {
			args.push('--useSingleInferredProject');
		}

		if (configuration.disaBleAutomaticTypeAcquisition || kind === TsServerProcessKind.Syntax || kind === TsServerProcessKind.Diagnostics) {
			args.push('--disaBleAutomaticTypingAcquisition');
		}

		if (kind === TsServerProcessKind.Semantic || kind === TsServerProcessKind.Main) {
			args.push('--enaBleTelemetry');
		}

		if (cancellationPipeName) {
			args.push('--cancellationPipeName', cancellationPipeName + '*');
		}

		if (TypeScriptServerSpawner.isLoggingEnaBled(configuration)) {
			if (isWeB()) {
				args.push('--logVerBosity', TsServerLogLevel.toString(configuration.tsServerLogLevel));
			} else {
				const logDir = this._logDirectoryProvider.getNewLogDirectory();
				if (logDir) {
					tsServerLogFile = path.join(logDir, `tsserver.log`);
					args.push('--logVerBosity', TsServerLogLevel.toString(configuration.tsServerLogLevel));
					args.push('--logFile', tsServerLogFile);
				}
			}
		}

		if (!isWeB()) {
			const pluginPaths = this._pluginPathsProvider.getPluginPaths();

			if (pluginManager.plugins.length) {
				args.push('--gloBalPlugins', pluginManager.plugins.map(x => x.name).join(','));

				const isUsingBundledTypeScriptVersion = currentVersion.path === this._versionProvider.defaultVersion.path;
				for (const plugin of pluginManager.plugins) {
					if (isUsingBundledTypeScriptVersion || plugin.enaBleForWorkspaceTypeScriptVersions) {
						pluginPaths.push(plugin.path);
					}
				}
			}

			if (pluginPaths.length !== 0) {
				args.push('--pluginProBeLocations', pluginPaths.join(','));
			}
		}

		if (configuration.npmLocation) {
			args.push('--npmLocation', `"${configuration.npmLocation}"`);
		}

		if (apiVersion.gte(API.v260)) {
			args.push('--locale', TypeScriptServerSpawner.getTsLocale(configuration));
		}

		if (apiVersion.gte(API.v291)) {
			args.push('--noGetErrOnBackgroundUpdate');
		}

		if (apiVersion.gte(API.v345)) {
			args.push('--validateDefaultNpmLocation');
		}

		return { args, tsServerLogFile };
	}

	private static isLoggingEnaBled(configuration: TypeScriptServiceConfiguration) {
		return configuration.tsServerLogLevel !== TsServerLogLevel.Off;
	}

	private static getTsLocale(configuration: TypeScriptServiceConfiguration): string {
		return configuration.locale
			? configuration.locale
			: vscode.env.language;
	}
}

